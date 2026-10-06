"""Explicit synthetic fixtures for an isolated test database. Never a product fallback.

Run only with ENVIRONMENT=test and GALI_QA_FIXTURES=1 after migrations.
Every visible entity name says QA fixture. No upstream calls or credits are used.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import os

from gali_core.config import IN_UNIVERSE_SYMBOLS, get_settings
from gali_core.db.base import async_session
from gali_core.db.models import (
    CommodityPrice,
    CompanyFinancials,
    CompanyPerformance,
    CompanyProduct,
    ForeignFlow,
    IdxCompany,
    Issuer,
    IssuerMiningLink,
    MetricRun,
    MiningCompany,
    MiningContract,
    MiningLicense,
    MiningSite,
    MiningSiteProduction,
    PublishedPointer,
    RawResponse,
    SalesDestination,
)
from gali_core.metrics.engine import run_metric_pipeline
from gali_core.sectors.cache import compute_params_hash
from sqlalchemy import delete, select

AS_OF = dt.date(2026, 10, 5)


async def seed_test_database() -> str:
    if get_settings().environment not in ("test", "testing") or os.getenv("GALI_QA_FIXTURES") != "1":
        raise RuntimeError("Synthetic fixtures require ENVIRONMENT=test and GALI_QA_FIXTURES=1 in an isolated database")
    async with async_session() as session:
        pointer = (await session.execute(select(PublishedPointer.run_id))).scalar_one_or_none()
        if pointer:
            existing = await session.get(MetricRun, pointer)
            if existing and existing.data_version == "qa-synthetic":
                return str(pointer)
            raise RuntimeError("Refusing to seed an existing published dataset")
        await session.execute(delete(IssuerMiningLink))
        await session.execute(delete(Issuer))
        companies = [
            MiningCompany(
                slug=f"qa-{symbol.lower()}", name=f"QA fixture {symbol}", symbol=symbol, commodity_types=["Coal"]
            )
            for symbol in IN_UNIVERSE_SYMBOLS
        ]
        companies.append(
            MiningCompany(slug="qa-aadi-operator", name="QA fixture AADI operator", commodity_types=["Coal"])
        )
        session.add_all(companies)
        session.add_all(
            [
                IdxCompany(symbol=symbol, name=f"QA fixture {symbol}", sub_sector="Coal", market_cap_idr=(i + 1) * 1e12)
                for i, symbol in enumerate(IN_UNIVERSE_SYMBOLS)
            ]
        )
        session.add_all(
            [
                Issuer(symbol=symbol, name=f"QA fixture {symbol}", primary_commodity="Coal", is_in_universe=True)
                for symbol in IN_UNIVERSE_SYMBOLS
            ]
        )
        await session.flush()
        for i, symbol in enumerate(IN_UNIVERSE_SYMBOLS):
            slug = "qa-aadi-operator" if symbol == "AADI" else f"qa-{symbol.lower()}"
            session.add(
                IssuerMiningLink(
                    symbol=symbol,
                    company_slug=slug,
                    effective_ownership_pct=100,
                    confidence=1,
                    method="qa_fixture",
                    path=[f"qa-{symbol.lower()}", slug],
                )
            )
            if symbol == "AADI":
                session.add(
                    IssuerMiningLink(
                        symbol=symbol,
                        company_slug="qa-aadi",
                        effective_ownership_pct=100,
                        confidence=1,
                        method="qa_fixture",
                        path=["qa-aadi"],
                    )
                )
            session.add(
                CompanyPerformance(
                    company_slug=slug,
                    year=2025,
                    commodity_type="Coal",
                    production_volume=10 + i,
                    sales_volume=10 + i,
                    total_reserves_mt=None if symbol == "DSSA" else (10 + i) * (20 + i),
                    unit="Mt",
                )
            )
            session.add(
                CompanyPerformance(
                    company_slug=slug,
                    year=2024,
                    commodity_type="Coal",
                    production_volume=1,
                    sales_volume=1,
                    total_reserves_mt=1,
                    unit="Mt",
                )
            )
            if symbol != "PTBA":
                revenue = 1e9 + i * 1e8
                session.add(
                    CompanyFinancials(
                        company_slug=slug, year=2025, revenue_usd=revenue, cost_of_revenue_usd=revenue * 0.6
                    )
                )
                session.add(CompanyFinancials(company_slug=slug, year=2024, revenue_usd=100, cost_of_revenue_usd=10))
            session.add(
                CompanyProduct(
                    company_slug=slug, year=2025, product_name="QA fixture Coal", cv_kcal_min=4000, cv_kcal_max=4500
                )
            )
            session.add(
                MiningLicense(
                    wiup_code=f"QA-{symbol}",
                    company_slug=slug,
                    licensed_area_ha=1000,
                    license_expiry_date=dt.date(2028, 1, 1) if symbol == "GEMS" else dt.date(2040, 1, 1),
                    activity="Operasi Produksi",
                    cnc="CNC",
                    match_confidence=1,
                )
            )
            session.add(
                MiningContract(
                    mine_owner_slug=slug,
                    contractor_slug=f"qa-contractor-{symbol}",
                    contractor_name="QA fixture contractor",
                    contract_period_end=dt.date(2027, 1, 1),
                )
            )
            session.add_all(
                [
                    SalesDestination(
                        company_slug=slug, year=2025, country=country, volume=volume, pct_of_sales_volume=volume * 10
                    )
                    for country, volume in [("China", 6), ("India", 4)]
                ]
            )
            session.add(
                SalesDestination(company_slug=slug, year=2024, country="Japan", volume=1000, pct_of_sales_volume=100)
            )
            endpoint = f"/v2/mining/companies/performance/{slug}/"
            session.add(
                RawResponse(
                    endpoint=endpoint,
                    params={},
                    params_hash=compute_params_hash({}),
                    payload={"qa_fixture": True},
                    status_code=200,
                    tier="warm",
                    credits_charged=0,
                )
            )
            session.add(ForeignFlow(symbol=symbol, date=AS_OF - dt.timedelta(days=1), net_foreign_inflow=(i + 1) * 1e9))
            session.add(ForeignFlow(symbol=symbol, date=AS_OF - dt.timedelta(days=40), net_foreign_inflow=999e12))
        # One operating entity belongs to two issuers; both links must be exposed on the map.
        session.add(
            IssuerMiningLink(
                symbol="ADRO",
                company_slug="qa-aadi-operator",
                effective_ownership_pct=15.37,
                confidence=1,
                method="qa_fixture",
                path=["qa-adro", "qa-aadi-operator"],
            )
        )
        session.add(
            MiningSite(
                slug="qa-tutupan",
                name="QA fixture Tutupan",
                company_slug="qa-aadi-operator",
                company_name="QA fixture AADI operator",
                commodity_type="Coal",
                province="Kalimantan Selatan",
                longitude=115.52,
                latitude=-2.15,
            )
        )
        session.add(
            MiningSite(
                slug="qa-missing-latitude",
                name="QA fixture incomplete GPS",
                company_slug="qa-aadi-operator",
                longitude=115.52,
                latitude=None,
            )
        )
        session.add(CommodityPrice(commodity="Coal", observed_on=AS_OF, price=100, unit="USD/t"))
        await session.flush()
        session.add(MiningSiteProduction(site_slug="qa-tutupan", year=2025, production_volume=10, unit="Mt"))
        await session.commit()
        run_id = await run_metric_pipeline(session, as_of=AS_OF)
        run = await session.get(MetricRun, run_id)
        run.data_version = "qa-synthetic"
        await session.commit()
        return str(run_id)


if __name__ == "__main__":
    print("QA synthetic fixture dataset published:", asyncio.run(seed_test_database()))
