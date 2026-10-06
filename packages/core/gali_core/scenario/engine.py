"""Gross-profit annuity scenarios with auditable driver attribution.

Driver order is price -> destination volume -> reserve-life proxy -> discount.
Interactions belong to the later driver. Sensitivity cells are assumptions,
not probabilities or confidence intervals.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field, replace
from typing import Any, TypeGuard

from gali_core.config import ASSUMPTIONS
from gali_core.metrics.rbv import annuity_factor


@dataclass
class ScenarioShockParams:
    price_shock_pct: float = 0.0
    destination_shocks: dict[str, float] = field(default_factory=dict)
    discount_rate: float = ASSUMPTIONS.discount_rate
    variable_cost_share: float = ASSUMPTIONS.variable_cost_share
    license_cliff_expiry_shock: bool = False


@dataclass(frozen=True)
class ScenarioDriver:
    key: str
    delta_rbv_usd: float
    rbv_after_usd: float


@dataclass(frozen=True)
class SensitivityPoint:
    price_shock_pct: float
    discount_rate: float
    rbv_usd: float
    delta_rbv_pct: float


@dataclass(frozen=True)
class IssuerScenarioImpact:
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
    is_partial: bool = False
    model_basis: str = "gross_profit_proxy"
    warnings: tuple[str, ...] = ()
    post_shock_revenue_usd: float | None = None
    post_shock_cost_usd: float | None = None
    gross_loss_usd: float | None = None
    break_even_price_change_pct: float | None = None
    drivers: tuple[ScenarioDriver, ...] = ()
    sensitivity: tuple[SensitivityPoint, ...] = ()


@dataclass(frozen=True)
class ScenarioSimulationResult:
    params: ScenarioShockParams
    issuer_impacts: list[IssuerScenarioImpact]
    execution_time_ms: float


def _valid_number(value: Any) -> TypeGuard[float]:
    return isinstance(value, (int, float)) and math.isfinite(value)


def _validate(params: ScenarioShockParams) -> None:
    if not math.isfinite(params.price_shock_pct) or not -1 <= params.price_shock_pct <= 2:
        raise ValueError("price_shock_pct must be finite and within [-1, 2]")
    if not math.isfinite(params.discount_rate) or not 0.01 <= params.discount_rate <= 0.5:
        raise ValueError("discount_rate must be within [0.01, 0.5]")
    if not math.isfinite(params.variable_cost_share) or not 0 <= params.variable_cost_share <= 1:
        raise ValueError("variable_cost_share must be within [0, 1]")
    if any(not math.isfinite(value) or not 0 <= value <= 1 for value in params.destination_shocks.values()):
        raise ValueError("destination shocks must be finite reductions within [0, 1]")


def _simulate_issuer(issuer: dict[str, Any], params: ScenarioShockParams) -> IssuerScenarioImpact:
    symbol = issuer["symbol"]
    rli, gp = issuer.get("rli_years"), issuer.get("attributable_gross_profit_usd")
    revenue, costs = issuer.get("attributable_revenue_usd"), issuer.get("attributable_cost_usd")
    destinations = issuer.get("destinations") or []
    finance = (
        _valid_number(revenue)
        and _valid_number(costs)
        and revenue >= 0
        and costs >= 0
        and _valid_number(gp)
        and math.isclose(revenue - costs, gp, rel_tol=1e-6, abs_tol=1.0)
    )
    reconciled_finance: tuple[float, float] | None = (
        (revenue, costs) if finance and _valid_number(revenue) and _valid_number(costs) else None
    )
    warnings: list[str] = []
    basis = "revenue_cost" if finance else "gross_profit_proxy"
    if not finance:
        warnings.append(
            "Revenue/cost breakdown unavailable or unreconciled; price and volume scale gross profit directly. Variable-cost share is not applied to this proxy."
        )
    if params.destination_shocks and not destinations:
        warnings.append("Destination breakdown unavailable; destination shocks cannot be quantified.")
    if params.license_cliff_expiry_shock and issuer.get("license_cliff_3y") is None:
        warnings.append("License cliff unavailable; expiry impact cannot be quantified.")
    if not _valid_number(gp) or gp <= 0 or not _valid_number(rli) or rli <= 0:
        return IssuerScenarioImpact(
            symbol,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            0.0,
            None,
            None,
            is_partial=True,
            model_basis=basis,
            warnings=tuple(warnings),
        )

    baseline_rate = issuer.get("baseline_discount_rate") or ASSUMPTIONS.discount_rate
    if not _valid_number(baseline_rate) or baseline_rate <= 0:
        raise ValueError("Published baseline discount rate must be finite and positive")
    calculated_baseline = gp * annuity_factor(min(rli, 30.0), baseline_rate)
    published = issuer.get("baseline_rbv_usd")
    baseline = round(published if _valid_number(published) and published > 0 else calculated_baseline, 2)
    volume_risk = min(
        sum(
            max(float(destination.get("pct_of_sales_volume") or 0), 0)
            / 100
            * next(
                (
                    shock
                    for country, shock in params.destination_shocks.items()
                    if country.strip().casefold() == str(destination.get("country", "")).strip().casefold()
                ),
                0.0,
            )
            for destination in destinations
        ),
        1.0,
    )
    volume_factor = 1 - volume_risk
    effective_life = rli
    cliff = issuer.get("license_cliff_3y") or 0
    if params.license_cliff_expiry_shock and cliff > 0:
        effective_life = rli * (1 - min(cliff, 100) / 100)
        warnings.append(
            "Expiry sensitivity uses licensed-area share as a reserve-life proxy; it is not a site-level production forecast."
        )

    def gross_profit(price: float, volume: float) -> float:
        if reconciled_finance is not None:
            valid_revenue, valid_costs = reconciled_finance
            return valid_revenue * (1 + price) * volume - valid_costs * (
                (1 - params.variable_cost_share) + params.variable_cost_share * volume
            )
        return gp * (1 + price) * volume

    def valuation(price: float, volume: float, life: float, rate: float) -> float:
        return max(gross_profit(price, volume), 0) * annuity_factor(min(life, 30.0), rate)

    drivers: list[ScenarioDriver] = []
    previous = baseline
    reconciled = round(calculated_baseline, 2)
    zero_shock = (
        params.price_shock_pct == 0
        and volume_risk == 0
        and effective_life == rli
        and params.discount_rate == baseline_rate
    )
    if not zero_shock and abs(reconciled - baseline) > 0.02:
        drivers.append(ScenarioDriver("baseline_basis", round(reconciled - previous, 2), reconciled))
        previous = reconciled
        warnings.append(
            "Published baseline differs from the gross-profit annuity; baseline basis reconciliation is shown separately."
        )
    states = (
        ("price", params.price_shock_pct != 0, valuation(params.price_shock_pct, 1, rli, baseline_rate)),
        ("volume", volume_risk != 0, valuation(params.price_shock_pct, volume_factor, rli, baseline_rate)),
        (
            "license",
            effective_life != rli,
            valuation(params.price_shock_pct, volume_factor, effective_life, baseline_rate),
        ),
        (
            "discount",
            params.discount_rate != baseline_rate,
            valuation(params.price_shock_pct, volume_factor, effective_life, params.discount_rate),
        ),
    )
    for key, changed, value in states:
        after = round(value, 2) if changed else previous
        drivers.append(ScenarioDriver(key, round(after - previous, 2), after))
        previous = after
    if zero_shock:
        previous = baseline
        drivers = [ScenarioDriver(key, 0.0, baseline) for key in ("price", "volume", "license", "discount")]

    post_gp = gross_profit(params.price_shock_pct, volume_factor)
    if post_gp < 0:
        warnings.append(
            "Gross profit is negative. RBV has a zero floor; the gross loss remains visible and is not a free-cash-flow estimate."
        )
    prices = sorted(
        {round(max(-1.0, min(2.0, params.price_shock_pct + offset)), 6) for offset in (-0.2, -0.1, 0, 0.1, 0.2)}
    )
    rates = sorted({round(max(0.01, min(0.5, params.discount_rate + offset)), 6) for offset in (-0.04, 0, 0.04)})
    sensitivity = []
    for price in prices:
        for rate in rates:
            value = (
                previous
                if price == round(params.price_shock_pct, 6) and rate == round(params.discount_rate, 6)
                else round(valuation(price, volume_factor, effective_life, rate), 2)
            )
            sensitivity.append(SensitivityPoint(price, rate, value, round((value - baseline) / baseline * 100, 2)))
    revenue_at_risk: float | None
    if reconciled_finance is not None:
        valid_revenue, valid_costs = reconciled_finance
        post_revenue = valid_revenue * (1 + params.price_shock_pct) * volume_factor
        post_costs = valid_costs * ((1 - params.variable_cost_share) + params.variable_cost_share * volume_factor)
        breakeven = (
            (post_costs / (valid_revenue * volume_factor) - 1) * 100 if valid_revenue * volume_factor > 0 else None
        )
        revenue_at_risk = round(valid_revenue * volume_risk, 2)
    else:
        post_revenue, post_costs, breakeven = None, None, None
        revenue_at_risk = 0.0 if volume_risk == 0 else None
    delta = round(previous - baseline, 2)
    return IssuerScenarioImpact(
        symbol,
        baseline,
        previous,
        delta,
        round(delta / baseline * 100, 2),
        None,
        None,
        None,
        round(volume_risk * 100, 2),
        revenue_at_risk,
        round(post_gp, 2),
        model_basis=basis,
        warnings=tuple(warnings),
        post_shock_revenue_usd=round(post_revenue, 2) if post_revenue is not None else None,
        post_shock_cost_usd=round(post_costs, 2) if post_costs is not None else None,
        gross_loss_usd=round(max(-post_gp, 0), 2) if finance else None,
        break_even_price_change_pct=round(breakeven, 2) if breakeven is not None else None,
        drivers=tuple(drivers),
        sensitivity=tuple(sensitivity),
    )


def simulate_scenario_shock(
    base_issuers: list[dict[str, Any]], params: ScenarioShockParams
) -> ScenarioSimulationResult:
    start = time.perf_counter()
    _validate(params)
    impacts = [_simulate_issuer(issuer, params) for issuer in base_issuers]

    def ranks(field_name: str) -> dict[str, int]:
        eligible = [impact for impact in impacts if getattr(impact, field_name) is not None]
        return {
            impact.symbol: 1 + sum(getattr(other, field_name) > getattr(impact, field_name) for other in eligible)
            for impact in eligible
        }

    baseline_ranks = ranks("baseline_rbv_usd")
    post_ranks = ranks("post_shock_rbv_usd")
    ranked = [
        replace(
            impact,
            baseline_rank=baseline_ranks.get(impact.symbol),
            post_shock_rank=post_ranks.get(impact.symbol),
            rank_change=(baseline_ranks[impact.symbol] - post_ranks[impact.symbol])
            if impact.symbol in baseline_ranks and impact.symbol in post_ranks
            else None,
        )
        for impact in impacts
    ]
    return ScenarioSimulationResult(params, ranked, round((time.perf_counter() - start) * 1000, 2))
