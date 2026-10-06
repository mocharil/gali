"""FastAPI dependencies for Database Sessions, Published Pointer, and Redis."""

from __future__ import annotations

import asyncio
import logging
import weakref
from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from gali_core.config import get_settings
from gali_core.db.base import async_session
from gali_core.db.models import PublishedPointer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Loop-bound Redis client cache to support serverless event loop lifecycles
_redis_clients: weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, aioredis.Redis] = weakref.WeakKeyDictionary()


async def get_redis() -> aioredis.Redis | None:
    """Return active Redis client for the current running event loop, creating lazily if needed."""
    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        loop = asyncio.get_running_loop()
        client = _redis_clients.get(loop)
        if client is None:
            pool = aioredis.ConnectionPool.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
                max_connections=10,
            )
            client = aioredis.Redis(connection_pool=pool)
            _redis_clients[loop] = client
        return client
    except Exception as exc:
        logger.warning("Redis client resolution failed: %s", exc)
        return None


async def init_redis_pool() -> aioredis.Redis | None:
    """Verify Redis connectivity at startup."""
    client = await get_redis()
    if client:
        try:
            await client.ping()
            logger.info("Redis cache connection verified")
            return client
        except Exception as exc:
            logger.warning("Redis ping failed at startup: %s. Proceeding without cache.", exc)
    return None


async def close_redis_pool() -> None:
    """Close active Redis client for the current running event loop."""
    try:
        loop = asyncio.get_running_loop()
        client = _redis_clients.get(loop)
        if client:
            await client.aclose()
            _redis_clients.pop(loop, None)
    except Exception:
        pass


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Yield a managed SQLAlchemy async session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_published_run_id(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> str:
    """Read the publication pointer from the DB; endpoint caches remain run-scoped."""
    stmt = select(PublishedPointer.run_id).where(PublishedPointer.singleton.is_(True))
    try:
        result = await db.execute(stmt)
    except Exception as exc:
        logger.warning("Published dataset is unavailable (%s)", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail={"code": "DATA_UNAVAILABLE", "message": "The published dataset is temporarily unavailable."},
        ) from exc
    run_id = result.scalar_one_or_none()
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "NO_PUBLISHED_RUN",
                "message": "No published metric run found. Run `gali metrics run` first.",
            },
        )
    run_id_str = str(run_id)
    return run_id_str
