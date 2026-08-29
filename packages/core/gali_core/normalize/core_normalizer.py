"""Normalizer engine: transforms raw.responses JSONB payloads into core.* tables.

All normalizer functions are pure, deterministic, and idempotent.
Database persistence uses PostgreSQL ON CONFLICT DO UPDATE upserts.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import delete, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from gali_core.db.models import (
    CommodityPrice,
    CompanyFinancials,
    CompanyPerformance,
    CompanyProduct,
    MiningCompany,
    MiningContract,
    MiningLicense,
    MiningSite,
    MiningSiteProduction,
    SalesDestination,
)


def parse_date_safe(val: Any) -> dt.date | None:
    """Parse date string (YYYY-MM-DD or ISO) safely."""
    if not val or not isinstance(val, str):
        return None
    val_str = val.strip()
    if not val_str or val_str.lower() in ("null", "none", "-"):
        return None
    try:
        if len(val_str) >= 10:
            return dt.date.fromisoformat(val_str[:10])
    except ValueError:
        return None
    return None


def parse_float_safe(val: Any) -> float | None:
    """Parse numeric values safely."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = val.replace(",", "").replace("$", "").strip()
        if not cleaned or cleaned.lower() in ("null", "none", "-"):
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def normalize_mining_companies(payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/mining/companies/ payload to MiningCompany rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, dict):
        raw_items = payload.get("results", payload.get("data", []))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
    elif isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]

    rows: list[dict[str, Any]] = []
    for item in items:
        slug = item.get("slug")
        name = item.get("name") or item.get("company_name")
        if not slug or not name:
            continue

        sym = item.get("symbol")
        clean_sym = str(sym).strip().upper() if sym else None
        c_types = item.get("commodity_type") or item.get("commodity") or []
        if isinstance(c_types, str):
            c_types_list = [c_types]
        elif isinstance(c_types, list):
            c_types_list = [str(x) for x in c_types if x]
        else:
            c_types_list = []

        rows.append(
            {
                "slug": str(slug).strip(),
                "name": str(name).strip(),
                "symbol": clean_sym,
                "company_type": item.get("company_type"),
                "key_operation": item.get("key_operation"),
                "commodity_types": c_types_list,
            }
        )
    return rows


def normalize_mining_sites(payload: dict | list) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Normalize /v2/mining/sites/ payload to MiningSite and MiningSiteProduction rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, dict):
        raw_items = payload.get("results", payload.get("data", []))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
    elif isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]

    site_rows: list[dict[str, Any]] = []
    prod_rows: list[dict[str, Any]] = []

    for item in items:
        slug = item.get("slug")
        name = item.get("name") or slug
        if not slug or not name:
            continue

        site_slug = str(slug).strip()
        site_rows.append(
            {
                "slug": site_slug,
                "name": str(name).strip(),
                "project_name": item.get("project_name"),
                "company_slug": item.get("company_slug"),
                "company_name": item.get("company_name"),
                "commodity_type": item.get("commodity_type"),
                "province": item.get("province"),
                "city": item.get("city"),
                "latitude": parse_float_safe(item.get("latitude")),
                "longitude": parse_float_safe(item.get("longitude")),
            }
        )

        year = item.get("year")
        prod = parse_float_safe(item.get("production_volume"))
        sr = parse_float_safe(item.get("strip_ratio"))
        if year is not None and isinstance(year, int):
            prod_rows.append(
                {
                    "site_slug": site_slug,
                    "year": year,
                    "production_volume": prod,
                    "unit": item.get("unit") or "Mt",
                    "strip_ratio": sr,
                }
            )

    return site_rows, prod_rows


