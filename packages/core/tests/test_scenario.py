"""Unit Tests for Task 4.11 / 5.12 Scenario Studio Parametric Shock Engine."""

import math

from gali_core.scenario.engine import (
    ScenarioShockParams,
    simulate_scenario_shock,
)


def test_scenario_zero_shock_invariant():
    """Task 5.12 Regression Invariant: With zero shocks, post_shock_rbv_usd MUST equal baseline_rbv_usd."""
    issuers = [
        {
            "symbol": "ADRO",
            "rli_years": 16.24,
            "attributable_gross_profit_usd": 1_495_353_919.0,
            "destinations": [
                {"country": "China", "pct_of_sales_volume": 30.0},
                {"country": "Japan", "pct_of_sales_volume": 56.0},
            ],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "BYAN",
            "rli_years": 40.22,
            "attributable_gross_profit_usd": 1_332_570_000.0,
            "destinations": [
                {"country": "Philippines", "pct_of_sales_volume": 30.0},
                {"country": "China", "pct_of_sales_volume": 20.0},
            ],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "AADI",
            "rli_years": 17.02,
            "attributable_gross_profit_usd": 1_466_370_000.0,
            "destinations": [{"country": "Indonesia", "pct_of_sales_volume": 25.0}],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "BUMI",
            "rli_years": 31.51,
            "attributable_gross_profit_usd": 169_610_000.0,
            "destinations": [{"country": "Indonesia", "pct_of_sales_volume": 30.0}],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "GEMS",
            "rli_years": 17.74,
            "attributable_gross_profit_usd": 1_104_060_000.0,
            "destinations": [{"country": "China", "pct_of_sales_volume": 40.0}],
            "license_cliff_3y": 100.0,
        },
        {
            "symbol": "PTBA",
            "rli_years": 67.77,
            "attributable_gross_profit_usd": None,  # Partial data
            "destinations": [],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "DSSA",
            "rli_years": None,  # Partial data (missing reserves)
            "attributable_gross_profit_usd": 2_332_670_000.0,
            "destinations": [],
            "license_cliff_3y": 100.0,
        },
    ]

    # Zero shock params (default)
    params = ScenarioShockParams()

    res = simulate_scenario_shock(issuers, params)
    assert len(res.issuer_impacts) == len(issuers)

    for imp in res.issuer_impacts:
        if imp.is_partial:
            assert imp.baseline_rbv_usd is None
            assert imp.post_shock_rbv_usd is None
            assert imp.delta_rbv_usd is None
        else:
            assert imp.baseline_rbv_usd is not None
            assert imp.post_shock_rbv_usd is not None
            # Must be exactly equal within roundoff
            assert math.isclose(imp.post_shock_rbv_usd, imp.baseline_rbv_usd, rel_tol=1e-4)
            assert imp.delta_rbv_usd == 0.0
            assert imp.delta_rbv_pct == 0.0
            assert imp.rank_change == 0
            assert imp.volume_at_risk_pct == 0.0
            assert imp.revenue_at_risk_usd == 0.0


def test_scenario_price_and_destination_shock():
    """Verify parametric price shock and destination reduction impact on RBV and ranks."""
    issuers = [
        {
            "symbol": "ADRO",
            "rli_years": 16.24,
            "attributable_gross_profit_usd": 1_495_353_919.0,
            "destinations": [
                {"country": "China", "pct_of_sales_volume": 30.0},
                {"country": "Japan", "pct_of_sales_volume": 56.0},
                {"country": "Domestic", "pct_of_sales_volume": 14.0},
            ],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "BYAN",
            "rli_years": 40.22,
            "attributable_gross_profit_usd": 1_332_570_000.0,
            "destinations": [
                {"country": "Philippines", "pct_of_sales_volume": 30.0},
                {"country": "China", "pct_of_sales_volume": 20.0},
            ],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "PTBA",
            "rli_years": 67.77,
            "attributable_gross_profit_usd": None,  # Partial data
            "destinations": [],
            "license_cliff_3y": 0.0,
        },
    ]

    # Scenario: China imports drop by 50%, Coal price drops by 15%
    params = ScenarioShockParams(
        price_shock_pct=-0.15,
        destination_shocks={"China": 0.50},  # 50% cut of China sales
        discount_rate=0.12,
        variable_cost_share=0.65,
    )

    res = simulate_scenario_shock(issuers, params)
    assert len(res.issuer_impacts) == 3
    assert res.execution_time_ms < 50.0  # Target p95 < 50ms in-memory

    adro_imp = next(i for i in res.issuer_impacts if i.symbol == "ADRO")
    ptba_imp = next(i for i in res.issuer_impacts if i.symbol == "PTBA")

    # ADRO volume at risk: 30% * 0.50 = 15.0%
    assert adro_imp.volume_at_risk_pct == 15.0
    assert adro_imp.baseline_rbv_usd is not None
    assert adro_imp.post_shock_rbv_usd is not None
    assert adro_imp.post_shock_rbv_usd < adro_imp.baseline_rbv_usd
    assert adro_imp.delta_rbv_pct is not None
    assert adro_imp.delta_rbv_pct < 0

    # PTBA partial handling
    assert ptba_imp.is_partial is True
    assert ptba_imp.post_shock_rbv_usd is None
