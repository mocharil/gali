"""Independent numerical benchmarks and edge cases for research interpretation."""

import math

import pytest

from gali_core.metrics.market_divergence import compute_market_divergence
from gali_core.metrics.rbv import compute_rbv
from gali_core.metrics.rli import compute_rli
from gali_core.metrics.score import compute_ground_truth_scores, percentile_rank_ascending, percentile_rank_descending
from gali_core.scenario.engine import ScenarioShockParams, simulate_scenario_shock


def base(**overrides):
    return {
        "symbol": "TEST",
        "rli_years": 20,
        "attributable_gross_profit_usd": 40,
        "attributable_revenue_usd": 100,
        "attributable_cost_usd": 60,
        "destinations": [{"country": "China", "pct_of_sales_volume": 60}],
        "license_cliff_3y": 50,
        **overrides,
    }


def rbv(financials, **overrides):
    return compute_rbv(
        "TEST", 20, [{"company_slug": "a", "effective_ownership_pct": 100}], {"a": financials}, 100 * 16200, **overrides
    )


def test_rbv_matches_year_by_year_discounted_gross_profit():
    result = rbv({"revenue_usd": 100, "cost_of_revenue_usd": 60})
    benchmark = sum(40 / (1.12**year) for year in range(1, 21))
    assert result.reserve_backed_value_usd == pytest.approx(benchmark, abs=0.01)
    assert result.financial_coverage_pct == 100


def test_zero_discount_rate_limit_and_implied_life():
    result = rbv({"revenue_usd": 100, "cost_of_revenue_usd": 60}, discount_rate=0)
    assert result.reserve_backed_value_usd == 800
    assert result.implied_life_years == 2.5


def test_unspecified_profit_does_not_mix_net_and_gross_profit():
    result = rbv({"profit_usd": 40})
    assert result.reserve_backed_value_usd is None
    assert result.warnings
    assert rbv({"profit_usd": 40, "profit_basis": "gross_profit"}).reserve_backed_value_usd is not None


def test_missing_entity_financials_prevents_issuer_wide_projection():
    result = compute_rbv(
        "TEST",
        20,
        [
            {"company_slug": "a", "effective_ownership_pct": 100},
            {"company_slug": "b", "effective_ownership_pct": 100},
        ],
        {"a": {"revenue_usd": 100, "cost_of_revenue_usd": 60}},
        100 * 16200,
    )
    assert result.financial_coverage_pct == 50
    assert result.reserve_backed_value_usd is None
    assert result.is_partial


def test_unknown_ownership_is_not_assumed_to_be_100_percent():
    result = compute_rbv(
        "TEST", 20, [{"company_slug": "a"}], {"a": {"revenue_usd": 100, "cost_of_revenue_usd": 60}}, 100 * 16200
    )
    assert result.reserve_backed_value_usd is None
    assert result.warnings


@pytest.mark.parametrize("kwargs", [{"discount_rate": -1}, {"fx_idr_usd": 0}, {"max_annuity_years": math.inf}])
def test_invalid_rbv_assumptions_are_rejected(kwargs):
    with pytest.raises(ValueError):
        rbv({"revenue_usd": 100, "cost_of_revenue_usd": 60}, **kwargs)


def test_negative_baseline_gross_profit_stays_visible():
    result = rbv({"revenue_usd": 50, "cost_of_revenue_usd": 60})
    assert result.attributable_gross_profit_usd == -10
    assert result.reserve_backed_value_usd is None
    assert "nonpositive" in result.null_reason


def test_rli_uses_data_not_a_hard_coded_symbol_exception():
    result = compute_rli(
        "DSSA",
        [{"company_slug": "operator", "effective_ownership_pct": 100}],
        {"operator": {"total_reserves_mt": 100, "production_volume": 10}},
    )
    assert result.rli_years == 10


def test_rli_does_not_pair_reserves_and_production_from_different_entities():
    result = compute_rli(
        "TEST",
        [{"company_slug": slug, "effective_ownership_pct": 100} for slug in ("a", "b")],
        {"a": {"total_reserves_mt": 100}, "b": {"production_volume": 10}},
    )
    assert result.rli_years is None
    assert result.is_partial


def test_rli_proven_probable_fallback_is_data_driven():
    result = compute_rli(
        "DSSA",
        [{"company_slug": "a-tbk", "effective_ownership_pct": 100}],
        {"a-tbk": {"proven_reserves_mt": 60, "probable_reserves_mt": 40, "production_volume": 10}},
    )
    assert result.rli_years == 10


@pytest.mark.parametrize("production", [math.inf, math.nan])
def test_invalid_performance_does_not_escape_as_nonfinite_totals(production):
    result = compute_rli(
        "TEST",
        [{"company_slug": "a", "effective_ownership_pct": 100}],
        {"a": {"total_reserves_mt": 100, "production_volume": production}},
    )
    assert result.rli_years is None
    assert result.attributable_production_mt is None


def test_combined_shock_benchmark_preserves_gross_loss():
    row = simulate_scenario_shock(
        [base()], ScenarioShockParams(price_shock_pct=-0.5, destination_shocks={"China": 0.3})
    ).issuer_impacts[0]
    # Revenue 100 * .5 * .82 = 41; costs 60 * (.35 + .65 * .82) = 52.98.
    assert row.post_shock_revenue_usd == 41
    assert row.post_shock_cost_usd == 52.98
    assert row.post_shock_gp_usd == -11.98
    assert row.gross_loss_usd == 11.98
    assert row.post_shock_rbv_usd == 0
    assert row.delta_rbv_pct == -100
    assert row.break_even_price_change_pct == pytest.approx((52.98 / 82 - 1) * 100, abs=0.01)