def normalize_mining_licenses(payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/mining/licenses/ payload to MiningLicense rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, dict):
        raw_items = payload.get("results", payload.get("data", []))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
    elif isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]

    rows: list[dict[str, Any]] = []
    for item in items:
        wiup = item.get("wiup_code")
        if not wiup:
            continue

        rows.append(
            {
                "wiup_code": str(wiup).strip(),
                "license_number": item.get("license_number"),
                "license_type": item.get("license_type"),
                "province": item.get("province"),
                "city": item.get("city"),
                "license_effective_date": parse_date_safe(item.get("license_effective_date")),
                "license_expiry_date": parse_date_safe(item.get("license_expiry_date")),
                "activity": item.get("activity"),
                "licensed_area_ha": parse_float_safe(item.get("licensed_area_ha")),
                "location": item.get("location"),
                "commodity_type": item.get("commodity_type"),
                "company_name": item.get("company_name"),
                "cnc": item.get("cnc"),
                "generation": item.get("generation"),
                "company_slug": item.get("company_slug"),
                "match_confidence": parse_float_safe(item.get("match_confidence")),
                "match_method": item.get("match_method"),
            }
        )
    return rows


def normalize_mining_contracts(payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/mining/contracts/ payload to MiningContract rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]
    elif isinstance(payload, dict):
        raw_items = payload.get("results", payload.get("data", []))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]

    rows: list[dict[str, Any]] = []
    for item in items:
        owner = item.get("mine_owner_slug") or item.get("owner_slug")
        contractor = item.get("contractor_slug")
        if not owner or not contractor:
            continue

        rows.append(
            {
                "mine_owner_slug": str(owner).strip(),
                "contractor_slug": str(contractor).strip(),
                "mine_owner_name": item.get("mine_owner_name") or item.get("owner_name"),
                "contractor_name": item.get("contractor_name"),
                "contract_period_end": parse_date_safe(item.get("contract_period_end")),
            }
        )
    return rows


