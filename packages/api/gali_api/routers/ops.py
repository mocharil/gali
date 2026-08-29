"""Operations and Health Check Endpoints."""

from __future__ import annotations

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Response, status
from gali_api.dependencies import get_db, get_redis
from gali_api.schemas.common import HealthResponse, ReadyResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Operations & Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Liveness probe returning 200 OK if FastAPI process is alive."""
    return HealthResponse(status="ok", version="v1.0.0")


@router.get("/ready", response_model=ReadyResponse)
async def readiness_check(
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis | None = Depends(get_redis),
) -> ReadyResponse:
    """Readiness probe checking database connectivity and published metric run availability."""
    db_ok = False
    run_id_str: str | None = None
    try:
        res = await db.execute(text("SELECT 1"))
        if res.scalar() == 1:
            db_ok = True

        pointer_res = await db.execute(text("SELECT run_id FROM metrics.published_pointer WHERE singleton = true"))
        pointer = pointer_res.scalar_one_or_none()
        if pointer:
            run_id_str = str(pointer)
    except Exception:
        db_ok = False

    redis_ok = False
    if redis:
        try:
            redis_ok = await redis.ping()
        except Exception:
            redis_ok = False

    is_ready = db_ok and (run_id_str is not None)
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return ReadyResponse(
        status="ready" if is_ready else "not_ready",
        database=db_ok,
        redis=redis_ok,
        published_run_id=run_id_str,
    )
