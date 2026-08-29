"""Schemas for Flow Overlay (Foreign Flows & Market Signals)."""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class IssuerFlowItem(BaseModel):
    symbol: str
    name: str
    quadrant: str | None
    divergence_spread: float | None
    rbv_gap_pct: float | None
    ground_truth_score: float | None
    net_foreign_flow_30d_idr: float | None
    market_cap_idr: float | None


class FlowOverlayResponse(BaseModel):
    run_id: str
    as_of: dt.date
    issuers: list[IssuerFlowItem]