def normalize_company_performance(
    company_slug: str, payload: dict | list
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Normalize /v2/mining/companies/performance/{slug}/ to CompanyPerformance and CompanyProduct."""
    perf_rows: list[dict[str, Any]] = []
    product_rows: list[dict[str, Any]] = []

    records: list[dict[str, Any]] = []
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list):
            records = [x for x in data if isinstance(x, dict)]
        elif isinstance(data, dict):
            records = [data]
        elif "year" in payload:
            records = [payload]
    elif isinstance(payload, list):
        records = [x for x in payload if isinstance(x, dict)]

    for rec in records:
        year = rec.get("year")
        if year is None or not isinstance(year, int):
            continue

        comm_type = str(rec.get("commodity_type") or "Coal")
        stats = rec.get("commodity_stats", rec)
        if not isinstance(stats, dict):
            stats = {}

        reserves = stats.get("resources_reserves")
        if not isinstance(reserves, dict):
            reserves = {}

        perf_rows.append(
            {
                "company_slug": company_slug,
                "year": year,
                "commodity_type": comm_type,
                "commodity_sub_type": rec.get("commodity_sub_type"),
                "mining_operation_status": stats.get("mining_operation_status"),
                "unit": stats.get("unit") or "Mt",
                "production_volume": parse_float_safe(stats.get("production_volume")),
                "sales_volume": parse_float_safe(stats.get("sales_volume")),
                "overburden_removal_volume": parse_float_safe(stats.get("overburden_removal_volume")),
                "strip_ratio": parse_float_safe(stats.get("strip_ratio")),
                "measurement_year": reserves.get("measurement_year") or year,
                "proven_reserves_mt": parse_float_safe(reserves.get("proven_reserves_Mt")),
                "probable_reserves_mt": parse_float_safe(reserves.get("probable_reserves_Mt")),
                "total_reserves_mt": parse_float_safe(
                    reserves.get("total_reserves_Mt") or reserves.get("total_reserves")
                ),
                "measured_resources_mt": parse_float_safe(reserves.get("measured_resources_Mt")),
                "indicated_resources_mt": parse_float_safe(reserves.get("indicated_resources_Mt")),
                "inferred_resources_mt": parse_float_safe(reserves.get("inferred_resources_Mt")),
                "total_resources_mt": parse_float_safe(
                    reserves.get("total_resources_Mt") or reserves.get("total_resources")
                ),
            }
        )

        products = stats.get("products", [])
        if isinstance(products, list):
            for prod in products:
                if not isinstance(prod, dict):
                    continue
                p_name = prod.get("product_name") or "Standard"
                cv = prod.get("calorific_value_kcal") or {}
                moist = prod.get("total_moisture_pct") or {}
                ash = prod.get("ash_content_adb") or {}
                sulphur = prod.get("total_sulphur_adb") or {}
                vm = prod.get("volatile_matter_adb") or {}

                product_rows.append(
                    {
                        "company_slug": company_slug,
                        "year": year,
                        "product_name": str(p_name),
                        "cv_kcal_min": parse_float_safe(cv.get("min") if isinstance(cv, dict) else None),
                        "cv_kcal_max": parse_float_safe(cv.get("max") if isinstance(cv, dict) else None),
                        "moisture_pct_min": parse_float_safe(moist.get("min") if isinstance(moist, dict) else None),
                        "moisture_pct_max": parse_float_safe(moist.get("max") if isinstance(moist, dict) else None),
                        "ash_adb_min": parse_float_safe(ash.get("min") if isinstance(ash, dict) else None),
                        "ash_adb_max": parse_float_safe(ash.get("max") if isinstance(ash, dict) else None),
                        "sulphur_adb_min": parse_float_safe(sulphur.get("min") if isinstance(sulphur, dict) else None),
                        "sulphur_adb_max": parse_float_safe(sulphur.get("max") if isinstance(sulphur, dict) else None),
                        "volatile_matter_adb_min": parse_float_safe(vm.get("min") if isinstance(vm, dict) else None),
                        "volatile_matter_adb_max": parse_float_safe(vm.get("max") if isinstance(vm, dict) else None),
                    }
                )

    return perf_rows, product_rows


def normalize_company_financials(company_slug: str, payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/mining/companies/financials/{slug}/ to CompanyFinancials rows."""
    records: list[dict[str, Any]] = []
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list):
            records = [x for x in data if isinstance(x, dict)]
        elif isinstance(data, dict):
            records = [data]
        elif "year" in payload:
            records = [payload]
    elif isinstance(payload, list):
        records = [x for x in payload if isinstance(x, dict)]

    rows: list[dict[str, Any]] = []
    for rec in records:
        year = rec.get("year")
        if year is None or not isinstance(year, int):
            continue

        sym = rec.get("symbol")
        clean_sym = str(sym).replace(".JK", "").strip().upper() if sym else None

        rows.append(
            {
                "company_slug": company_slug,
                "year": year,
                "symbol": clean_sym,
                "assets_usd": parse_float_safe(rec.get("assets_usd")),
                "revenue_usd": parse_float_safe(rec.get("revenue_usd") or rec.get("mining_revenue_usd")),
                "revenue_breakdown": rec.get("revenue_breakdown")
                if isinstance(rec.get("revenue_breakdown"), dict)
                else None,
                "cost_of_revenue_usd": parse_float_safe(rec.get("cost_of_revenue_usd") or rec.get("cash_cost_usd")),
                "cost_of_revenue_breakdown": rec.get("cost_of_revenue_breakdown")
                if isinstance(rec.get("cost_of_revenue_breakdown"), dict)
                else None,
                "profit_usd": parse_float_safe(rec.get("net_profit_usd") or rec.get("profit_usd")),
            }
        )
    return rows


