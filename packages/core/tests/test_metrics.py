"""Comprehensive Unit & Property Tests for GALI Metric Engines (M1–M9).

Enforces strict compliance with BUILD_PLAN.md rules:
- Golden test: Adaro RLI = 17.02 ± 0.05 years
- PTBA: revenue/cost null -> M2 (RBV) and M4 (Cash Cost) = NULL
- DSSA: total_reserves_Mt null -> M1 (RLI) and M2 (RBV) = NULL
- M8: Dynamic weight re-normalization when components are null
- M2: Implied life unbounded handling
"""

import pytest

from gali_core.metrics.cash_cost import (
    CashCostResult,
    build_national_cost_curve,
    compute_issuer_cash_cost,
)
from gali_core.metrics.destination import compute_destination_hhi
from gali_core.metrics.evidence import build_evidence_payload
from gali_core.metrics.license_cliff import compute_license_cliff
from gali_core.metrics.market_divergence import compute_market_divergence
from gali_core.metrics.quality import select_coal_benchmark
from gali_core.metrics.rbv import compute_rbv
from gali_core.metrics.rli import compute_rli
from gali_core.metrics.score import compute_ground_truth_scores

# =============================================================================
# M1 — Reserve Life Index (RLI) Tests
# =============================================================================


def test_adaro_rli_golden():
    """Golden Test: Adaro (AADI) RLI must equal 17.02 ± 0.05 years (819.0 Mt / 48.11 Mt)."""
    links = [
        {"company_slug": "pt-adaro-andalan-indonesia-tbk", "effective_ownership_pct": 100.0}
    ]
    perf_map = {
        "pt-adaro-andalan-indonesia-tbk": {
            "total_reserves_mt": 819.0,
            "production_volume": 48.11,
            "proven_reserves_mt": 500.0,
            "probable_reserves_mt": 319.0,
        }
    }
    result = compute_rli("AADI", links, perf_map)
    assert result.rli_years is not None
    assert pytest.approx(result.rli_years, abs=0.05) == 17.02
    assert result.attributable_reserves_mt == 819.0
    assert result.attributable_production_mt == 48.11
    assert result.is_partial is False


def test_dssa_rli_must_be_null():
    """DSSA has no total_reserves_mt reported -> RLI MUST be NULL (no proxy imputation)."""
    links = [
        {"company_slug": "pt-dian-swastatika-sentosa-tbk", "effective_ownership_pct": 100.0}
    ]
    perf_map = {
        "pt-dian-swastatika-sentosa-tbk": {
            "total_reserves_mt": None,
            "production_volume": 53.1,
            "proven_reserves_mt": None,
            "probable_reserves_mt": None,
        }
    }
    result = compute_rli("DSSA", links, perf_map)
    assert result.rli_years is None
    assert result.attributable_reserves_mt is None
    assert result.is_partial is True
    assert result.null_reason is not None


# =============================================================================
# M2 — Reserve-Backed Value & Implied Life Tests
# =============================================================================


def test_ptba_rbv_must_be_null():
    """PTBA has no revenue_usd / cost_of_revenue_usd reported -> RBV MUST be NULL."""
    links = [
        {"company_slug": "pt-bukit-asam-tbk", "effective_ownership_pct": 100.0}
    ]
    fin_map = {
        "pt-bukit-asam-tbk": {
            "revenue_usd": None,
            "cost_of_revenue_usd": None,
            "profit_usd": None,
        }
    }
    result = compute_rbv(
        symbol="PTBA",
        rli_years=67.8,
        links=links,
        financials_map=fin_map,
        market_cap_idr=30_000_000_000_000.0,
    )
    assert result.reserve_backed_value_usd is None
    assert result.rbv_gap_pct is None
    assert result.attributable_gross_profit_usd is None
    assert result.is_partial is True


def test_dssa_rbv_must_be_null_due_to_null_rli():
    """DSSA has RLI=None -> RBV MUST be NULL."""
    links = [
        {"company_slug": "pt-dian-swastatika-sentosa-tbk", "effective_ownership_pct": 100.0}
    ]
    fin_map = {
        "pt-dian-swastatika-sentosa-tbk": {
            "revenue_usd": 3_018_000_000.0,
            "cost_of_revenue_usd": 1_789_390_000.0,
        }
    }
    result = compute_rbv(
        symbol="DSSA",
        rli_years=None,
        links=links,
        financials_map=fin_map,
        market_cap_idr=50_000_000_000_000.0,
    )
    assert result.reserve_backed_value_usd is None
    assert result.rbv_gap_pct is None
    assert result.is_partial is True


