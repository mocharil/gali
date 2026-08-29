"""Unit Tests for Task 4.11 Scenario Studio Parametric Shock Engine."""


from gali_core.scenario.engine import (
    ScenarioShockParams,
    simulate_scenario_shock,
)


def test_scenario_price_and_destination_shock():
    """Verify parametric price shock and destination reduction impact on RBV and ranks."""
    issuers = [
        {
            "symbol": "ADRO",
            "rli_years": 16.2,
            "attributable_gross_profit_usd": 874_310_000.0,
            "revenue_usd": 2_079_000_000.0,
            "cost_of_revenue_usd": 1_204_690_000.0,
            "destinations": [
                {"country": "China", "pct_of_sales_volume": 30.0},
                {"country": "Japan", "pct_of_sales_volume": 56.0},
                {"country": "Domestic", "pct_of_sales_volume": 14.0},
            ],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "BYAN",
            "rli_years": 40.2,
            "attributable_gross_profit_usd": 1_332_570_000.0,
            "revenue_usd": 3_446_000_000.0,
            "cost_of_revenue_usd": 2_113_430_000.0,
            "destinations": [
                {"country": "Philippines", "pct_of_sales_volume": 30.0},
                {"country": "China", "pct_of_sales_volume": 20.0},
            ],
            "license_cliff_3y": 0.0,
        },
        {
            "symbol": "PTBA",
            "rli_years": 67.8,
            "attributable_gross_profit_usd": None,  # Partial data
            "revenue_usd": None,
            "cost_of_revenue_usd": None,
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
