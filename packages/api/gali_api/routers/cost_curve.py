"""Routers for National Cumulative Cost Curve Analytics."""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from gali_api.cache import get_cached_json, make_cache_key, set_cached_json
from gali_api.dependencies import get_db, get_published_run_id, get_redis
from gali_api.schemas.cost_curve import CostCurvePoint, CostCurveResponse
from gali_core.db.models import CommodityPrice, IdxCompany, IssuerMetrics
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/v1/cost-curve", tags=["National Cost Curve"])


@router.get("", response_model=CostCurveResponse)
async def get_national_cost_curve(
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> CostCurveResponse:
    """Retrieve national cumulative cost curve curve points, unit margins, and benchmark breakevens."""
    cache_key = make_cache_key("cost-curve", run_id, "coal", {})
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return CostCurveResponse.model_validate(cached)

    # 1. Fetch latest coal benchmark price
    price_stmt = (
        select(CommodityPrice.price)
        .where(CommodityPrice.commodity == "Coal")
        .order_by(desc(CommodityPrice.observed_on))
        .limit(1)
    )
    bench_price_res = await db.execute(price_stmt)
    bench_price = float(bench_price_res.scalar_one_or_none() or 102.87)

    # 2. Fetch metrics
    stmt = (
        select(IssuerMetrics, IdxCompany)
        .join(IdxCompany, IssuerMetrics.symbol == IdxCompany.symbol, isouter=True)
        .where(IssuerMetrics.run_id == run_id)
    )
    rows = (await db.execute(stmt)).all()

    valid_rows = [(m, c) for m, c in rows if m.cash_cost_per_ton_usd is not None]
    partial_excluded = [m.symbol for m, c in rows if m.cash_cost_per_ton_usd is None]

    # Sort ascending by cash cost
    valid_rows.sort(key=lambda item: item[0].cash_cost_per_ton_usd or 0.0)

    points: list[CostCurvePoint] = []
    cum_vol = 0.0

    for m, c in valid_rows:
        evidence = m.evidence or {}
        prov = evidence.get("provenance", {})
        vol_mt = float(prov.get("cost_curve_annual_volume_mt") or 0.0)
        cum_vol += vol_mt

        points.append(
            CostCurvePoint(
                symbol=m.symbol,
                name=c.name if c else m.symbol,
                cash_cost_per_ton_usd=m.cash_cost_per_ton_usd,
                annual_volume_mt=round(vol_mt, 2),
                cumulative_volume_mt=round(cum_vol, 2),
                cost_curve_percentile=m.cost_curve_percentile or 0.0,
                realized_price_per_ton_usd=m.realized_price_per_ton_usd,
                unit_margin_usd=m.unit_margin_usd,
                breakeven_benchmark_price_usd=m.breakeven_benchmark_price_usd,
            )
        )

    response = CostCurveResponse(
        commodity="Coal",
        run_id=run_id,
        benchmark_price_usd=bench_price,
        points=points,
        partial_issuers_excluded=partial_excluded,
    )

    await set_cached_json(redis, cache_key, response, ttl_seconds=3600)
    return response
