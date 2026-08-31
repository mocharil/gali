"""Normalizer engine: transforms raw market JSONB payloads into market.* tables."""

from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from gali_core.db.models import (
    ForeignFlow,
    IdxCompany,
    IdxDailyClose,
)
from gali_core.normalize.core_normalizer import parse_date_safe, parse_float_safe


def normalize_idx_companies(payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/companies/ payload to IdxCompany rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]
    elif isinstance(payload, dict):
        raw_items = payload.get("data", payload.get("results", payload.get("items", [])))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
        elif "symbol" in payload:
            items = [payload]

    rows: list[dict[str, Any]] = []
    for item in items:
        sym = item.get("symbol")
        name = item.get("name") or item.get("company_name")
        if not sym or not name:
            continue

        clean_sym = str(sym).replace(".JK", "").strip().upper()
        qv = item.get("query_values", {}) if isinstance(item.get("query_values"), dict) else {}
        mcap = parse_float_safe(
            item.get("market_cap") or item.get("market_cap_idr") or qv.get("market_cap") or qv.get("market_cap_idr")
        )
        list_date = parse_date_safe(item.get("listing_date") or qv.get("listing_date"))

        rows.append(
            {
                "symbol": clean_sym,
                "name": str(name).strip(),
                "sector": item.get("sector") or qv.get("sector"),
                "sub_sector": item.get("sub_sector") or qv.get("sub_sector"),
                "market_cap_idr": mcap,
                "listing_date": list_date,
            }
        )
    return rows


def normalize_daily_close(symbol: str, payload: dict | list) -> list[dict[str, Any]]:
    """Normalize /v2/daily/{symbol}/ payload to IdxDailyClose rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]
    elif isinstance(payload, dict):
        raw_items = payload.get("data", payload.get("results", []))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
        elif "close" in payload and "date" in payload:
            items = [payload]

    clean_sym = str(symbol).replace(".JK", "").strip().upper()
    rows: list[dict[str, Any]] = []
    for item in items:
        d = parse_date_safe(item.get("date") or item.get("datetime"))
        close_p = parse_float_safe(item.get("close") or item.get("price"))
        if d is None or close_p is None:
            continue

        rows.append(
            {
                "symbol": clean_sym,
                "date": d,
                "close": close_p,
                "volume": parse_float_safe(item.get("volume")),
                "market_cap": parse_float_safe(item.get("market_cap")),
            }
        )
    return rows


def normalize_foreign_flow(symbol: str, payload: dict | list) -> list[dict[str, Any]]:
    """Normalize foreign flow payload to ForeignFlow rows."""
    items: list[dict[str, Any]] = []
    if isinstance(payload, list):
        items = [x for x in payload if isinstance(x, dict)]
    elif isinstance(payload, dict):
        raw_items = payload.get("data", payload.get("results", []))
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
        elif "net_foreign_inflow" in payload and "date" in payload:
            items = [payload]

    clean_sym = str(symbol).replace(".JK", "").strip().upper()
    rows: list[dict[str, Any]] = []
    for item in items:
        d = parse_date_safe(item.get("date"))
        flow = parse_float_safe(item.get("net_foreign_inflow") or item.get("net_foreign"))
        if d is None or flow is None:
            continue

        rows.append(
            {
                "symbol": clean_sym,
                "date": d,
                "net_foreign_inflow": flow,
            }
        )
    return rows


# =============================================================================
# Database Upsert Helpers
# =============================================================================


async def upsert_idx_companies(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert IdxCompany rows."""
    if not rows:
        return 0
    dedup: dict[str, dict[str, Any]] = {r["symbol"]: r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(IdxCompany).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol"],
        set_={
            "name": func.coalesce(stmt.excluded.name, IdxCompany.name),
            "sector": func.coalesce(stmt.excluded.sector, IdxCompany.sector),
            "sub_sector": func.coalesce(stmt.excluded.sub_sector, IdxCompany.sub_sector),
            "market_cap_idr": func.coalesce(stmt.excluded.market_cap_idr, IdxCompany.market_cap_idr),
            "listing_date": func.coalesce(stmt.excluded.listing_date, IdxCompany.listing_date),
            "updated_at": dt.datetime.now(dt.UTC),
        },
    )
    await session.execute(stmt)
    return len(unique_rows)


async def upsert_daily_close(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert IdxDailyClose rows."""
    if not rows:
        return 0
    dedup: dict[tuple[str, dt.date], dict[str, Any]] = {(r["symbol"], r["date"]): r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(IdxDailyClose).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol", "date"],
        set_={
            "close": stmt.excluded.close,
            "volume": stmt.excluded.volume,
            "market_cap": stmt.excluded.market_cap,
        },
    )
    await session.execute(stmt)
    return len(unique_rows)


async def upsert_foreign_flow(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Idempotently upsert ForeignFlow rows."""
    if not rows:
        return 0
    dedup: dict[tuple[str, dt.date], dict[str, Any]] = {(r["symbol"], r["date"]): r for r in rows}
    unique_rows = list(dedup.values())

    stmt = insert(ForeignFlow).values(unique_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol", "date"],
        set_={
            "net_foreign_inflow": stmt.excluded.net_foreign_inflow,
        },
    )
    await session.execute(stmt)
    return len(unique_rows)
