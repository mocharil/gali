"""Schemas for Live Parametric Scenario Studio."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ScenarioShockRequest(BaseModel):
    price_shock_pct: float = Field(
        default=0.0,
        description="Percentage shock to commodity benchmark price (-1.0 to 2.0)",
        json_schema_extra={"example": -0.20},
    )
    destination_shocks: dict[str, float] = Field(
        default_factory=dict,
        description="Country-specific volume demand shocks (0.0 to 1.0 reduction)",
        json_schema_extra={"example": {"China": 0.30, "India": 0.10}},
    )
    discount_rate: float = Field(
        default=0.12,
        ge=0.01,
        le=0.50,
        description="Real discount rate hurdle for annuity valuation",
        json_schema_extra={"example": 0.12},
    )
    variable_cost_share: float = Field(
        default=0.65,
        ge=0.0,
        le=1.0,
        description="Proportion of cash cost that scales with production volume",
        json_schema_extra={"example": 0.65},
    )
    license_cliff_expiry_shock: bool = Field(
        default=False,
        description="If true, assumes 3-year expiring concession areas fail renewal",
        json_schema_extra={"example": False},
    )


class IssuerScenarioImpactSchema(BaseModel):
    symbol: str
    baseline_rbv_usd: float | None
    post_shock_rbv_usd: float | None
    delta_rbv_usd: float | None
    delta_rbv_pct: float | None
    baseline_rank: int | None
    post_shock_rank: int | None
    rank_change: int | None
    volume_at_risk_pct: float
    revenue_at_risk_usd: float
    post_shock_gp_usd: float | None
    is_partial: bool


class ScenarioResponse(BaseModel):
    params: ScenarioShockRequest
    impacts: list[IssuerScenarioImpactSchema]
    execution_time_ms: float