def test_waterfall_reconciles_combined_shock_without_double_counting_interactions():
    params = ScenarioShockParams(
        price_shock_pct=-0.2, destination_shocks={"China": 0.3}, license_cliff_expiry_shock=True, discount_rate=0.16
    )
    row = simulate_scenario_shock([base()], params).issuer_impacts[0]
    assert row.post_shock_gp_usd == 12.62
    assert row.post_shock_rbv_usd == pytest.approx(sum(12.62 / 1.16**year for year in range(1, 11)), abs=0.01)
    assert sum(driver.delta_rbv_usd for driver in row.drivers) == pytest.approx(row.delta_rbv_usd, abs=0.001)
    assert row.drivers[-1].rbv_after_usd == row.post_shock_rbv_usd
    price = simulate_scenario_shock([base()], ScenarioShockParams(price_shock_pct=-0.2)).issuer_impacts[0]
    volume = simulate_scenario_shock([base()], ScenarioShockParams(destination_shocks={"China": 0.3})).issuer_impacts[0]
    combined = simulate_scenario_shock(
        [base()], ScenarioShockParams(price_shock_pct=-0.2, destination_shocks={"China": 0.3})
    ).issuer_impacts[0]
    assert combined.delta_rbv_usd != pytest.approx(price.delta_rbv_usd + volume.delta_rbv_usd)


def test_zero_shock_sensitivity_center_equals_published_baseline():
    row = simulate_scenario_shock([base(baseline_rbv_usd=123)], ScenarioShockParams()).issuer_impacts[0]
    assert row.delta_rbv_usd == 0
    assert all(driver.delta_rbv_usd == 0 for driver in row.drivers)
    center = next(point for point in row.sensitivity if point.price_shock_pct == 0 and point.discount_rate == 0.12)
    assert center.rbv_usd == 123
    assert center.delta_rbv_pct == 0


def test_sensitivity_boundaries_are_unique_valid_and_monotonic():
    row = simulate_scenario_shock([base()], ScenarioShockParams(price_shock_pct=-1, discount_rate=0.01)).issuer_impacts[
        0
    ]
    assert len({(point.price_shock_pct, point.discount_rate) for point in row.sensitivity}) == len(row.sensitivity)
    assert all(-1 <= point.price_shock_pct <= 2 and 0.01 <= point.discount_rate <= 0.5 for point in row.sensitivity)
    normal = simulate_scenario_shock([base()], ScenarioShockParams()).issuer_impacts[0]
    for rate in {point.discount_rate for point in normal.sensitivity}:
        points = sorted(
            (point for point in normal.sensitivity if point.discount_rate == rate),
            key=lambda point: point.price_shock_pct,
        )
        assert all(a.rbv_usd <= b.rbv_usd for a, b in zip(points, points[1:], strict=False))


def test_tied_zero_values_share_size_rank():
    rows = simulate_scenario_shock(
        [base(symbol="A"), base(symbol="B")], ScenarioShockParams(price_shock_pct=-1)
    ).issuer_impacts
    assert {row.post_shock_rank for row in rows} == {1}


@pytest.mark.parametrize("ranker", [percentile_rank_ascending, percentile_rank_descending])
def test_one_peer_is_neutral_not_perfect(ranker):
    assert ranker([10], 10) == 50
    assert ranker([math.nan], math.nan) is None


def test_score_coverage_and_sensitivity_do_not_rank_provisional_rows():
    rows = compute_ground_truth_scores(
        [
            {
                "symbol": "A",
                "rli_years": 20,
                "license_cliff_3y": 0,
                "cost_curve_percentile": 20,
                "destination_hhi": 3000,
                "contractor_hhi": 3000,
                "contract_cliff_12m": 0,
            },
            {"symbol": "B", "rli_years": 40},
        ]
    )
    full, partial = rows
    assert full.confidence["ranking_eligible"]
    assert not partial.confidence["ranking_eligible"]
    assert partial.confidence["weight_sensitivity"]["rank_min"] is None
    assert full.confidence["weight_sensitivity"]["rank_min"] == 1
    assert full.confidence["weight_sensitivity"]["tested_configurations"] == 11
    assert partial.confidence["effective_weight"] == 0.25


def test_provisional_score_cannot_acquire_a_market_quadrant():
    row = compute_market_divergence(
        [{"symbol": "A", "rbv_gap_pct": -50, "ground_truth_score": 90, "confidence": {"ranking_eligible": False}}]
    )[0]
    assert row.quadrant is None
    assert row.divergence_spread is None


def test_market_quadrants_describe_relative_model_gaps():
    rows = compute_market_divergence(
        [
            {"symbol": "A", "rbv_gap_pct": 50, "ground_truth_score": 20},
            {"symbol": "B", "rbv_gap_pct": -50, "ground_truth_score": 80},
        ]
    )
    assert rows[0].quadrant == "Higher Model Gap / Lower Score"
    assert rows[1].quadrant == "Lower Model Gap / Higher Score"