def normalize_sales_destinations(company_slug: str, payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/mining/sales-destination/{slug}/ to SalesDestination rows."""
    rows: list[dict[str, Any]] = []
    if not isinstance(payload, dict):
        return rows

    year = payload.get("year", 2024)
    data = payload.get("data", payload)
    if not isinstance(data, dict):
        return rows

    for country, stats in data.items():
        if not isinstance(stats, dict):
            continue

        rows.append(
            {
                "company_slug": company_slug,
                "year": year,
                "country": str(country),
                "commodity_type": stats.get("commodity_type") or "Coal",
                "unit": stats.get("unit") or "Mt",
                "revenue_usd": parse_float_safe(stats.get("revenue_usd")),
                "pct_of_total_revenue": parse_float_safe(stats.get("percentage_of_total_revenue")),
                "volume": parse_float_safe(stats.get("volume")),
                "pct_of_sales_volume": parse_float_safe(stats.get("percentage_of_sales_volume")),
            }
        )
    return rows


def normalize_commodity_prices(commodity: str, payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/mining/commodities/{name}/price/ to CommodityPrice rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]
    elif isinstance(payload, dict):
        raw_items = payload.get("data", payload.get("results", []))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
        elif "date" in payload:
            items = [payload]

    rows: list[dict[str, Any]] = []
    for item in items:
        d = parse_date_safe(item.get("date") or item.get("observed_on") or item.get("datetime"))
        p = None
        for k in ("price_usd_per_ton", "price_usd_per_oz", "price_usd_per_bbl", "price_usd", "price", "close"):
            if k in item and item[k] is not None:
                p = parse_float_safe(item[k])
                if p is not None:
                    break
        if d is None or p is None:
            continue

        comm_name = item.get("name") or commodity
        unit = "USD/ton"
        if "price_usd_per_oz" in item:
            unit = "USD/oz"
        elif item.get("unit"):
            unit = str(item["unit"])

        rows.append(
            {
                "commodity": str(comm_name).strip(),
                "observed_on": d,
                "price": p,
                "unit": unit,
            }
        )
    return rows


# =============================================================================
# Database Upsert Helpers
# =============================================================================


async def upsert_mining_companies(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert MiningCompany rows."""
    if not rows:
        return 0
    # Deduplicate in-batch by slug
    dedup: dict[str, dict[str, Any]] = {r["slug"]: r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(MiningCompany).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["slug"],
        set_={
            "name": stmt.excluded.name,
            "symbol": stmt.excluded.symbol,
            "company_type": stmt.excluded.company_type,
            "key_operation": stmt.excluded.key_operation,
            "commodity_types": stmt.excluded.commodity_types,
        },
    )
    await session.execute(stmt)
    return len(unique_rows)


async def upsert_mining_sites(
    session: AsyncSession, site_rows: list[dict[str, Any]], prod_rows: list[dict[str, Any]]
) -> int:
    """Idempotently upsert MiningSite and MiningSiteProduction rows."""
    count = 0
    if site_rows:
        dedup_sites: dict[str, dict[str, Any]] = {r["slug"]: r for r in site_rows}
        unique_sites = list(dedup_sites.values())

        stmt_site = insert(MiningSite).values(unique_sites)
        stmt_site = stmt_site.on_conflict_do_update(
            index_elements=["slug"],
            set_={
                "name": stmt_site.excluded.name,
                "project_name": stmt_site.excluded.project_name,
                "company_slug": stmt_site.excluded.company_slug,
                "company_name": stmt_site.excluded.company_name,
                "commodity_type": stmt_site.excluded.commodity_type,
                "province": stmt_site.excluded.province,
                "city": stmt_site.excluded.city,
                "latitude": stmt_site.excluded.latitude,
                "longitude": stmt_site.excluded.longitude,
            },
        )
        await session.execute(stmt_site)
        count += len(unique_sites)

    if prod_rows:
        dedup_prod: dict[tuple[str, int], dict[str, Any]] = {(r["site_slug"], r["year"]): r for r in prod_rows}
        unique_prod = list(dedup_prod.values())

        stmt_prod = insert(MiningSiteProduction).values(unique_prod)
        stmt_prod = stmt_prod.on_conflict_do_update(
            index_elements=["site_slug", "year"],
            set_={
                "production_volume": stmt_prod.excluded.production_volume,
                "unit": stmt_prod.excluded.unit,
                "strip_ratio": stmt_prod.excluded.strip_ratio,
            },
        )
        await session.execute(stmt_prod)
        count += len(unique_prod)

    return count


async def upsert_mining_licenses(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert MiningLicense rows."""
    if not rows:
        return 0
    dedup: dict[str, dict[str, Any]] = {r["wiup_code"]: r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(MiningLicense).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["wiup_code"],
        set_={
            "license_number": stmt.excluded.license_number,
            "license_type": stmt.excluded.license_type,
            "province": stmt.excluded.province,
            "city": stmt.excluded.city,
            "license_effective_date": stmt.excluded.license_effective_date,
            "license_expiry_date": stmt.excluded.license_expiry_date,
            "activity": stmt.excluded.activity,
            "licensed_area_ha": stmt.excluded.licensed_area_ha,
            "location": stmt.excluded.location,
            "commodity_type": stmt.excluded.commodity_type,
            "company_name": stmt.excluded.company_name,
            "cnc": stmt.excluded.cnc,
            "generation": stmt.excluded.generation,
            "company_slug": stmt.excluded.company_slug,
            "match_confidence": stmt.excluded.match_confidence,
            "match_method": stmt.excluded.match_method,
        },
    )
    await session.execute(stmt)
    return len(unique_rows)


async def upsert_mining_contracts(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert MiningContract rows."""
    if not rows:
        return 0
    dedup: dict[tuple[str, str], dict[str, Any]] = {(r["mine_owner_slug"], r["contractor_slug"]): r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(MiningContract).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["mine_owner_slug", "contractor_slug"],
        set_={
            "mine_owner_name": stmt.excluded.mine_owner_name,
            "contractor_name": stmt.excluded.contractor_name,
            "contract_period_end": stmt.excluded.contract_period_end,
        },
    )
    await session.execute(stmt)
    return len(unique_rows)


async def upsert_company_performance(
    session: AsyncSession, perf_rows: list[dict[str, Any]], product_rows: list[dict[str, Any]]
) -> int:
    """Idempotently upsert CompanyPerformance and CompanyProduct rows."""
    count = 0
    if perf_rows:
        dedup_perf: dict[tuple[str, int, str], dict[str, Any]] = {
            (r["company_slug"], r["year"], r["commodity_type"]): r for r in perf_rows
        }
        unique_perf = list(dedup_perf.values())

        stmt_perf = insert(CompanyPerformance).values(unique_perf)
        stmt_perf = stmt_perf.on_conflict_do_update(
            index_elements=["company_slug", "year", "commodity_type"],
            set_={
                "commodity_sub_type": stmt_perf.excluded.commodity_sub_type,
                "mining_operation_status": stmt_perf.excluded.mining_operation_status,
                "unit": stmt_perf.excluded.unit,
                "production_volume": stmt_perf.excluded.production_volume,
                "sales_volume": stmt_perf.excluded.sales_volume,
                "overburden_removal_volume": stmt_perf.excluded.overburden_removal_volume,
                "strip_ratio": stmt_perf.excluded.strip_ratio,
                "measurement_year": stmt_perf.excluded.measurement_year,
                "proven_reserves_mt": stmt_perf.excluded.proven_reserves_mt,
                "probable_reserves_mt": stmt_perf.excluded.probable_reserves_mt,
                "total_reserves_mt": stmt_perf.excluded.total_reserves_mt,
                "measured_resources_mt": stmt_perf.excluded.measured_resources_mt,
                "indicated_resources_mt": stmt_perf.excluded.indicated_resources_mt,
                "inferred_resources_mt": stmt_perf.excluded.inferred_resources_mt,
                "total_resources_mt": stmt_perf.excluded.total_resources_mt,
            },
        )
        await session.execute(stmt_perf)
        count += len(unique_perf)

    if product_rows:
        for p in product_rows:
            await session.execute(
                delete(CompanyProduct).where(
                    CompanyProduct.company_slug == p["company_slug"],
                    CompanyProduct.year == p["year"],
                    CompanyProduct.product_name == p["product_name"],
                )
            )
        stmt_prod = insert(CompanyProduct).values(product_rows)
        await session.execute(stmt_prod)
        count += len(product_rows)

    return count


async def upsert_company_financials(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert CompanyFinancials rows."""
    if not rows:
        return 0
    dedup: dict[tuple[str, int], dict[str, Any]] = {(r["company_slug"], r["year"]): r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(CompanyFinancials).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["company_slug", "year"],
        set_={
            "symbol": stmt.excluded.symbol,
            "assets_usd": stmt.excluded.assets_usd,
            "revenue_usd": stmt.excluded.revenue_usd,
            "revenue_breakdown": stmt.excluded.revenue_breakdown,
            "cost_of_revenue_usd": stmt.excluded.cost_of_revenue_usd,
            "cost_of_revenue_breakdown": stmt.excluded.cost_of_revenue_breakdown,
            "profit_usd": stmt.excluded.profit_usd,
        },
    )
    await session.execute(stmt)
    return len(unique_rows)


async def upsert_sales_destinations(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert SalesDestination rows."""
    if not rows:
        return 0
    for r in rows:
        await session.execute(
            delete(SalesDestination).where(
                SalesDestination.company_slug == r["company_slug"],
                SalesDestination.year == r["year"],
                SalesDestination.country == r["country"],
            )
        )
    stmt = insert(SalesDestination).values(rows)
    await session.execute(stmt)
    return len(rows)


async def upsert_commodity_prices(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert CommodityPrice rows."""
    if not rows:
        return 0
    dedup: dict[tuple[str, dt.date], dict[str, Any]] = {(r["commodity"], r["observed_on"]): r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(CommodityPrice).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["commodity", "observed_on"],
        set_={
            "price": stmt.excluded.price,
            "unit": stmt.excluded.unit,
        },
    )
    await session.execute(stmt)
    return len(unique_rows)


async def backfill_in_universe_site_gps(
    session: AsyncSession,
    client: Any,
) -> tuple[int, int]:
    """Fetch detail for in-universe sites from /v2/mining/sites/{slug}/ and backfill GPS coordinates.

    Returns (fetched_count, updated_count).
    """
    query = text("""
        select distinct s.slug
        from core.mining_site s
        join graph.issuer_mining_link l on l.company_slug = s.company_slug
        where l.symbol in ('AADI','ADMR','ADRO','BUMI','BYAN','GEMS','ITMG','PTBA','DSSA')
        order by s.slug;
    """)
    res = await session.execute(query)
    site_slugs = [r[0] for r in res.all()]

    fetched_count = 0
    updated_count = 0

    for slug in site_slugs:
        try:
            payload = await client.get(
                endpoint=f"/v2/mining/sites/{slug}/",
                tier="cold",
                credit_cost=1,
                session=session,
            )
            fetched_count += 1
            data = payload.get("data", payload) if isinstance(payload, dict) else {}
            if isinstance(data, dict):
                loc = data.get("location") if isinstance(data.get("location"), dict) else {}
                lat = parse_float_safe(loc.get("latitude") if loc else data.get("latitude"))
                lon = parse_float_safe(loc.get("longitude") if loc else data.get("longitude"))
                prov = loc.get("province") if (loc and loc.get("province")) else data.get("province")
                city = loc.get("city") if (loc and loc.get("city")) else data.get("city")
                proj = data.get("project_name")

                values_to_update: dict[str, Any] = {}
                if lat is not None:
                    values_to_update["latitude"] = lat
                if lon is not None:
                    values_to_update["longitude"] = lon
                if prov:
                    values_to_update["province"] = prov
                if city:
                    values_to_update["city"] = city
                if proj:
                    values_to_update["project_name"] = proj

                if values_to_update:
                    stmt = (
                        update(MiningSite)
                        .where(MiningSite.slug == slug)
                        .values(**values_to_update)
                    )
                    await session.execute(stmt)
                    if lat is not None or lon is not None:
                        updated_count += 1
        except Exception:
            pass

    return fetched_count, updated_count
