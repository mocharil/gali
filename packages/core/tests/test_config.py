"""Unit tests for config and financial assumptions."""

import pytest
from pydantic import ValidationError

from gali_core.config import COAL_BENCHMARK_BANDS, Assumptions, get_settings


def test_assumptions_defaults() -> None:
    a = Assumptions()
    assert a.discount_rate == 0.12
    assert a.variable_cost_share == 0.65
    assert a.fx_idr_usd == 16_200.0
    assert a.min_match_confidence == 0.72
    assert a.low_match_floor == 0.55
    assert a.max_ownership_depth == 6


def test_assumptions_validation() -> None:
    with pytest.raises(ValidationError):
        Assumptions(discount_rate=1.5)  # must be in (0, 1)

    with pytest.raises(ValidationError):
        Assumptions(discount_rate=-0.05)

    with pytest.raises(ValidationError):
        Assumptions(min_match_confidence=1.2)


def test_coal_benchmark_bands_structure() -> None:
    assert len(COAL_BENCHMARK_BANDS) == 4
    # Ensure bands are continuous
    for i in range(len(COAL_BENCHMARK_BANDS) - 1):
        assert COAL_BENCHMARK_BANDS[i][1] == COAL_BENCHMARK_BANDS[i + 1][0]


def test_settings_load() -> None:
    settings = get_settings()
    assert settings.sectors_credit_hard_cap == 950
    assert settings.gali_dry_run is True
    assert isinstance(settings.cors_origins, list)
