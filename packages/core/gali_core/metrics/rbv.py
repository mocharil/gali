"""M2 — Reserve-Backed Value (RBV) & Implied Life Engine.

Calculates the discounted present value of attributable gross cash flows across the mineral
reserve life, compares it with current market valuation, and solves for the market-implied lifespan.

Formulas:
    GP(c)              = revenue_usd(c) − cost_of_revenue_usd(c)
    attributable_GP(s) = Σ_c eff_own(s, c) × GP(c)
    RBV(s)             = attributable_GP(s) × (1 − (1 + r)^(−RLI(s))) / r
    rbv_gap_pct(s)     = (market_cap_usd(s) − RBV(s)) / RBV(s) × 100
    implied_life(s)    = −ln(1 − market_cap_usd(s) × r / attributable_GP(s)) / ln(1 + r)
    reserve_life_gap   = implied_life(s) − RLI(s)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RBVResult:
    """Computed M2 Reserve-Backed Value result."""

    symbol: str
    attributable_gross_profit_usd: float | None
    reserve_backed_value_usd: float | None
    market_cap_usd: float | None
    rbv_gap_pct: float | None
    implied_life_years: float | None
    reserve_life_gap_years: float | None
    is_unbounded: bool = False
    is_partial: bool = False
    null_reason: str | None = None


def compute_rbv(
    symbol: str,
    rli_years: float | None,
    links: list[dict[str, Any]],
    financials_map: dict[str, dict[str, Any]],
    market_cap_idr: float | None,
    discount_rate: float = 0.12,
    fx_idr_usd: float = 16_200.0,
    max_annuity_years: float = 30.0,
) -> RBVResult:
    """Compute M2 Reserve-Backed Value and Implied Life for an issuer.

    Args:
        symbol: Stock symbol.
        rli_years: Computed M1 Reserve Life Index in years (can be None).
        links: List of issuer mining links.
        financials_map: Mapping of company_slug -> financials dict (revenue_usd, cost_of_revenue_usd, profit_usd).
        market_cap_idr: Market capitalization in IDR from IDX.
        discount_rate: Annual discount rate r (default 0.12).
        fx_idr_usd: Exchange rate IDR/USD.
        max_annuity_years: Cap on DCF annuity projection (default 30 years).

    Returns:
        RBVResult with valuation gap and implied life.
    """
    total_attr_gp = 0.0
    has_any_financials = False

    for link in links:
        slug = link["company_slug"]
        own_pct = float(link.get("effective_ownership_pct", 100.0))
        own_frac = own_pct / 100.0

        fin = financials_map.get(slug)
        if not fin:
            continue

        rev = fin.get("revenue_usd")
        cost = fin.get("cost_of_revenue_usd")

        if rev is not None and cost is not None:
            gp = rev - cost
            attr_gp = gp * own_frac
            total_attr_gp += attr_gp
            has_any_financials = True
        elif fin.get("profit_usd") is not None:
            # Fallback if profit is explicitly provided
            attr_gp = float(fin["profit_usd"]) * own_frac
            total_attr_gp += attr_gp
            has_any_financials = True

    market_cap_usd = (market_cap_idr / fx_idr_usd) if market_cap_idr is not None and market_cap_idr > 0 else None

    # Handle partial / missing data:
    # 1. If financials are missing (e.g. PTBA)
    if not has_any_financials or total_attr_gp <= 0:
        return RBVResult(
            symbol=symbol,
            attributable_gross_profit_usd=None,
            reserve_backed_value_usd=None,
            market_cap_usd=market_cap_usd,
            rbv_gap_pct=None,
            implied_life_years=None,
            reserve_life_gap_years=None,
            is_unbounded=False,
            is_partial=True,
            null_reason="revenue_usd or cost_of_revenue_usd is not reported in financials endpoint for this issuer",
        )

    # 2. If RLI is missing (e.g. DSSA)
    if rli_years is None or rli_years <= 0:
        # We can still compute implied life if market cap exists, but RBV is None
        implied_life = None
        is_unb = False
        if market_cap_usd is not None and total_attr_gp > 0 and discount_rate > 0:
            arg = 1.0 - (market_cap_usd * discount_rate / total_attr_gp)
            if arg > 0:
                implied_life = -math.log(arg) / math.log(1.0 + discount_rate)
            else:
                is_unb = True

        return RBVResult(
            symbol=symbol,
            attributable_gross_profit_usd=round(total_attr_gp, 2),
            reserve_backed_value_usd=None,
            market_cap_usd=market_cap_usd,
            rbv_gap_pct=None,
            implied_life_years=round(implied_life, 2) if implied_life is not None else None,
            reserve_life_gap_years=None,
            is_unbounded=is_unb,
            is_partial=True,
            null_reason="RLI (Reserve Life Index) is NULL due to missing reserves data",
        )

    # 3. Both financials and RLI are available
    effective_years = min(rli_years, max_annuity_years)
    annuity_factor = (1.0 - math.pow(1.0 + discount_rate, -effective_years)) / discount_rate
    rbv = total_attr_gp * annuity_factor

    rbv_gap_pct = None
    if market_cap_usd is not None and rbv > 0:
        rbv_gap_pct = ((market_cap_usd - rbv) / rbv) * 100.0

    # Implied life calculation
    implied_life = None
    is_unbounded = False
    if market_cap_usd is not None and total_attr_gp > 0 and discount_rate > 0:
        arg = 1.0 - (market_cap_usd * discount_rate / total_attr_gp)
        if arg > 0:
            implied_life = -math.log(arg) / math.log(1.0 + discount_rate)
        else:
            is_unbounded = True

    reserve_life_gap = (implied_life - rli_years) if implied_life is not None else None

    return RBVResult(
        symbol=symbol,
        attributable_gross_profit_usd=round(total_attr_gp, 2),
        reserve_backed_value_usd=round(rbv, 2),
        market_cap_usd=round(market_cap_usd, 2) if market_cap_usd is not None else None,
        rbv_gap_pct=round(rbv_gap_pct, 2) if rbv_gap_pct is not None else None,
        implied_life_years=round(implied_life, 2) if implied_life is not None else None,
        reserve_life_gap_years=round(reserve_life_gap, 2) if reserve_life_gap is not None else None,
        is_unbounded=is_unbounded,
        is_partial=False,
        null_reason=None,
    )
