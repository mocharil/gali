"""Software-Defined Assets for core tier normalization.

These assets consume records from raw.responses and materialize typed rows into core.* tables.
Execution is completely offline / 0 network credits.
"""

import asyncio

from dagster import AssetExecutionContext, MaterializeResult, asset
from gali_core.db.models import RawResponse
from gali_core.normalize.core_normalizer import (
    normalize_commodity_prices,
    normalize_company_financials,
    normalize_company_performance,
    normalize_mining_companies,
    normalize_mining_contracts,
    normalize_mining_sites,
    normalize_sales_destinations,
    upsert_commodity_prices,
    upsert_company_financials,
    upsert_company_performance,
    upsert_mining_companies,
    upsert_mining_contracts,
    upsert_mining_sites,
    upsert_sales_destinations,
)
from sqlalchemy import desc, select

from gali_pipeline.resources import DbResource


@asset(group_name="core", compute_kind="sql_upsert", deps=["raw_mining_companies"])
def core_mining_companies(
    context: AssetExecutionContext, db: DbResource
) -> MaterializeResult:
    """Normalize and upsert raw mining companies to core.mining_company."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            # Query all raw mining company responses
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint == "/v2/mining/companies/",
                    RawResponse.status_code == 200,
                )
                .order_by(desc(RawResponse.fetched_at))
            )
            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload:
                    rows = normalize_mining_companies(raw.payload)
                    count = await upsert_mining_companies(session, rows)
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})


@asset(
    group_name="core",
    compute_kind="sql_upsert",
    deps=["raw_mining_sites", "core_mining_companies"],
)
def core_mining_sites(
    context: AssetExecutionContext, db: DbResource
) -> MaterializeResult:
    """Normalize and upsert raw mining sites to core.mining_site."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint == "/v2/mining/sites/",
                    RawResponse.status_code == 200,
                )
                .order_by(desc(RawResponse.fetched_at))
            )
            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload:
                    site_rows, prod_rows = normalize_mining_sites(raw.payload)
                    count = await upsert_mining_sites(session, site_rows, prod_rows)
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})


@asset(
    group_name="core",
    compute_kind="sql_upsert",
    deps=["raw_mining_contracts", "core_mining_companies"],
)
def core_mining_contracts(
    context: AssetExecutionContext, db: DbResource
) -> MaterializeResult:
    """Normalize and upsert raw mining contracts to core.mining_contract."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint == "/v2/mining/contracts/",
                    RawResponse.status_code == 200,
                )
                .order_by(desc(RawResponse.fetched_at))
            )
            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload:
                    rows = normalize_mining_contracts(raw.payload)
                    count = await upsert_mining_contracts(session, rows)
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})


@asset(group_name="core", compute_kind="sql_upsert", deps=["core_mining_companies"])
def core_company_performance(
    context: AssetExecutionContext, db: DbResource
) -> MaterializeResult:
    """Normalize and upsert raw company performance to core.company_performance."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint.like("/v2/mining/companies/performance/%"),
                    RawResponse.status_code == 200,
                )
                .order_by(desc(RawResponse.fetched_at))
            )
            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload and raw.endpoint:
                    # Extract company slug from endpoint URL
                    slug = raw.endpoint.strip("/").split("/")[-1]
                    perf_rows, prod_rows = normalize_company_performance(
                        slug, raw.payload
                    )
                    count = await upsert_company_performance(
                        session, perf_rows, prod_rows
                    )
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})


@asset(group_name="core", compute_kind="sql_upsert", deps=["core_mining_companies"])
def core_company_financials(
    context: AssetExecutionContext, db: DbResource
) -> MaterializeResult:
    """Normalize and upsert raw company financials to core.company_financials."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint.like("/v2/mining/companies/financials/%"),
                    RawResponse.status_code == 200,
                )
                .order_by(desc(RawResponse.fetched_at))
            )
            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload and raw.endpoint:
                    slug = raw.endpoint.strip("/").split("/")[-1]
                    rows = normalize_company_financials(slug, raw.payload)
                    count = await upsert_company_financials(session, rows)
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})


@asset(group_name="core", compute_kind="sql_upsert", deps=["core_mining_companies"])
def core_sales_destinations(
    context: AssetExecutionContext, db: DbResource
) -> MaterializeResult:
    """Normalize and upsert raw sales destination to core.sales_destination."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint.like("/v2/mining/sales-destination/%"),
                    RawResponse.status_code == 200,
                )
                .order_by(desc(RawResponse.fetched_at))
            )
            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload and raw.endpoint:
                    slug = raw.endpoint.strip("/").split("/")[-1]
                    rows = normalize_sales_destinations(slug, raw.payload)
                    count = await upsert_sales_destinations(session, rows)
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})


@asset(group_name="core", compute_kind="sql_upsert", deps=["raw_mining_commodities"])
def core_commodity_prices(
    context: AssetExecutionContext, db: DbResource
) -> MaterializeResult:
    """Normalize and upsert raw commodity prices to core.commodity_price."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint.like("/v2/mining/commodities/%/price/"),
                    RawResponse.status_code == 200,
                )
                .order_by(desc(RawResponse.fetched_at))
            )
            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload and raw.endpoint:
                    # Extract commodity name from endpoint /v2/mining/commodities/{name}/price/
                    parts = raw.endpoint.strip("/").split("/")
                    comm_name = parts[-2] if len(parts) >= 2 else "Coal"
                    rows = normalize_commodity_prices(comm_name, raw.payload)
                    count = await upsert_commodity_prices(session, rows)
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})
