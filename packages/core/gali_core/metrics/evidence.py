"""Task 4.10 — Evidence Provenance & Audit Registry Engine.

Builds structured JSONB evidence payloads linking computed metrics directly to their
source raw.responses IDs, operating entities, calculation parameters, and explicit reasons
for any null or partial fields.
"""

from __future__ import annotations

import datetime as dt
from typing import Any


def build_evidence_payload(
    symbol: str,
    raw_response_ids: list[int],
    field_provenance: dict[str, Any],
    null_fields: list[dict[str, str]],
    assumptions: dict[str, Any],
) -> dict[str, Any]:
    """Construct an audit-grade evidence JSONB object.

    Args:
        symbol: Stock symbol.
        raw_response_ids: List of foreign key IDs into raw.responses.
        field_provenance: Provenance details for populated metrics.
        null_fields: Explanations for null metrics.
        assumptions: Snapshot of parameters (discount rate, fx, variable cost share).

    Returns:
        Structured dictionary for metrics.issuer_metrics.evidence.
    """
    return {
        "symbol": symbol,
        "derived_at": dt.datetime.now(dt.UTC).isoformat(),
        "source_raw_response_ids": sorted(list(set(raw_response_ids))),
        "provenance": field_provenance,
        "null_fields": null_fields,
        "assumptions": assumptions,
        "audit_version": "2.0-verified",
    }
