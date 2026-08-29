"""Software-Defined Assets for M1-M9 metric calculation and publishing."""

import asyncio
import uuid

from dagster import AssetExecutionContext, MaterializeResult, asset
from gali_core.metrics.engine import run_metric_pipeline

from gali_pipeline.resources import DbResource


@asset(
    group_name="metrics",
    compute_kind="metrics_engine",
    deps=[
        "graph_ownership_structure",
        "core_company_performance",
        "core_company_financials",
        "core_commodity_prices",
        "core_sales_destinations",
        "core_mining_contracts",
    ],
)
def metric_run_all(context: AssetExecutionContext, db: DbResource) -> MaterializeResult:
    """Calculate M1-M9 metrics, enforce sanity checks, and publish Blue/Green pointer."""

    async def _run() -> uuid.UUID:
        async with db.get_session() as session:
            return await run_metric_pipeline(session)

    run_id = asyncio.run(_run())
    return MaterializeResult(
        metadata={
            "published_run_id": str(run_id),
            "status": "published",
        }
    )
