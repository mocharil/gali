"""Task 4.11 / 5.12 — Parametric Scenario Studio Simulation Engine.

A high-performance in-memory simulation engine for live macroeconomic, export market,
concession cliff, and commodity price shock testing.

Unified implementation powering both batch pipeline simulations and the live FastAPI
endpoint (POST /v1/scenario).
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ScenarioShockParams:
    """Parametric shock scenario definition."""

    price_shock_pct: float = 0.0  # e.g. -0.20 for -20% price drop
    destination_shocks: dict[str, float] = field(default_factory=dict)  # e.g. {"China": 0.30}
    discount_rate: float = 0.12
    variable_cost_share: float = 0.65
    license_cliff_expiry_shock: bool = False  # If True, removes area from expiring licenses


@dataclass(frozen=True)
class IssuerScenarioImpact:
    """Impact of scenario shock on a single issuer."""

    symbol: str
    baseline_rbv_usd: float | None
    post_shock_rbv_usd: float | None
    delta_rbv_usd: float | None
    delta_rbv_pct: float | None
    baseline_rank: int | None
    post_shock_rank: int | None
    rank_change: int | None  # positive means improved rank
    volume_at_risk_pct: float
    revenue_at_risk_usd: float
    post_shock_gp_usd: float | None
    is_partial: bool = False


@dataclass(frozen=True)
class ScenarioSimulationResult:
    """Overall result of a parametric scenario shock simulation."""

    params: ScenarioShockParams
    issuer_impacts: list[IssuerScenarioImpact]
    execution_time_ms: float


def simulate_scenario_shock(
    base_issuers: list[dict[str, Any]],
    params: ScenarioShockParams,
) -> ScenarioSimulationResult:
    """Execute in-memory shock simulation across universe issuers.

    Consistent relative scaling model (Task 5.12):
    Both baseline and post-shock valuations use the exact same attributable_gross_profit_usd
    foundation (M2 methodology), ensuring zero delta when shocks are zero.

    Args:
        base_issuers: List of issuer dictionaries containing:
            symbol, rli_years, attributable_gross_profit_usd, market_cap_usd,
            destinations (list of dict with country and pct_of_sales_volume),
            license_cliff_3y.
        params: ScenarioShockParams with price, destination, discount rate, and concession shocks.

    Returns:
        ScenarioSimulationResult with pre/post valuations and rank deltas.
    """
    start_time = time.perf_counter()

    impacts: list[IssuerScenarioImpact] = []

    for issuer in base_issuers:
        symbol = issuer["symbol"]
        rli = issuer.get("rli_years")
        base_gp = issuer.get("attributable_gross_profit_usd")
        dests = issuer.get("destinations") or []
        cliff_3y = float(issuer.get("license_cliff_3y") or 0.0)

        # Baseline RBV using M2 attributable gross profit annuity
        baseline_rbv: float | None = None
        if base_gp is not None and base_gp > 0 and rli is not None and rli > 0:
            effective_years = min(rli, 30.0)
            ann_factor = (1.0 - math.pow(1.0 + params.discount_rate, -effective_years)) / params.discount_rate
            baseline_rbv = base_gp * ann_factor

        # Partial data handling (e.g. PTBA without financials or DSSA without reserves)
        if base_gp is None or rli is None or rli <= 0:
            impacts.append(
                IssuerScenarioImpact(
                    symbol=symbol,
                    baseline_rbv_usd=None,
                    post_shock_rbv_usd=None,
                    delta_rbv_usd=None,
                    delta_rbv_pct=None,
                    baseline_rank=None,
                    post_shock_rank=None,
                    rank_change=None,
                    volume_at_risk_pct=0.0,
                    revenue_at_risk_usd=0.0,
                    post_shock_gp_usd=None,
                    is_partial=True,
                )
            )
            continue

        # 1. Calculate Destination Volume & Revenue at Risk
        vol_at_risk_pct = 0.0
        for d in dests:
            country = str(d.get("country", "")).strip()
            pct = float(d.get("pct_of_sales_volume", 0.0))
            if country in params.destination_shocks:
                shock_fraction = min(max(params.destination_shocks[country], 0.0), 1.0)
                vol_at_risk_pct += (pct / 100.0) * shock_fraction

        vol_at_risk_pct = min(vol_at_risk_pct, 1.0)
        rev_at_risk_usd = base_gp * vol_at_risk_pct

        # 2. Adjust for License Cliff Expiry Shock if active
        effective_rli = rli
        if params.license_cliff_expiry_shock and cliff_3y > 0:
            effective_rli = max(rli * (1.0 - (cliff_3y / 100.0)), 1.0)

        # 3. Calculate Post-Shock Gross Profit relative to attributable_gross_profit_usd
        price_factor = max(1.0 + params.price_shock_pct, 0.0)
        vol_factor = max(1.0 - vol_at_risk_pct, 0.0)
        post_gp = max(base_gp * price_factor * vol_factor, 0.0)

        # 4. Calculate Post-Shock RBV
        post_eff_years = min(effective_rli, 30.0)
        post_ann_factor = (1.0 - math.pow(1.0 + params.discount_rate, -post_eff_years)) / params.discount_rate
        post_shock_rbv = post_gp * post_ann_factor

        delta_rbv_usd = post_shock_rbv - (baseline_rbv if baseline_rbv is not None else 0.0)
        delta_rbv_pct = ((delta_rbv_usd / baseline_rbv) * 100.0) if baseline_rbv and baseline_rbv > 0 else 0.0

        impacts.append(
            IssuerScenarioImpact(
                symbol=symbol,
                baseline_rbv_usd=round(baseline_rbv, 2) if baseline_rbv is not None else None,
                post_shock_rbv_usd=round(post_shock_rbv, 2),
                delta_rbv_usd=round(delta_rbv_usd, 2),
                delta_rbv_pct=round(delta_rbv_pct, 2),
                baseline_rank=None,
                post_shock_rank=None,
                rank_change=None,
                volume_at_risk_pct=round(vol_at_risk_pct * 100.0, 2),
                revenue_at_risk_usd=round(rev_at_risk_usd, 2),
                post_shock_gp_usd=round(post_gp, 2),
                is_partial=False,
            )
        )

    # 5. Compute Pre and Post Ranks
    valid_baseline = sorted(
        [imp for imp in impacts if imp.baseline_rbv_usd is not None],
        key=lambda x: x.baseline_rbv_usd or 0.0,
        reverse=True,
    )
    base_rank_map = {imp.symbol: idx + 1 for idx, imp in enumerate(valid_baseline)}

    valid_post = sorted(
        [imp for imp in impacts if imp.post_shock_rbv_usd is not None],
        key=lambda x: x.post_shock_rbv_usd or 0.0,
        reverse=True,
    )
    post_rank_map = {imp.symbol: idx + 1 for idx, imp in enumerate(valid_post)}

    final_impacts: list[IssuerScenarioImpact] = []
    for imp in impacts:
        b_rank = base_rank_map.get(imp.symbol)
        p_rank = post_rank_map.get(imp.symbol)
        rank_change = (b_rank - p_rank) if (b_rank is not None and p_rank is not None) else None

        final_impacts.append(
            IssuerScenarioImpact(
                symbol=imp.symbol,
                baseline_rbv_usd=imp.baseline_rbv_usd,
                post_shock_rbv_usd=imp.post_shock_rbv_usd,
                delta_rbv_usd=imp.delta_rbv_usd,
                delta_rbv_pct=imp.delta_rbv_pct,
                baseline_rank=b_rank,
                post_shock_rank=p_rank,
                rank_change=rank_change,
                volume_at_risk_pct=imp.volume_at_risk_pct,
                revenue_at_risk_usd=imp.revenue_at_risk_usd,
                post_shock_gp_usd=imp.post_shock_gp_usd,
                is_partial=imp.is_partial,
            )
        )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return ScenarioSimulationResult(
        params=params,
        issuer_impacts=final_impacts,
        execution_time_ms=round(elapsed_ms, 2),
    )
