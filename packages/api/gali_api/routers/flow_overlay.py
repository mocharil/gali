"""Routers for Foreign Flow and Market Divergence Overlay."""

from __future__ import annotations

import datetime as dt

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException
from gali_api.cache import get_cached_json, make_cache_key, set_cached_json
from gali_api.dependencies import get_db, get_published_run_id, get_redis
from gali_api.schemas.flow_overlay import FlowOverlayResponse, IssuerFlowItem
from gali_core.db.models import ForeignFlow, IdxCompany, IssuerMetrics
from gali_core.metrics.market_divergence import compute_market_divergence
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/v1/flow-overlay", tags=["Market Flow & Capital Overlay"])


@router.get("", response_model=FlowOverlayResponse)
async def get_flow_overlay(
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> FlowOverlayResponse:
    """Retrieve market capital flows, institutional positioning, and divergence spreads across universe issuers."""
    cache_key = make_cache_key("flow-overlay", run_id, "overview", {})
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return FlowOverlayResponse.model_validate(cached)

    # 1. Fetch metrics & company info
    stmt = (
        select(IssuerMetrics, IdxCompany)
        .join(IdxCompany, IssuerMetrics.symbol == IdxCompany.symbol, isouter=True)
        .where(IssuerMetrics.run_id == run_id)
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        raise HTTPException(
            status_code=503, detail={"code": "EMPTY_PUBLISHED_RUN", "message": "Published run has no issuer metrics"}
        )
    as_of = max(m.as_of for m, _ in rows)

    # 2. Fetch 30-day foreign flow sum per symbol
    flow_stmt = (
        select(ForeignFlow.symbol, func.sum(ForeignFlow.net_foreign_inflow))
        .where(ForeignFlow.date > as_of - dt.timedelta(days=30), ForeignFlow.date <= as_of)
        .group_by(ForeignFlow.symbol)
    )
    flow_rows = (await db.execute(flow_stmt)).all()
    flow_map: dict[str, float] = {str(r[0]): float(r[1] or 0.0) for r in flow_rows if r[0]}

    items: list[IssuerFlowItem] = []
    divergence = {
        item.symbol: item
        for item in compute_market_divergence(
            [
                {
                    "symbol": m.symbol,
                    "rbv_gap_pct": m.rbv_gap_pct,
                    "ground_truth_score": m.ground_truth_score,
                    "confidence": m.confidence or {},
                }
                for m, _ in rows
            ],
            flow_map,
        )
    }

    for m, c in rows:
        derived = divergence[m.symbol]

        items.append(
            IssuerFlowItem(
                symbol=m.symbol,
                name=c.name if c else m.symbol,
                quadrant=derived.quadrant,
                divergence_spread=derived.divergence_spread,
                rbv_gap_pct=m.rbv_gap_pct,
                ground_truth_score=m.ground_truth_score,
                net_foreign_flow_30d_idr=flow_map.get(m.symbol),
                market_cap_idr=float(c.market_cap_idr) if (c and c.market_cap_idr) else None,
            )
        )

    response = FlowOverlayResponse(
        run_id=run_id,
        as_of=as_of,
        issuers=items,
    )

    await set_cached_json(redis, cache_key, response, ttl_seconds=3600)
    return response
