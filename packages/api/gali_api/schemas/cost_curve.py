"""Schemas for National Cost Curve queries."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CostCurvePoint(BaseModel):
    symbol: str
    name: str
    cash_cost_per_ton_usd: float
    annual_volume_mt: float
    cumulative_volume_mt: float
    cost_curve_percentile: float
    realized_price_per_ton_usd: float | None = None
    unit_margin_usd: float | None = None
    breakeven_benchmark_price_usd: float | None = None


class CostCurveResponse(BaseModel):
    commodity: str = "Coal"
    run_id: str
    benchmark_price_usd: float
    points: list[CostCurvePoint]
    partial_issuers_excluded: list[str] = Field(default_factory=list)
