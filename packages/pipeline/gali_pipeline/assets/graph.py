"""Software-Defined Assets for entity resolution and graph closure."""

import asyncio

from dagster import AssetExecutionContext, MaterializeResult, asset
from gali_core.graph.ownership import (
    backfill_license_company_slugs,
    build_and_persist_ownership_graph,
)

from gali_pipeline.resources import DbResource


@asset(group_name="graph", compute_kind="graph_closure", deps=["core_mining_companies"])
def graph_ownership_structure(context: AssetExecutionContext, db: DbResource) -> MaterializeResult:
    """Resolve transitive ownership graph and emit graph.ownership_edge, graph.issuer, graph.issuer_mining_link."""

    async def _run() -> tuple[int, int, int]:
        async with db.get_session() as session, session.begin():
            return await build_and_persist_ownership_graph(session)

    edges, links, issuers = asyncio.run(_run())
    return MaterializeResult(
        metadata={
            "ownership_edges": edges,
            "issuer_mining_links": links,
            "issuers_in_universe": issuers,
        }
    )


@asset(
    group_name="graph",
    compute_kind="fuzzy_matching",
    deps=["core_mining_licenses", "core_mining_companies"],
)
def graph_license_backfill(context: AssetExecutionContext, db: DbResource) -> MaterializeResult:
    """Backfill core.mining_license.company_slug using trigram fuzzy matching."""

    async def _run() -> int:
        async with db.get_session() as session, session.begin():
            return await backfill_license_company_slugs(session)

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"backfilled_licenses": count})
