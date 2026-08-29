"""M6 — Destination Stress Test & Concentration HHI Engine.

Measures export customer/country concentration using the Herfindahl-Hirschman Index (HHI)
and identifies top export markets.

Formulas:
    destination_hhi(s) = Σ_country (pct_of_sales_volume(s, country))^2   [0 to 10000]
    top_destination    = country with max pct_of_sales_volume
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class DestinationResult:
    """Computed M6 Destination Concentration result."""
    symbol: str
    destination_hhi: float | None
    top_destination: str | None
    top_destination_pct: float | None
    destinations: list[dict[str, Any]] = field(default_factory=list)
    is_partial: bool = False
    null_reason: str | None = None


def compute_destination_hhi(
    symbol: str,
    destinations: list[dict[str, Any]],
) -> DestinationResult:
    """Compute M6 destination HHI and find top country for an issuer.

    Args:
        symbol: Stock symbol.
        destinations: List of sales destination rows from core.sales_destination.
    """
    if not destinations:
        return DestinationResult(
            symbol=symbol,
            destination_hhi=None,
            top_destination=None,
            top_destination_pct=None,
            destinations=[],
            is_partial=True,
            null_reason="no sales destination breakdown reported for this issuer",
        )

    # Sum shares per country across linked operating entities
    country_volumes: dict[str, float] = {}
    country_pcts: dict[str, float] = {}

    total_vol = sum(float(d.get("volume") or 0.0) for d in destinations)

    if total_vol > 0:
        for d in destinations:
            c = str(d.get("country") or "Domestic / Other").strip()
            vol = float(d.get("volume") or 0.0)
            country_volumes[c] = country_volumes.get(c, 0.0) + vol
        for c, v in country_volumes.items():
            country_pcts[c] = (v / total_vol) * 100.0
    else:
        # Fallback to direct percentages if volume is not explicitly stated
        for d in destinations:
            c = str(d.get("country") or "Domestic / Other").strip()
            pct = float(d.get("pct_of_sales_volume") or 0.0)
            country_pcts[c] = country_pcts.get(c, 0.0) + pct

    if not country_pcts:
        return DestinationResult(
            symbol=symbol,
            destination_hhi=None,
            top_destination=None,
            top_destination_pct=None,
            destinations=[],
            is_partial=True,
            null_reason="destination percentage data is empty",
        )

    # Normalize pcts if sum is not 100
    sum_pct = sum(country_pcts.values())
    if sum_pct > 0 and abs(sum_pct - 100.0) > 1.0:
        country_pcts = {c: (p / sum_pct) * 100.0 for c, p in country_pcts.items()}

    # Compute HHI = sum of squared percentages (0 - 10000)
    hhi = sum(p * p for p in country_pcts.values())

    # Find top destination
    top_country, top_pct = max(country_pcts.items(), key=lambda x: x[1])

    dest_list = [
        {"country": c, "pct_of_sales_volume": round(p, 2)}
        for c, p in sorted(country_pcts.items(), key=lambda x: x[1], reverse=True)
    ]

    return DestinationResult(
        symbol=symbol,
        destination_hhi=round(hhi, 2),
        top_destination=top_country,
        top_destination_pct=round(top_pct, 2),
        destinations=dest_list,
        is_partial=False,
        null_reason=None,
    )
