"""Routers for Issuers, Fundamental Metrics, and Graph Visualization."""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from gali_api.cache import get_cached_json, make_cache_key, set_cached_json
from gali_api.dependencies import get_db, get_published_run_id, get_redis
from gali_api.schemas.graph import GraphEdge, GraphNode, IssuerGraphResponse
from gali_api.schemas.issuers import IssuerDetail, IssuerSummary, LinkedOperatingEntity
from gali_core.db.models import (
    IdxCompany,
    IssuerMetrics,
    IssuerMiningLink,
    MiningCompany,
    MiningContract,
    MiningLicense,
    MiningSite,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/v1/issuers", tags=["Issuers & Fundamental Analytics"])


@router.get("", response_model=list[IssuerSummary])
async def list_issuers(
    commodity: str | None = Query(None, description="Filter by commodity (e.g. Coal)"),
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> list[IssuerSummary]:
    """List all in-universe issuers with summary ground truth scores, RLI, RBV, and data quality badges."""
    cache_key = make_cache_key("issuers", run_id, "list", {"commodity": commodity})
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return [IssuerSummary.model_validate(item) for item in cached]

    stmt = (
        select(IssuerMetrics, IdxCompany)
        .join(IdxCompany, IssuerMetrics.symbol == IdxCompany.symbol, isouter=True)
        .where(IssuerMetrics.run_id == run_id)
        .order_by(IssuerMetrics.ground_truth_score.desc().nullslast())
    )
    result = await db.execute(stmt)
    rows = result.all()

    items: list[IssuerSummary] = []
    for m, c in rows:
        is_partial = m.symbol in ("PTBA", "DSSA")
        conf = (m.confidence or {}).get("effective_weight", 1.0) * 100.0

        items.append(
            IssuerSummary(
                symbol=m.symbol,
                name=c.name if c else m.symbol,
                sub_sector=c.sub_sector if c else "Coal",
                data_quality="PARSIAL" if is_partial else "LENGKAP",
                ground_truth_score=m.ground_truth_score,
                confidence_pct=round(conf, 1),
                rli_years=m.rli_years,
                reserve_backed_value_usd=m.reserve_backed_value_usd,
                market_cap_idr=float(c.market_cap_idr) if (c and c.market_cap_idr) else None,
                market_cap_usd=m.market_cap_usd,
                rbv_gap_pct=m.rbv_gap_pct,
                license_cliff_3y=m.license_cliff_3y,
                cash_cost_per_ton_usd=m.cash_cost_per_ton_usd,
                top_destination=m.top_destination,
                top_destination_pct=m.top_destination_pct,
            )
        )

    await set_cached_json(redis, cache_key, items, ttl_seconds=3600)
    return items


@router.get("/{symbol}", response_model=IssuerDetail)
async def get_issuer_detail(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> IssuerDetail:
    """Retrieve full fundamental intelligence report for an issuer (M1–M9, linked entities, and audit evidence)."""
    sym = symbol.upper()
    cache_key = make_cache_key("issuers", run_id, f"detail:{sym}", {})
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return IssuerDetail.model_validate(cached)

    # 1. Fetch metrics and company details
    stmt = (
        select(IssuerMetrics, IdxCompany)
        .join(IdxCompany, IssuerMetrics.symbol == IdxCompany.symbol, isouter=True)
        .where(IssuerMetrics.run_id == run_id, IssuerMetrics.symbol == sym)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "ISSUER_NOT_FOUND",
                "message": f"Issuer '{sym}' not found in active metric run",
            },
        )
    m, c = row

    # 2. Fetch linked operating entities
    link_stmt = (
        select(IssuerMiningLink, MiningCompany)
        .join(
            MiningCompany,
            IssuerMiningLink.company_slug == MiningCompany.slug,
            isouter=True,
        )
        .where(IssuerMiningLink.symbol == sym)
    )
    links_res = await db.execute(link_stmt)
    linked_entities = [
        LinkedOperatingEntity(
            company_slug=lnk.company_slug,
            name=comp.name if comp else lnk.company_slug,
            effective_ownership_pct=lnk.effective_ownership_pct,
            confidence=float(lnk.confidence) if lnk.confidence else None,
            method=lnk.method,
        )
        for lnk, comp in links_res.all()
    ]

    is_partial = sym in ("PTBA", "DSSA")

    detail = IssuerDetail(
        symbol=m.symbol,
        name=c.name if c else m.symbol,
        sub_sector=c.sub_sector if c else "Coal",
        as_of=m.as_of,
        run_id=str(m.run_id),
        data_quality="PARSIAL" if is_partial else "LENGKAP",
        # M1
        rli_years=m.rli_years,
        # M2
        implied_life_years=m.implied_life_years,
        reserve_life_gap_years=m.reserve_life_gap_years,
        attributable_gross_profit_usd=m.attributable_gross_profit_usd,
        reserve_backed_value_usd=m.reserve_backed_value_usd,
        market_cap_idr=float(c.market_cap_idr) if (c and c.market_cap_idr) else None,
        market_cap_usd=m.market_cap_usd,
        rbv_gap_pct=m.rbv_gap_pct,
        # M3
        license_cliff_1y=m.license_cliff_1y,
        license_cliff_3y=m.license_cliff_3y,
        license_cliff_5y=m.license_cliff_5y,
        cnc_coverage_pct=m.cnc_coverage_pct,
        weighted_days_to_expiry=m.weighted_days_to_expiry,
        # M4
        cash_cost_per_ton_usd=m.cash_cost_per_ton_usd,
        realized_price_per_ton_usd=m.realized_price_per_ton_usd,
        unit_margin_usd=m.unit_margin_usd,
        breakeven_benchmark_price_usd=m.breakeven_benchmark_price_usd,
        cost_curve_percentile=m.cost_curve_percentile,
        # M5
        weighted_cv_kcal=m.weighted_cv_kcal,
        benchmark_grade=m.benchmark_grade,
        benchmark_price_usd=m.benchmark_price_usd,
        quality_discount_pct=m.quality_discount_pct,
        # M6
        destination_hhi=m.destination_hhi,
        top_destination=m.top_destination,
        top_destination_pct=m.top_destination_pct,
        # M7
        contractor_hhi=m.contractor_hhi,
        contract_cliff_12m=m.contract_cliff_12m,
        # M8
        ground_truth_score=m.ground_truth_score,
        component_scores=m.component_scores or {},
        confidence=m.confidence or {},
        # Provenance
        linked_entities=linked_entities,
        evidence=m.evidence or {},
    )

    await set_cached_json(redis, cache_key, detail, ttl_seconds=3600)
    return detail


@router.get("/{symbol}/graph", response_model=IssuerGraphResponse)
async def get_issuer_graph(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    run_id: str = Depends(get_published_run_id),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> IssuerGraphResponse:
    """Generate interactive node-edge graph connecting listed issuer -> operating subsidiaries -> mining sites -> licenses -> contractors."""
    sym = symbol.upper()
    cache_key = make_cache_key("issuers", run_id, f"graph:{sym}", {})
    cached = await get_cached_json(redis, cache_key)
    if cached:
        return IssuerGraphResponse.model_validate(cached)

    # 1. Fetch links
    links_res = await db.execute(select(IssuerMiningLink).where(IssuerMiningLink.symbol == sym))
    links = links_res.scalars().all()
    if not links:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NO_GRAPH_DATA",
                "message": f"No entity links found for issuer '{sym}'",
            },
        )

    company_slugs = [lnk.company_slug for lnk in links]

    # 2. Fetch sites, licenses, contracts
    sites_res = await db.execute(select(MiningSite).where(MiningSite.company_slug.in_(company_slugs)))
    sites = sites_res.scalars().all()

    lic_res = await db.execute(select(MiningLicense).where(MiningLicense.company_slug.in_(company_slugs)))
    licenses = lic_res.scalars().all()

    cont_res = await db.execute(
        select(MiningContract).where(
            MiningContract.mine_owner_slug.in_(company_slugs) | MiningContract.contractor_slug.in_(company_slugs)
        )
    )
    contracts = cont_res.scalars().all()

    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    seen_nodes: set[str] = set()

    # Issuer Node
    issuer_node_id = f"issuer:{sym}"
    nodes.append(GraphNode(id=issuer_node_id, label=sym, type="issuer", properties={"symbol": sym}))
    seen_nodes.add(issuer_node_id)

    # Operating Companies
    for lnk in links:
        comp_node_id = f"company:{lnk.company_slug}"
        if comp_node_id not in seen_nodes:
            nodes.append(
                GraphNode(
                    id=comp_node_id,
                    label=lnk.company_slug.replace("-", " ").title(),
                    type="operating_company",
                    properties={
                        "company_slug": lnk.company_slug,
                        "ownership_pct": lnk.effective_ownership_pct,
                    },
                )
            )
            seen_nodes.add(comp_node_id)

        edges.append(
            GraphEdge(
                source=issuer_node_id,
                target=comp_node_id,
                label=f"{lnk.effective_ownership_pct:.1f}%",
                weight=lnk.effective_ownership_pct / 100.0,
            )
        )

    # Mining Sites
    for site in sites:
        site_node_id = f"site:{site.slug}"
        if site_node_id not in seen_nodes:
            nodes.append(
                GraphNode(
                    id=site_node_id,
                    label=site.name,
                    type="mining_site",
                    properties={
                        "commodity": site.commodity_type,
                        "province": site.province,
                        "lat": site.latitude,
                        "lon": site.longitude,
                    },
                )
            )
            seen_nodes.add(site_node_id)

        if site.company_slug:
            comp_node_id = f"company:{site.company_slug}"
            edges.append(
                GraphEdge(
                    source=comp_node_id,
                    target=site_node_id,
                    label="operates",
                    weight=1.0,
                )
            )

    # Licenses
    for lic in licenses[:15]:  # Limit top licenses to keep visual graph clean
        lic_node_id = f"license:{lic.wiup_code}"
        if lic_node_id not in seen_nodes:
            nodes.append(
                GraphNode(
                    id=lic_node_id,
                    label=f"WIUP {lic.wiup_code}",
                    type="license",
                    properties={
                        "area_ha": lic.licensed_area_ha,
                        "expiry": str(lic.license_expiry_date),
                        "cnc": lic.cnc,
                    },
                )
            )
            seen_nodes.add(lic_node_id)

        if lic.company_slug:
            edges.append(
                GraphEdge(
                    source=f"company:{lic.company_slug}",
                    target=lic_node_id,
                    label="holds license",
                    weight=1.0,
                )
            )

    # Contractors
    for cont in contracts[:10]:
        cont_node_id = f"contractor:{cont.contractor_slug}"
        if cont_node_id not in seen_nodes:
            nodes.append(
                GraphNode(
                    id=cont_node_id,
                    label=cont.contractor_name or cont.contractor_slug.replace("-", " ").title(),
                    type="contractor",
                    properties={"contractor_slug": cont.contractor_slug},
                )
            )
            seen_nodes.add(cont_node_id)

        edges.append(
            GraphEdge(
                source=f"company:{cont.mine_owner_slug}",
                target=cont_node_id,
                label="mining contractor",
                weight=1.0,
            )
        )

    response = IssuerGraphResponse(symbol=sym, nodes=nodes, edges=edges)
    await set_cached_json(redis, cache_key, response, ttl_seconds=3600)
    return response
