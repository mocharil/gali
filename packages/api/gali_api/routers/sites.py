"""Routers for Mining Sites and Geospatial GeoJSON API."""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from gali_api.cache import get_cached_json, make_cache_key, set_cached_json
from gali_api.dependencies import get_db, get_published_run_id, get_redis
from gali_api.schemas.sites import (
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    GeoJSONGeometry,
    MiningSiteProperties,
)
from gali_core.db.models import (
    IssuerMiningLink,
    MiningCompany,
    MiningSite,
    MiningSiteProduction,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/v1/sites", tags=["Mining Sites & Geospatial Map"])


@router.get("", response_model=GeoJSONFeatureCollection)
async def get_mining_sites_geojson(
    commodity: str | None = Query(None, description="Filter by commodity (e.g. Coal)"),
    issuer: str | None = Query(None, description="Filter by ticker symbol (e.g. ADRO, AADI)"),
    in_universe_only: bool = Query(True, description="Filter sites belonging to in-universe issuers"),
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> GeoJSONFeatureCollection:
    """Retrieve verified mining concession sites as an RFC 7946 GeoJSON FeatureCollection."""
    cache_key = make_cache_key(
        "sites",
        run_id,
        "geojson",
        {"commodity": commodity, "issuer": issuer, "in_universe": in_universe_only},
    )
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return GeoJSONFeatureCollection.model_validate(cached)

    # 1. Build query for sites with valid GPS coordinates
    stmt = (
        select(MiningSite, MiningCompany)
        .join(MiningCompany, MiningSite.company_slug == MiningCompany.slug, isouter=True)
        .where(MiningSite.latitude.is_not(None), MiningSite.longitude.is_not(None))
    )
    if commodity:
        stmt = stmt.where(MiningSite.commodity_type.ilike(f"%{commodity}%"))

    site_rows = (await db.execute(stmt)).all()

    # 2. Fetch in-universe links
    link_stmt = select(IssuerMiningLink)
    if issuer:
        link_stmt = link_stmt.where(IssuerMiningLink.symbol == issuer.upper())
    links = (await db.execute(link_stmt)).scalars().all()

    company_to_issuer: dict[str, str] = {lnk.company_slug: lnk.symbol for lnk in links}

    # 3. Fetch latest production volumes
    prod_stmt = select(MiningSiteProduction)
    prod_rows = (await db.execute(prod_stmt)).scalars().all()
    site_prod_map: dict[str, float] = {p.site_slug: float(p.production_volume or 0.0) for p in prod_rows}

    features: list[GeoJSONFeature] = []

    for site, comp in site_rows:
        sym = company_to_issuer.get(site.company_slug) if site.company_slug else None
        is_in_universe = sym is not None

        if in_universe_only and not is_in_universe:
            continue
        if issuer and sym != issuer.upper():
            continue

        feature = GeoJSONFeature(
            id=site.slug,
            geometry=GeoJSONGeometry(
                type="Point",
                coordinates=[
                    float(site.longitude),
                    float(site.latitude),
                ],  # RFC 7946: [lon, lat]
            ),
            properties=MiningSiteProperties(
                slug=site.slug,
                name=site.name,
                commodity=site.commodity_type,
                company_slug=site.company_slug,
                company_name=comp.name if comp else (site.company_slug or "").replace("-", " ").title(),
                issuer_symbol=sym,
                province=site.province,
                city=site.city,
                project_name=site.project_name,
                production_volume_mt=site_prod_map.get(site.slug),
                is_in_universe=is_in_universe,
            ),
        )
        features.append(feature)

    collection = GeoJSONFeatureCollection(
        type="FeatureCollection",
        features=features,
        total_features=len(features),
    )

    await set_cached_json(redis, cache_key, collection, ttl_seconds=3600)
    return collection
