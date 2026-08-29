"""Routers for Multi-Metric Leaderboard and Rankings."""

from __future__ import annotations

from typing import Literal, get_args

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from gali_api.cache import get_cached_json, make_cache_key, set_cached_json
from gali_api.dependencies import get_db, get_published_run_id, get_redis
from gali_api.derive import data_quality_label
from gali_api.schemas.rankings import RankingItem, RankingsResponse
from gali_core.db.models import IdxCompany, IssuerMetrics
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/v1/rankings", tags=["Leaderboards & Rankings"])

RankableMetric = Literal[
    "ground_truth_score",
    "rli_years",
    "reserve_backed_value_usd",
    "cash_cost_per_ton_usd",
    "license_cliff_3y",
    "rbv_gap_pct",
]
RANKABLE_METRICS = get_args(RankableMetric)


@router.get("", response_model=RankingsResponse)
async def get_metric_rankings(
    metric: RankableMetric = Query(
        "ground_truth_score",
        description=f"Metric to rank by: one of {RANKABLE_METRICS}. An unlisted value is rejected with 422 "
        "rather than silently returning an empty list.",
    ),
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> RankingsResponse:
    """Retrieve filtered leaderboard rankings for a specific fundamental or market metric."""
    cache_key = make_cache_key("rankings", run_id, metric, {})
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return RankingsResponse.model_validate(cached)

    stmt = (
        select(IssuerMetrics, IdxCompany)
        .join(IdxCompany, IssuerMetrics.symbol == IdxCompany.symbol, isouter=True)
        .where(IssuerMetrics.run_id == run_id)
    )
    rows = (await db.execute(stmt)).all()

    # Filter out rows where the specific metric is NULL (strictly per Gate Decision)
    valid_rows = [(m, c) for m, c in rows if getattr(m, metric, None) is not None]

    # Ascending sort for risk/cost metrics (lower is better), descending for values/scores
    ascending_metrics = {"cash_cost_per_ton_usd", "license_cliff_3y", "destination_hhi"}
    is_asc = metric in ascending_metrics

    valid_rows.sort(key=lambda item: getattr(item[0], metric), reverse=not is_asc)

    items: list[RankingItem] = []
    for idx, (m, c) in enumerate(valid_rows):
        val = getattr(m, metric)
        conf_pct = (m.confidence or {}).get("effective_weight", 1.0) * 100.0 if m.confidence else 100.0

        # Human-readable formatting
        if metric == "ground_truth_score":
            fmt = f"{val:.1f} / 100"
        elif metric == "rli_years":
            fmt = f"{val:.1f} yrs"
        elif metric == "reserve_backed_value_usd":
            fmt = f"${val / 1e9:.2f}B"
        elif metric == "cash_cost_per_ton_usd":
            fmt = f"${val:.2f} / ton"
        elif metric in ("license_cliff_3y", "rbv_gap_pct"):
            fmt = f"{val:+.1f}%"
        else:
            fmt = str(val)

        items.append(
            RankingItem(
                rank=idx + 1,
                symbol=m.symbol,
                name=c.name if c else m.symbol,
                data_quality=data_quality_label(
                    rli_years=m.rli_years,
                    reserve_backed_value_usd=m.reserve_backed_value_usd,
                    cash_cost_per_ton_usd=m.cash_cost_per_ton_usd,
                ),
                metric_value=round(val, 2) if isinstance(val, float) else val,
                formatted_value=fmt,
                confidence_pct=round(conf_pct, 1),
            )
        )

    response = RankingsResponse(metric=metric, run_id=run_id, items=items)
    await set_cached_json(redis, cache_key, response, ttl_seconds=3600)
    return response