def test_rbv_calculation_and_unbounded_implied_life():
    """Verify RBV annuity DCF and unbounded implied life handling."""
    links = [{"company_slug": "corp-a", "effective_ownership_pct": 100.0}]
    fin_map = {
        "corp-a": {
            "revenue_usd": 1_000_000_000.0,
            "cost_of_revenue_usd": 600_000_000.0,  # GP = 400M
        }
    }
    # Market cap very large: $10B (10B * 0.12 = 1.2B > 400M GP -> unbounded)
    mcap_idr = 10_000_000_000.0 * 16_200.0

    result = compute_rbv(
        symbol="TEST",
        rli_years=20.0,
        links=links,
        financials_map=fin_map,
        market_cap_idr=mcap_idr,
        discount_rate=0.12,
    )
    assert result.reserve_backed_value_usd is not None
    assert result.reserve_backed_value_usd > 0
    assert result.implied_life_years is None
    assert result.is_unbounded is True


# =============================================================================
# M3 — License Cliff Tests
# =============================================================================


def test_license_cliff_horizons():
    """Verify 1y, 3y, 5y expiration and CNC coverage calculation."""
    import datetime as dt

    today = dt.date(2026, 8, 29)
    licenses = [
        {
            "wiup_code": "LIC-1",
            "licensed_area_ha": 1000.0,
            "license_expiry_date": dt.date(2027, 1, 1),  # Within 1y
            "activity": "Operasi Produksi",
            "cnc": "CNC",
            "match_confidence": 1.0,
        },
        {
            "wiup_code": "LIC-2",
            "licensed_area_ha": 3000.0,
            "license_expiry_date": dt.date(2029, 1, 1),  # Within 3y
            "activity": "Operasi Produksi",
            "cnc": "CNC",
            "match_confidence": 1.0,
        },
        {
            "wiup_code": "LIC-3",
            "licensed_area_ha": 6000.0,
            "license_expiry_date": dt.date(2035, 1, 1),  # Far future
            "activity": "Operasi Produksi",
            "cnc": "Non-CNC",
            "match_confidence": 1.0,
        },
    ]

    res = compute_license_cliff("TEST", licenses, as_of=today)
    assert res.total_licensed_area_ha == 10000.0
    assert res.license_cliff_1y == 10.0  # 1000 / 10000
    assert res.license_cliff_3y == 40.0  # (1000 + 3000) / 10000
    assert res.license_cliff_5y == 40.0
    assert res.cnc_coverage_pct == 40.0  # 4000 / 10000


# =============================================================================
# M4 — Cash Cost Curve Tests
# =============================================================================


def test_ptba_cash_cost_must_be_null():
    """PTBA missing cost_of_revenue_usd -> Cash Cost MUST be NULL."""
    links = [{"company_slug": "pt-bukit-asam-tbk", "effective_ownership_pct": 100.0}]
    fin_map = {"pt-bukit-asam-tbk": {"cost_of_revenue_usd": None}}
    perf_map = {"pt-bukit-asam-tbk": {"sales_volume": 42.89}}

    res = compute_issuer_cash_cost("PTBA", links, fin_map, perf_map)
    assert res.cash_cost_per_ton_usd is None
    assert res.is_partial is True


def test_national_cost_curve_ranking():
    """Verify sorting and cumulative volume percentile calculations."""
    issuers = [
        CashCostResult(symbol="B", cash_cost_per_ton_usd=50.0, realized_price_per_ton_usd=80.0, unit_margin_usd=30.0, breakeven_benchmark_price_usd=62.5, cost_curve_percentile=None, annual_volume_mt=40.0),
        CashCostResult(symbol="A", cash_cost_per_ton_usd=20.0, realized_price_per_ton_usd=80.0, unit_margin_usd=60.0, breakeven_benchmark_price_usd=25.0, cost_curve_percentile=None, annual_volume_mt=60.0),
        CashCostResult(symbol="C", cash_cost_per_ton_usd=None, realized_price_per_ton_usd=None, unit_margin_usd=None, breakeven_benchmark_price_usd=None, cost_curve_percentile=None, annual_volume_mt=None, is_partial=True),
    ]
    curve = build_national_cost_curve(issuers)
    # A should be first (cash cost 20.0), B second (cash cost 50.0), C last
    assert curve[0].symbol == "A"
    assert curve[0].cost_curve_percentile == 30.0  # (0 + 30) / 100
    assert curve[1].symbol == "B"
    assert curve[1].cost_curve_percentile == 80.0  # (60 + 20) / 100
    assert curve[2].symbol == "C"
    assert curve[2].cost_curve_percentile is None


