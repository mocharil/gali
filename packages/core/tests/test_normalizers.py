"""Golden fixture unit tests for GALI normalizers (Task 2.11).

Tests all normalization logic against recorded responses with 0 credit cost.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from sqlalchemy import select

from gali_core.db.base import async_session
from gali_core.db.models import (
    MiningCompany,
)
from gali_core.normalize.core_normalizer import (
    normalize_company_financials,
    normalize_company_performance,
    normalize_mining_companies,
    normalize_sales_destinations,
    upsert_mining_companies,
)

GOLDEN_DIR = Path(__file__).parent / "golden"


def test_normalize_mining_companies_golden() -> None:
    raw = json.loads((GOLDEN_DIR / "mining_companies.json").read_text(encoding="utf-8"))
    rows = normalize_mining_companies(raw)
    assert len(rows) == 2
    assert rows[0]["slug"] == "pt-adaro-andalan-indonesia-tbk"
    assert rows[0]["symbol"] == "AADI"
    assert rows[0]["commodity_types"] == ["Coal"]
    assert rows[1]["symbol"] == "BUMI"


def test_normalize_company_performance_golden() -> None:
    raw = json.loads((GOLDEN_DIR / "company_performance_adaro.json").read_text(encoding="utf-8"))
    perf_rows, prod_rows = normalize_company_performance("pt-adaro-andalan-indonesia-tbk", raw)
    assert len(perf_rows) == 1
    assert perf_rows[0]["year"] == 2024
    assert perf_rows[0]["production_volume"] == 48.11
    assert perf_rows[0]["total_reserves_mt"] == 819.0
    assert perf_rows[0]["strip_ratio"] == 4.37

    assert len(prod_rows) == 1
    assert prod_rows[0]["product_name"] == "Envirocoal 4000"
    assert prod_rows[0]["cv_kcal_min"] == 3800.0
    assert prod_rows[0]["cv_kcal_max"] == 4200.0


def test_normalize_company_financials_golden() -> None:
    raw = json.loads((GOLDEN_DIR / "company_financials_adaro.json").read_text(encoding="utf-8"))
    rows = normalize_company_financials("pt-adaro-andalan-indonesia-tbk", raw)
    assert len(rows) == 1
    assert rows[0]["year"] == 2024
    assert rows[0]["symbol"] == "AADI"
    assert rows[0]["revenue_usd"] == 5320000000.0
    assert rows[0]["cost_of_revenue_usd"] == 3850000000.0
    assert rows[0]["profit_usd"] == 1100000000.0


def test_normalize_sales_destinations_golden() -> None:
    raw = json.loads((GOLDEN_DIR / "sales_destination_adaro.json").read_text(encoding="utf-8"))
    rows = normalize_sales_destinations("pt-adaro-andalan-indonesia-tbk", raw)
    assert len(rows) == 2
    countries = {r["country"] for r in rows}
    assert "China" in countries
    assert "India" in countries
    china_row = next(r for r in rows if r["country"] == "China")
    assert china_row["pct_of_total_revenue"] == 28.2


@pytest.mark.asyncio
async def test_normalizer_idempotent_upsert() -> None:
    """Verify that multiple upserts of the same golden rows are idempotent."""
    raw_comp = json.loads((GOLDEN_DIR / "mining_companies.json").read_text(encoding="utf-8"))
    comp_rows = normalize_mining_companies(raw_comp)

    async with async_session() as session:
        async with session.begin():
            # First upsert
            await upsert_mining_companies(session, comp_rows)

    async with async_session() as session:
        async with session.begin():
            # Second upsert (idempotent overwrite)
            await upsert_mining_companies(session, comp_rows)

            res = await session.execute(select(MiningCompany).where(MiningCompany.symbol == "AADI"))
            company = res.scalar_one_or_none()
            assert company is not None
            assert company.name == "PT Adaro Andalan Indonesia Tbk"
