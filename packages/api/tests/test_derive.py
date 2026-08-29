"""Regression tests for gali_api.derive.

Guards against reintroducing the confidence.is_complete confusion: M8's Ground
Truth Score can drop a minor sub-component (e.g. contractor_risk, when an issuer
has no recorded mining contracts) without the issuer's headline financial metrics
being incomplete. "PARSIAL" in this product means RLI/RBV/cash-cost is null, not
that the composite score used four of five weights instead of five.
"""

from gali_api.derive import data_quality_label, is_partial


def test_issuer_with_all_headline_metrics_is_lengkap_even_if_m8_dropped_a_component():
    # Mirrors AADI: confidence.is_complete=False (contractor_risk dropped) but
    # rli/rbv/cash_cost are all populated.
    assert not is_partial(rli_years=17.02, reserve_backed_value_usd=1.0e10, cash_cost_per_ton_usd=69.06)
    assert (
        data_quality_label(rli_years=17.02, reserve_backed_value_usd=1.0e10, cash_cost_per_ton_usd=69.06) == "LENGKAP"
    )


def test_issuer_missing_reserves_is_parsial():
    # Mirrors DSSA: total_reserves_mt not reported -> rli and rbv are NULL.
    assert is_partial(rli_years=None, reserve_backed_value_usd=None, cash_cost_per_ton_usd=31.94)
    assert data_quality_label(rli_years=None, reserve_backed_value_usd=None, cash_cost_per_ton_usd=31.94) == "PARSIAL"


def test_issuer_missing_financials_is_parsial():
    # Mirrors PTBA: revenue/cost not reported -> rbv and cash_cost are NULL.
    assert is_partial(rli_years=67.77, reserve_backed_value_usd=None, cash_cost_per_ton_usd=None)
    assert data_quality_label(rli_years=67.77, reserve_backed_value_usd=None, cash_cost_per_ton_usd=None) == "PARSIAL"


def test_fully_complete_issuer_is_lengkap():
    assert not is_partial(rli_years=16.24, reserve_backed_value_usd=1.05e10, cash_cost_per_ton_usd=26.16)
