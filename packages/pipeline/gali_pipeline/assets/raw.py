"""Software-Defined Assets for raw tier ingestion."""

import asyncio
from typing import Any

from dagster import AssetExecutionContext, MaterializeResult, asset

from gali_pipeline.resources import SectorsResource


@asset(group_name="raw", compute_kind="sectors_api")
def raw_mining_companies(context: AssetExecutionContext, sectors: SectorsResource) -> MaterializeResult:
    """Fetch and cache all mining companies from /v2/mining/companies/."""

    async def _fetch() -> int:
        client = sectors.get_client()
        try:
            offset = 0
            limit = 30
            total = 0
            while True:
                res = await client.get(
                    endpoint="/v2/mining/companies/",
                    params={"limit": limit, "offset": offset},
                    tier="cold",
                    credit_cost=1,
                    run_id="dagster_ingest",
                )
                items = res.get("results", []) if isinstance(res, dict) else (res if isinstance(res, list) else [])
                if not items:
                    break
                total += len(items)
                has_next = res.get("pagination", {}).get("has_next", False) if isinstance(res, dict) else False
                if not has_next or len(items) < limit:
                    break
                offset += limit
            return total
        finally:
            await client.close()

    count = asyncio.run(_fetch())
    return MaterializeResult(metadata={"total_companies": count})


@asset(group_name="raw", compute_kind="sectors_api")
def raw_mining_sites(context: AssetExecutionContext, sectors: SectorsResource) -> MaterializeResult:
    """Fetch and cache all mining sites from /v2/mining/sites/."""

    async def _fetch() -> int:
        client = sectors.get_client()
        try:
            offset = 0
            limit = 30
            total = 0
            while True:
                res = await client.get(
                    endpoint="/v2/mining/sites/",
                    params={"limit": limit, "offset": offset},
                    tier="cold",
                    credit_cost=1,
                    run_id="dagster_ingest",
                )
                items = res.get("results", []) if isinstance(res, dict) else (res if isinstance(res, list) else [])
                if not items:
                    break
                total += len(items)
                has_next = res.get("pagination", {}).get("has_next", False) if isinstance(res, dict) else False
                if not has_next or len(items) < limit:
                    break
                offset += limit
            return total
        finally:
            await client.close()

    count = asyncio.run(_fetch())
    return MaterializeResult(metadata={"total_sites": count})


@asset(group_name="raw", compute_kind="sectors_api")
def raw_mining_contracts(context: AssetExecutionContext, sectors: SectorsResource) -> MaterializeResult:
    """Fetch and cache all mining contracts from /v2/mining/contracts/."""

    async def _fetch() -> int:
        client = sectors.get_client()
        try:
            res = await client.get(
                endpoint="/v2/mining/contracts/",
                tier="cold",
                credit_cost=1,
                run_id="dagster_ingest",
            )
            items = res if isinstance(res, list) else (res.get("results", []) if isinstance(res, dict) else [])
            return len(items)
        finally:
            await client.close()

    count = asyncio.run(_fetch())
    return MaterializeResult(metadata={"total_contracts": count})


@asset(group_name="raw", compute_kind="sectors_api")
def raw_mining_commodities(context: AssetExecutionContext, sectors: SectorsResource) -> MaterializeResult:
    """Fetch and cache commodities list from /v2/mining/commodities/."""

    async def _fetch() -> int:
        client = sectors.get_client()
        try:
            res = await client.get(
                endpoint="/v2/mining/commodities/",
                tier="cold",
                credit_cost=1,
                run_id="dagster_ingest",
            )
            items = res if isinstance(res, list) else (res.get("results", []) if isinstance(res, dict) else [])
            return len(items)
        finally:
            await client.close()

    count = asyncio.run(_fetch())
    return MaterializeResult(metadata={"total_commodities": count})


@asset(group_name="raw", compute_kind="sectors_api")
def raw_mining_commodity_prices(context: AssetExecutionContext, sectors: SectorsResource) -> MaterializeResult:
    """Fetch and cache monthly commodity benchmark price histories from /v2/mining/commodities/{name}/price/."""

    async def _fetch() -> int:
        client = sectors.get_client()
        try:
            commodities = ["Coal", "Coal (HBA 1)", "Coal (HBA 2)", "Coal (HBA 3)"]
            total = 0
            for name in commodities:
                res = await client.get(
                    endpoint=f"/v2/mining/commodities/{name}/price/",
                    tier="hot",
                    credit_cost=1,
                    run_id="dagster_ingest",
                )
                raw_data = res.get("results", res.get("data", [])) if isinstance(res, dict) else res
                items: list[Any] = raw_data if isinstance(raw_data, list) else []
                total += len(items)
            return total

        finally:
            await client.close()

    count = asyncio.run(_fetch())
    return MaterializeResult(metadata={"total_prices": count})


@asset(group_name="raw", compute_kind="sectors_api")
def raw_companies_screener(context: AssetExecutionContext, sectors: SectorsResource) -> MaterializeResult:
    """Fetch structured market cap and metadata for in-universe IDX tickers from /v2/companies/."""

    async def _fetch() -> int:
        from gali_core.config import IN_UNIVERSE_SYMBOLS

        client = sectors.get_client()
        try:
            symbols = [f"{s}.JK" for s in IN_UNIVERSE_SYMBOLS]
            where_clause = " or ".join([f"symbol = '{s}'" for s in symbols])
            params = {
                "where": where_clause,
                "include_query_values": "true",
                "order_by": "-market_cap",
            }
            res = await client.get(
                endpoint="/v2/companies/",
                params=params,
                tier="hot",
                credit_cost=1,
                run_id="dagster_ingest",
            )
            items = res.get("results", []) if isinstance(res, dict) else (res if isinstance(res, list) else [])
            return len(items)
        finally:
            await client.close()

    count = asyncio.run(_fetch())
    return MaterializeResult(metadata={"total_companies": count})