# =============================================================================
# M5 — Quality Adjustment Tests
# =============================================================================


def test_quality_grade_classification():
    """Verify CV to ICI benchmark grade mapping."""
    assert select_coal_benchmark(3800.0) == "ICI-4 (4200 GAR)"
    assert select_coal_benchmark(4500.0) == "ICI-3 (5000 GAR)"
    assert select_coal_benchmark(5300.0) == "ICI-2 (5800 GAR)"
    assert select_coal_benchmark(6200.0) == "ICI-1 / Newcastle (6000 GAR)"


# =============================================================================
# M6 — Destination Concentration Tests
# =============================================================================


def test_destination_hhi():
    """Verify HHI export concentration calculation."""
    dests = [
        {"country": "China", "volume": 60.0, "pct_of_sales_volume": 60.0},
        {"country": "India", "volume": 40.0, "pct_of_sales_volume": 40.0},
    ]
    res = compute_destination_hhi("TEST", dests)
    # HHI = 60^2 + 40^2 = 3600 + 1600 = 5200
    assert res.destination_hhi == 5200.0
    assert res.top_destination == "China"
    assert res.top_destination_pct == 60.0


# =============================================================================
# M8 — Ground Truth Score Weight Re-normalization Tests
# =============================================================================


def test_m8_weight_renormalization_for_partial_data():
    """Verify that null components are dropped, remaining weights re-normalized to 1.0, and effective weight tracked."""
    universe = [
        # Full data issuer
        {
            "symbol": "FULL",
            "rli_years": 25.0,
            "license_cliff_3y": 5.0,
            "cost_curve_percentile": 20.0,
            "destination_hhi": 2500.0,
            "contractor_hhi": 3000.0,
            "contract_cliff_12m": 10.0,
        },
        # Partial data issuer (e.g. DSSA: rli is None)
        {
            "symbol": "PARTIAL_RLI",
            "rli_years": None,
            "license_cliff_3y": 0.0,
            "cost_curve_percentile": 30.0,
            "destination_hhi": 2000.0,
            "contractor_hhi": 2000.0,
            "contract_cliff_12m": 0.0,
        },
    ]

    scores = compute_ground_truth_scores(universe)
    full_score = next(s for s in scores if s.symbol == "FULL")
    partial_score = next(s for s in scores if s.symbol == "PARTIAL_RLI")

    assert full_score.confidence["effective_weight"] == 1.0
    assert full_score.confidence["is_complete"] is True

    # RLI (25% weight) dropped -> effective weight = 0.75
    assert partial_score.confidence["effective_weight"] == 0.75
    assert "rli" in partial_score.confidence["dropped_components"]
    assert partial_score.confidence["is_complete"] is False
    assert partial_score.ground_truth_score is not None
    # Re-normalized weights sum to 1.0
    norm_sum = sum(partial_score.confidence["normalized_weights"].values())
    assert pytest.approx(norm_sum, abs=0.01) == 1.0


# =============================================================================
# M9 & Evidence Tests
# =============================================================================


def test_market_divergence_and_evidence():
    """Verify divergence spread calculation and structured evidence payload."""
    universe = [
        {"symbol": "AAA", "rbv_gap_pct": 50.0, "ground_truth_score": 30.0},
        {"symbol": "BBB", "rbv_gap_pct": -20.0, "ground_truth_score": 80.0},
    ]
    div_results = compute_market_divergence(universe)
    aaa_div = next(d for d in div_results if d.symbol == "AAA")
    bbb_div = next(d for d in div_results if d.symbol == "BBB")

    assert aaa_div.divergence_spread is not None
    assert aaa_div.divergence_spread > 0  # High valuation gap + low fundamental score
    assert bbb_div.divergence_spread is not None
    assert bbb_div.divergence_spread < 0  # Discounted valuation + high fundamental score

    evidence = build_evidence_payload(
        symbol="AAA",
        raw_response_ids=[101, 102],
        field_provenance={"rli": "819Mt/48Mt"},
        null_fields=[{"field": "test_field", "reason": "not reported"}],
        assumptions={"discount_rate": 0.12},
    )
    assert evidence["symbol"] == "AAA"
    assert 101 in evidence["source_raw_response_ids"]
    assert len(evidence["null_fields"]) == 1
