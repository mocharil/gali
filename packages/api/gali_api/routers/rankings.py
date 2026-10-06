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

    def rankable(row: tuple) -> bool:
        metrics = row[0]
        return metric != "ground_truth_score" or (
            (metrics.confidence or {}).get("effective_weight", 0) >= 1.0
            and all(
                getattr(metrics, key) is not None
                for key in ("rli_years", "reserve_backed_value_usd", "cash_cost_per_ton_usd")
            )
        )

    valid_rows.sort(
        key=lambda item: (
            not rankable(item),
            getattr(item[0], metric) if is_asc else -getattr(item[0], metric),
            item[0].symbol,
        )
    )
    qualified = [row for row in valid_rows if rankable(row)]

    items: list[RankingItem] = []
    for m, c in valid_rows:
        val = getattr(m, metric)
        conf_pct = (m.confidence or {}).get("effective_weight", 0.0) * 100.0
        eligible = rankable((m, c))
        rank = (
            1
            + sum((getattr(other, metric) < val if is_asc else getattr(other, metric) > val) for other, _ in qualified)
            if eligible
            else None
        )

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
                rank=rank,
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
                ranking_status="complete" if eligible else "provisional",
            )
        )

    response = RankingsResponse(metric=metric, run_id=run_id, items=items)
    await set_cached_json(redis, cache_key, response, ttl_seconds=3600)
    return response
