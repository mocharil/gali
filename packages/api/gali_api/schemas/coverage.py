"""Schemas for Data Coverage & Truth Audit Report."""

from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import BaseModel


class CoverageItem(BaseModel):
    layer: str
    entity: str
    numerator: int
    denominator: int
    coverage_pct: float
    description: str


class DataCoverageResponse(BaseModel):
    gate_decision: str = "GO MENYEMPIT (Coal Titans — 9 Emiten)"
    updated_at: dt.datetime
    credits_used: int
    credits_cap: int = 1000
    metrics: list[CoverageItem]
    in_universe_issuers: list[dict[str, Any]]
