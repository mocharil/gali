"""Tiered cache lookup and persistence to raw.responses."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from gali_core.db.models import RawResponse


def compute_params_hash(params: dict[str, Any] | None) -> str:
    """Compute a deterministic SHA-256 hash over canonicalised query parameters."""
    if not params:
        return hashlib.sha256(b"").hexdigest()
    # Sort keys to ensure stable order regardless of dict insertion order
    canonical_json = json.dumps(params, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


async def get_cached_response_async(
    endpoint: str,
    params_hash: str,
    session: AsyncSession,
) -> RawResponse | None:
    """Fetch the latest cached response for this endpoint and params hash."""
    stmt = (
        select(RawResponse)
        .where(
            RawResponse.endpoint == endpoint,
            RawResponse.params_hash == params_hash,
            RawResponse.status_code == 200,
        )
        .order_by(desc(RawResponse.fetched_at))
        .limit(1)
    )
    res = await session.execute(stmt)
    return res.scalar_one_or_none()


def get_cached_response_sync(
    endpoint: str,
    params_hash: str,
    session: Session,
) -> RawResponse | None:
    """Synchronous fetch of the latest cached response."""
    stmt = (
        select(RawResponse)
        .where(
            RawResponse.endpoint == endpoint,
            RawResponse.params_hash == params_hash,
            RawResponse.status_code == 200,
        )
        .order_by(desc(RawResponse.fetched_at))
        .limit(1)
    )
    res = session.execute(stmt)
    return res.scalar_one_or_none()


async def save_raw_response_async(
    endpoint: str,
    params: dict[str, Any],
    params_hash: str,
    payload: Any,
    status_code: int,
    credits_charged: int,
    tier: str,
    session: AsyncSession,
    run_id: str | None = None,
) -> RawResponse:
    """Save an immutable raw API response to raw.responses."""
    entry = RawResponse(
        endpoint=endpoint,
        params=params,
        params_hash=params_hash,
        payload=payload,
        status_code=status_code,
        credits_charged=credits_charged,
        tier=tier,
        run_id=run_id,
    )
    session.add(entry)
    await session.flush()
    return entry


def save_raw_response_sync(
    endpoint: str,
    params: dict[str, Any],
    params_hash: str,
    payload: Any,
    status_code: int,
    credits_charged: int,
    tier: str,
    session: Session,
    run_id: str | None = None,
) -> RawResponse:
    """Synchronous save of an immutable raw API response."""
    entry = RawResponse(
        endpoint=endpoint,
        params=params,
        params_hash=params_hash,
        payload=payload,
        status_code=status_code,
        credits_charged=credits_charged,
        tier=tier,
        run_id=run_id,
    )
    session.add(entry)
    session.flush()
    return entry
