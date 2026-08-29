"""FastAPI dependencies for Database Sessions, Published Pointer, and Redis."""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from gali_core.config import get_settings
from gali_core.db.base import async_session
from gali_core.db.models import PublishedPointer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Global Redis pool
_redis_client: aioredis.Redis | None = None


async def init_redis_pool() -> aioredis.Redis | None:
    global _redis_client
    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=2.0,
        )
        await _redis_client.ping()
        logger.info("Connected to Redis cache at %s", settings.redis_url)
        return _redis_client
    except Exception as exc:
        logger.warning("Redis initialization failed: %s. Proceeding without cache.", exc)
        _redis_client = None
        return None


async def close_redis_pool() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Yield a managed SQLAlchemy async session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_redis() -> aioredis.Redis | None:
    """Return active Redis client or None if unavailable."""
    return _redis_client


async def get_published_run_id(db: AsyncSession = Depends(get_db)) -> str:
    """Fetch the active Blue/Green published run_id."""
    stmt = select(PublishedPointer.run_id).where(PublishedPointer.singleton.is_(True))
    result = await db.execute(stmt)
    run_id = result.scalar_one_or_none()
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "NO_PUBLISHED_RUN",
                "message": "No published metric run found. Run `gali metrics run` first.",
            },
        )
    return str(run_id)
