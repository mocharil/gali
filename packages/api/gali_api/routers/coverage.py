"""Routers for Data Truth Audit and Coverage Transparency.

Every number here is derived live from the database -- this is the "honesty page"
(BUILD_PLAN.md task 6.11), so it is the last place that should ever show a stale
or hardcoded figure.
"""

from __future__ import annotations

import datetime as dt

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from gali_api.cache import get_cached_json, make_cache_key, set_cached_json
from gali_api.dependencies import get_db, get_published_run_id, get_redis
from gali_api.derive import data_quality_label
from gali_api.schemas.coverage import CoverageItem, DataCoverageResponse
from gali_core.config import GATE_DECISION, IN_UNIVERSE_SYMBOLS
from gali_core.db.models import (
    CreditLedger,
    IdxCompany,
    IssuerMetrics,
    IssuerMiningLink,
    MiningLicense,
    MiningSite,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/v1/coverage", tags=["Data Truth & Coverage Audit"])


@router.get("", response_model=DataCoverageResponse)
async def get_data_coverage_report(
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> DataCoverageResponse:
    """Retrieve full audit metrics detailing database coverage, entity resolution rates, and GPS coordinates completeness."""
    cache_key = make_cache_key("coverage", run_id, "report", {})
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return DataCoverageResponse.model_validate(cached)

    # 1. Total credits used -- if the ledger is genuinely empty this must read 0,
    # never a stale placeholder from an earlier manual audit.
    cred_stmt = select(func.sum(CreditLedger.credits))
    total_credits = int((await db.execute(cred_stmt)).scalar_one_or_none() or 0)

    # 2. In-universe sites with GPS
    link_stmt = select(IssuerMiningLink.company_slug).where(IssuerMiningLink.symbol.in_(IN_UNIVERSE_SYMBOLS))
    in_univ_slugs = (await db.execute(link_stmt)).scalars().all()

    in_univ_sites_stmt = select(
        func.count().label("total"),
        func.count(MiningSite.latitude).label("with_gps"),
    ).where(MiningSite.company_slug.in_(in_univ_slugs))
    in_univ_site_counts = (await db.execute(in_univ_sites_stmt)).first()
    num_gps = in_univ_site_counts.with_gps if in_univ_site_counts else 0
    den_gps = in_univ_site_counts.total if in_univ_site_counts else 0

    # 3. Overall national site GPS
    all_sites_stmt = select(
        func.count().label("total"),
        func.count(MiningSite.latitude).label("with_gps"),
    )
    all_site_counts = (await db.execute(all_sites_stmt)).first()
    all_num_gps = all_site_counts.with_gps if all_site_counts else 0
    all_den_gps = all_site_counts.total if all_site_counts else 0

    # 4. Licenses linked to a company
    lic_stmt = select(
        func.count().label("total"),
        func.count(MiningLicense.company_slug).label("linked"),
    )
    lic_counts = (await db.execute(lic_stmt)).first()
    lic_num = lic_counts.linked if lic_counts else 0
    lic_den = lic_counts.total if lic_counts else 0

    # 5. Issuer universe completeness -- driven by the same confidence.is_complete
    # signal the issuer endpoints use, not a hardcoded symbol list.
    issuer_stmt = (
        select(IssuerMetrics, IdxCompany)
        .join(IdxCompany, IssuerMetrics.symbol == IdxCompany.symbol, isouter=True)
        .where(IssuerMetrics.run_id == run_id, IssuerMetrics.symbol.in_(IN_UNIVERSE_SYMBOLS))
        .order_by(IssuerMetrics.symbol)
    )
    issuer_rows = (await db.execute(issuer_stmt)).all()
    in_univ_list = [
        {
            "symbol": m.symbol,
            "name": c.name if c else m.symbol,
            "quality": data_quality_label(
                rli_years=m.rli_years,
                reserve_backed_value_usd=m.reserve_backed_value_usd,
                cash_cost_per_ton_usd=m.cash_cost_per_ton_usd,
            ),
        }
        for m, c in issuer_rows
    ]
    complete_count = sum(1 for row in in_univ_list if row["quality"] == "LENGKAP")

    def pct(num: int, den: int) -> float:
        return round((num / den * 100.0) if den > 0 else 0.0, 1)

    metrics = [
        CoverageItem(
            layer="geospatial",
            entity="In-Universe Mining Sites GPS",
            numerator=num_gps,
            denominator=den_gps,
            coverage_pct=pct(num_gps, den_gps),
            description="Concession sites linked to in-universe issuers with verified lat/long",
        ),
        CoverageItem(
            layer="geospatial",
            entity="National Mining Sites GPS",
            numerator=all_num_gps,
            denominator=all_den_gps,
            coverage_pct=pct(all_num_gps, all_den_gps),
            description="Overall national mining concession sites with GPS coordinates",
        ),
        CoverageItem(
            layer="licenses",
            entity="Mining Concession Licenses (IUP/IUPK)",
            numerator=lic_num,
            denominator=lic_den,
            coverage_pct=pct(lic_num, lic_den),
            description="Licenses linked to registered operating companies via fuzzy matching",
        ),
        CoverageItem(
            layer="issuers",
            entity="In-Universe Issuer Completeness",
            numerator=complete_count,
            denominator=len(in_univ_list),
            coverage_pct=pct(complete_count, len(in_univ_list)),
            description=(
                f"{complete_count} complete issuer(s) "
                f"({', '.join(r['symbol'] for r in in_univ_list if r['quality'] == 'LENGKAP')}) + "
                f"{len(in_univ_list) - complete_count} partial "
                f"({', '.join(r['symbol'] for r in in_univ_list if r['quality'] != 'LENGKAP')})"
            ),
        ),
    ]

    response = DataCoverageResponse(
        gate_decision=GATE_DECISION,
        updated_at=dt.datetime.now(dt.UTC),
        credits_used=total_credits,
        credits_cap=1000,
        metrics=metrics,
        in_universe_issuers=in_univ_list,
    )

    await set_cached_json(redis, cache_key, response, ttl_seconds=3600)
    return response
