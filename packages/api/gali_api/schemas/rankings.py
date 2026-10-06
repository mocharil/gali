"""Schemas for Rankings & Leaderboard queries."""

from __future__ import annotations

from pydantic import BaseModel


class RankingItem(BaseModel):
    rank: int | None
    symbol: str
    name: str
    data_quality: str
    metric_value: float | None
    formatted_value: str
    confidence_pct: float | None = None
    ranking_status: str = "complete"


class RankingsResponse(BaseModel):
    metric: str
    run_id: str
    items: list[RankingItem]
