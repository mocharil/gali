"""M4 — Cash Cost Curve & Breakeven Engine.

Calculates free-on-board (FOB) unit cash costs, realized selling prices, unit margins,
and constructs the national cumulative production cost curve.

Formulas:
    mining_revenue(c) = revenue_breakdown[commodity] (fallback: revenue_usd)
    mining_cost(c)    = cost_of_revenue_usd − purchased_coal_cost
    tons(c)           = sales_volume × 1e6 (or production_volume × 1e6)
    cash_cost_per_ton = mining_cost / tons
    realized_price    = mining_revenue / tons
    unit_margin       = realized_price − cash_cost_per_ton
    breakeven_price   = benchmark_price × (cash_cost / realized_price)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class CashCostResult:
    """Computed M4 Cash Cost result for an issuer."""

    symbol: str
    cash_cost_per_ton_usd: float | None
    realized_price_per_ton_usd: float | None
    unit_margin_usd: float | None
    breakeven_benchmark_price_usd: float | None
    cost_curve_percentile: float | None
    annual_volume_mt: float | None
    cumulative_volume_mt: float | None = None
    is_partial: bool = False
    null_reason: str | None = None


def compute_issuer_cash_cost(
    symbol: str,
    links: list[dict[str, Any]],
    financials_map: dict[str, dict[str, Any]],
    performance_map: dict[str, dict[str, Any]],
    benchmark_price_usd: float = 100.0,
) -> CashCostResult:
    """Compute unit cash cost metrics for a single issuer."""
    total_attr_cost = 0.0
    total_attr_revenue = 0.0
    total_attr_tons = 0.0

    has_cost = False
    has_rev = False
    has_volume = False

    for link in links:
        slug = link["company_slug"]
        own_pct = float(link.get("effective_ownership_pct", 100.0))
        own_frac = own_pct / 100.0

        fin = financials_map.get(slug)
        perf = performance_map.get(slug)

        vol_mt = None
        if perf:
            vol_mt = perf.get("sales_volume") or perf.get("production_volume")

        if vol_mt is not None and vol_mt > 0:
            tons = vol_mt * 1_000_000.0
            total_attr_tons += tons * own_frac
            has_volume = True

        if fin:
            cost = fin.get("cost_of_revenue_usd")
            rev = fin.get("revenue_usd")
            cost_breakdown = fin.get("cost_of_revenue_breakdown") or {}
            purchased = float(cost_breakdown.get("purchased_coal", 0.0)) if isinstance(cost_breakdown, dict) else 0.0

            if cost is not None:
                adj_cost = max(cost - purchased, 0.0)
                total_attr_cost += adj_cost * own_frac
                has_cost = True

            if rev is not None:
                total_attr_revenue += rev * own_frac
                has_rev = True

    if not has_cost or not has_volume or total_attr_tons <= 0:
        return CashCostResult(
            symbol=symbol,
            cash_cost_per_ton_usd=None,
            realized_price_per_ton_usd=None,
            unit_margin_usd=None,
            breakeven_benchmark_price_usd=None,
            cost_curve_percentile=None,
            annual_volume_mt=round(total_attr_tons / 1_000_000.0, 2) if has_volume else None,
            is_partial=True,
            null_reason="cost_of_revenue_usd or sales_volume is missing from upstream source",
        )

    cash_cost = total_attr_cost / total_attr_tons
    realized_price = (total_attr_revenue / total_attr_tons) if (has_rev and total_attr_revenue > 0) else None
    unit_margin = (realized_price - cash_cost) if realized_price is not None else None

    breakeven_price = None
    if realized_price is not None and realized_price > 0 and benchmark_price_usd > 0:
        breakeven_price = benchmark_price_usd * (cash_cost / realized_price)

    return CashCostResult(
        symbol=symbol,
        cash_cost_per_ton_usd=round(cash_cost, 2),
        realized_price_per_ton_usd=round(realized_price, 2) if realized_price is not None else None,
        unit_margin_usd=round(unit_margin, 2) if unit_margin is not None else None,
        breakeven_benchmark_price_usd=round(breakeven_price, 2) if breakeven_price is not None else None,
        cost_curve_percentile=None,  # Populated when building national curve
        annual_volume_mt=round(total_attr_tons / 1_000_000.0, 2),
        is_partial=False,
        null_reason=None,
    )


def build_national_cost_curve(
    issuer_results: list[CashCostResult],
) -> list[CashCostResult]:
    """Sort issuers by cash cost ascending and calculate cumulative cost curve percentiles."""
    valid = [r for r in issuer_results if r.cash_cost_per_ton_usd is not None and r.annual_volume_mt is not None]
    invalid = [r for r in issuer_results if r.cash_cost_per_ton_usd is None or r.annual_volume_mt is None]

    valid.sort(key=lambda x: x.cash_cost_per_ton_usd or 0.0)

    total_volume = sum(r.annual_volume_mt or 0.0 for r in valid)
    cum_vol = 0.0

    updated_valid: list[CashCostResult] = []
    for r in valid:
        vol = r.annual_volume_mt or 0.0
        midpoint = cum_vol + (vol / 2.0)
        cum_vol += vol
        pct = (midpoint / total_volume * 100.0) if total_volume > 0 else 50.0

        updated_valid.append(
            CashCostResult(
                symbol=r.symbol,
                cash_cost_per_ton_usd=r.cash_cost_per_ton_usd,
                realized_price_per_ton_usd=r.realized_price_per_ton_usd,
                unit_margin_usd=r.unit_margin_usd,
                breakeven_benchmark_price_usd=r.breakeven_benchmark_price_usd,
                cost_curve_percentile=round(pct, 2),
                annual_volume_mt=r.annual_volume_mt,
                cumulative_volume_mt=round(cum_vol, 2),
                is_partial=r.is_partial,
                null_reason=r.null_reason,
            )
        )

    return updated_valid + invalid
