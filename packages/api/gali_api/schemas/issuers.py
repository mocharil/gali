"""Schemas for Issuer fundamental analytics and metrics."""

from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import BaseModel, Field


class IssuerSummary(BaseModel):
    symbol: str
    name: str
    sub_sector: str | None = None
    data_quality: str = Field(..., description="'LENGKAP' (complete) or 'PARSIAL' (partial)")
    ground_truth_score: float | None = Field(default=None, description="M8 composite score (0-100)")
    confidence_pct: float = Field(default=100.0, description="Effective weight utilized (0-100%)")
    rli_years: float | None = Field(default=None, description="M1 Reserve Life Index")
    reserve_backed_value_usd: float | None = Field(default=None, description="M2 Reserve-Backed Value in USD")
    market_cap_idr: float | None = None
    market_cap_usd: float | None = None
    rbv_gap_pct: float | None = Field(default=None, description="M2 valuation premia / discount %")
    license_cliff_3y: float | None = Field(default=None, description="M3 3-year concession expiry %")
    cash_cost_per_ton_usd: float | None = Field(default=None, description="M4 unit cash cost FOB")
    top_destination: str | None = Field(default=None, description="M6 top export market")
    top_destination_pct: float | None = None


class LinkedOperatingEntity(BaseModel):
    company_slug: str
    name: str | None = None
    effective_ownership_pct: float
    confidence: float | None = None
    method: str | None = None


class IssuerDetail(BaseModel):
    symbol: str
    name: str
    sub_sector: str | None = None
    as_of: dt.date
    run_id: str
    data_quality: str
    # M1
    rli_years: float | None = None
    # M2
    implied_life_years: float | None = None
    reserve_life_gap_years: float | None = None
    attributable_gross_profit_usd: float | None = None
    reserve_backed_value_usd: float | None = None
    market_cap_idr: float | None = None
    market_cap_usd: float | None = None
    rbv_gap_pct: float | None = None
    # M3
    license_cliff_1y: float | None = None
    license_cliff_3y: float | None = None
    license_cliff_5y: float | None = None
    cnc_coverage_pct: float | None = None
    weighted_days_to_expiry: float | None = None
    # M4
    cash_cost_per_ton_usd: float | None = None
    realized_price_per_ton_usd: float | None = None
    unit_margin_usd: float | None = None
    breakeven_benchmark_price_usd: float | None = None
    cost_curve_percentile: float | None = None
    # M5
    weighted_cv_kcal: float | None = None
    benchmark_grade: str | None = None
    benchmark_price_usd: float | None = None
    quality_discount_pct: float | None = None
    # M6
    destination_hhi: float | None = None
    top_destination: str | None = None
    top_destination_pct: float | None = None
    # M7
    contractor_hhi: float | None = None
    contract_cliff_12m: float | None = None
    # M8
    ground_truth_score: float | None = None
    component_scores: dict[str, float | None] = Field(default_factory=dict)
    confidence: dict[str, Any] = Field(default_factory=dict)
    # Linked & Provenance
    linked_entities: list[LinkedOperatingEntity] = Field(default_factory=list)
    evidence: dict[str, Any] = Field(default_factory=dict)
