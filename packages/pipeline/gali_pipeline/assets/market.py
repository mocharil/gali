"""Software-Defined Assets for market tier normalization."""

import asyncio

from dagster import AssetExecutionContext, MaterializeResult, asset
from gali_core.db.models import RawResponse
from gali_core.normalize.market_normalizer import (
    normalize_idx_companies,
    upsert_idx_companies,
)
from sqlalchemy import select

from gali_pipeline.resources import DbResource


@asset(group_name="market", compute_kind="sql_upsert", deps=["raw_companies_screener"])
def market_idx_companies(context: AssetExecutionContext, db: DbResource) -> MaterializeResult:
    """Normalize raw company screener responses into market.idx_company."""

    async def _run() -> int:
        total_upserted = 0
        async with db.get_session() as session, session.begin():
            res = await session.execute(
                select(RawResponse)
                .where(
                    RawResponse.endpoint == "/v2/companies/",
                    RawResponse.status_code == 200,
                )
                .order_by(RawResponse.fetched_at.asc())
            )

            raw_rows = res.scalars().all()
            for raw in raw_rows:
                if raw.payload:
                    rows = normalize_idx_companies(raw.payload)
                    count = await upsert_idx_companies(session, rows)
                    total_upserted += count
        return total_upserted

    count = asyncio.run(_run())
    return MaterializeResult(metadata={"upserted_rows": count})
