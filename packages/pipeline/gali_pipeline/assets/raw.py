"""Software-Defined Assets for raw tier ingestion."""

import asyncio

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
    """Fetch and cache commodities and prices."""

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
