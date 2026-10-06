"""Schemas for Live Parametric Scenario Studio."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ScenarioShockRequest(BaseModel):
    model_config = {"allow_inf_nan": False}

    price_shock_pct: float = Field(
        default=0.0,
        ge=-1.0,
        le=2.0,
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

    @field_validator("destination_shocks")
    @classmethod
    def validate_destination_shocks(cls, value: dict[str, float]) -> dict[str, float]:
        import math

        if len(value) > 50:
            raise ValueError("At most 50 destinations are supported")
        for country, fraction in value.items():
            if not country.strip() or len(country) > 100 or not math.isfinite(fraction) or not 0.0 <= fraction <= 1.0:
                raise ValueError("Destination shocks require country names and finite reductions in [0, 1]")
        return {country.strip(): fraction for country, fraction in value.items()}


class ScenarioDriverSchema(BaseModel):
    key: str
    delta_rbv_usd: float
    rbv_after_usd: float


class SensitivityPointSchema(BaseModel):
    price_shock_pct: float
    discount_rate: float
    rbv_usd: float
    delta_rbv_pct: float


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
    revenue_at_risk_usd: float | None
    post_shock_gp_usd: float | None
    is_partial: bool
    model_basis: str = "gross_profit_proxy"
    warnings: list[str] = Field(default_factory=list)
    post_shock_revenue_usd: float | None = None
    post_shock_cost_usd: float | None = None
    gross_loss_usd: float | None = None
    break_even_price_change_pct: float | None = None
    drivers: list[ScenarioDriverSchema] = Field(default_factory=list)
    sensitivity: list[SensitivityPointSchema] = Field(default_factory=list)


class ScenarioResponse(BaseModel):
    params: ScenarioShockRequest
    impacts: list[IssuerScenarioImpactSchema]
    execution_time_ms: float
