"""Small derivations shared across routers, so the same fact is computed one way.

Grew out of a real bug class in this project: hand-duplicated logic (a hardcoded
symbol tuple standing in for "is this issuer's data partial") drifts from the
metric engine's own judgment the moment the underlying data changes. Everything
here reads columns the metric engine itself already computed instead of
re-deciding anything.
"""

from __future__ import annotations


def is_partial(
    *, rli_years: float | None, reserve_backed_value_usd: float | None, cash_cost_per_ton_usd: float | None
) -> bool:
    """True if any headline valuation metric is null for this issuer.

    This is deliberately narrower than metrics.issuer_metrics.confidence.is_complete
    (M8's Ground Truth Score completeness, which also tracks minor signals like
    contractor_risk / M7 that many issuers legitimately lack without their core
    financials being incomplete). "Data tidak lengkap" in the product's sense --
    the PTBA/DSSA distinction from the Phase 1 gate decision -- means RLI, RBV, or
    cash cost itself is unavailable, not that one of five M8 sub-scores was dropped.
    """
    return rli_years is None or reserve_backed_value_usd is None or cash_cost_per_ton_usd is None


def data_quality_label(
    *, rli_years: float | None, reserve_backed_value_usd: float | None, cash_cost_per_ton_usd: float | None
) -> str:
    return (
        "PARSIAL"
        if is_partial(
            rli_years=rli_years,
            reserve_backed_value_usd=reserve_backed_value_usd,
            cash_cost_per_ton_usd=cash_cost_per_ton_usd,
        )
        else "LENGKAP"
    )
