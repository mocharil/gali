"""Numerical regression cases introduced during the demo reliability audit."""

import datetime as dt
from types import SimpleNamespace

import pytest

from gali_core.metrics.cash_cost import compute_issuer_cash_cost
from gali_core.metrics.contracts import compute_contractor_risk
from gali_core.metrics.destination import compute_destination_hhi
from gali_core.metrics.license_cliff import compute_license_cliff
from gali_core.metrics.periods import latest_year_rows
from gali_core.metrics.quality import compute_quality_adjustment
from gali_core.metrics.score import compute_ground_truth_scores
from gali_core.scenario.engine import ScenarioShockParams, simulate_scenario_shock


def issuer(**overrides):
    return {
        "symbol": "TEST",
        "rli_years": 20,
        "attributable_gross_profit_usd": 40,
        "attributable_revenue_usd": 100,
        "attributable_cost_usd": 60,
        "destinations": [{"country": "China", "pct_of_sales_volume": 60}],
        "license_cliff_3y": 100,
        **overrides,
    }


def test_latest_period_is_order_independent_and_preserves_all_latest_rows():
    rows = [
        SimpleNamespace(company_slug="a", year=2025, country="China"),
        SimpleNamespace(company_slug="a", year=2024, country="Japan"),
        SimpleNamespace(company_slug="a", year=2025, country="India"),
        SimpleNamespace(company_slug="b", year=2023, country="China"),
    ]
    assert {row.country for row in latest_year_rows(rows) if row.company_slug == "a"} == {"China", "India"}
    assert len(latest_year_rows(list(reversed(rows)))) == 3


def test_price_shock_uses_revenue_and_keeps_baseline_cost():
    result = simulate_scenario_shock([issuer()], ScenarioShockParams(price_shock_pct=-0.25)).issuer_impacts[0]
    assert result.post_shock_gp_usd == 15
    assert result.delta_rbv_pct == pytest.approx(-62.5)
    assert result.model_basis == "revenue_cost"


@pytest.mark.parametrize("end_date", [None, "invalid"])
def test_missing_contract_expiry_does_not_become_zero_risk(end_date):
    result = compute_contractor_risk("TEST", [{"contractor_name": "a", "contract_period_end": end_date}])
    assert result.contractor_hhi == 10000
    assert result.contract_cliff_12m is None
    assert result.is_partial
    assert "end dates" in result.null_reason


def test_missing_contractor_identity_does_not_become_a_synthetic_group():
    result = compute_contractor_risk("TEST", [{"contract_period_end": "2030-01-01"}], dt.date(2026, 10, 5))
    assert result.contractor_hhi is None
    assert result.contract_cliff_12m == 0
    assert result.is_partial


def test_contract_datetime_is_compared_as_a_date():
    result = compute_contractor_risk(
        "TEST", [{"contractor_name": "a", "contract_period_end": dt.datetime(2027, 1, 1)}], dt.date(2026, 10, 5)
    )
    assert result.contract_cliff_12m == 100
    assert not result.is_partial


def test_incomplete_contractor_pillar_is_dropped_instead_of_imputed():
    result = compute_ground_truth_scores(
        [{"symbol": "TEST", "rli_years": 20, "contractor_hhi": 10000, "contract_cliff_12m": None}]
    )[0]
    assert result.component_scores["contractor_risk"] is None
    assert "contractor_risk" in result.confidence["dropped_components"]
    assert result.confidence["effective_weight"] == 0.25


def test_country_shock_applies_variable_cost_and_case_insensitive_name():
    result = simulate_scenario_shock([issuer()], ScenarioShockParams(destination_shocks={"china": 0.3})).issuer_impacts[
        0
    ]
    assert result.post_shock_gp_usd == pytest.approx(29.02)
    assert result.delta_rbv_pct == pytest.approx(-27.45)
    assert result.revenue_at_risk_usd == 18


def test_full_expiry_can_reduce_reserve_value_to_zero():
    result = simulate_scenario_shock([issuer()], ScenarioShockParams(license_cliff_expiry_shock=True)).issuer_impacts[0]
    assert result.post_shock_rbv_usd == 0
    assert result.delta_rbv_pct == -100
    assert any("licensed-area" in warning for warning in result.warnings)


def test_proxy_is_explicit_and_does_not_claim_revenue_at_risk():
    result = simulate_scenario_shock(
        [issuer(attributable_revenue_usd=None, attributable_cost_usd=None)],
        ScenarioShockParams(destination_shocks={"China": 0.3}),
    ).issuer_impacts[0]
    assert result.model_basis == "gross_profit_proxy"
    assert result.revenue_at_risk_usd is None
    assert result.post_shock_gp_usd == pytest.approx(32.8)
    assert result.warnings


def test_discount_rate_changes_scenario_but_not_published_baseline():
    baseline = simulate_scenario_shock([issuer()], ScenarioShockParams()).issuer_impacts[0]
    changed = simulate_scenario_shock([issuer()], ScenarioShockParams(discount_rate=0.2)).issuer_impacts[0]
    assert changed.baseline_rbv_usd == baseline.baseline_rbv_usd
    assert changed.post_shock_rbv_usd < baseline.post_shock_rbv_usd


@pytest.mark.parametrize(
    "params",
    [
        ScenarioShockParams(price_shock_pct=3),
        ScenarioShockParams(destination_shocks={"China": -0.1}),
        ScenarioShockParams(discount_rate=float("nan")),
    ],
)
def test_core_rejects_invalid_shocks(params):
    with pytest.raises(ValueError):
        simulate_scenario_shock([issuer()], params)


def test_missing_reference_price_stays_missing():
    result = compute_issuer_cash_cost(
        "TEST",
        [{"company_slug": "a", "effective_ownership_pct": 100}],
        {"a": {"revenue_usd": 100e6, "cost_of_revenue_usd": 60e6}},
        {"a": {"sales_volume": 1}},
    )
    assert result.cash_cost_per_ton_usd == 60
    assert result.breakeven_benchmark_price_usd is None
    quality = compute_quality_adjustment("TEST", [], 100, {})
    assert quality.benchmark_price_usd is None
    assert quality.quality_discount_pct is None


def test_zero_destination_data_is_missing():
    result = compute_destination_hhi("TEST", [{"country": "China", "pct_of_sales_volume": None}])
    assert result.destination_hhi is None
    assert result.top_destination_pct is None


def test_unknown_license_area_or_expiry_cannot_mean_zero_risk():
    result = compute_license_cliff(
        "TEST", [{"match_confidence": 1, "licensed_area_ha": 100, "license_expiry_date": None}]
    )
    assert result.license_cliff_3y is None
    assert result.null_reason
    unqualified = compute_license_cliff("TEST", [{"match_confidence": 0, "licensed_area_ha": 100}])
    assert unqualified.total_licenses_count == 0
