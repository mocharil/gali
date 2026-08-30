"""Redis-backed sliding-window rate limiter middleware for GALI API.

Design:
- Anonymous requests (no X-API-Key header): limited to rate_limit_anon_per_min RPM.
- Keyed requests (X-API-Key header present): limited to rate_limit_keyed_per_min RPM.
- Uses a Redis INCR + EXPIRE sliding-window counter per client key (IP or API key).
- If Redis is unavailable, rate limiting is bypassed gracefully (fail-open).
- Returns HTTP 429 with Retry-After header when limit exceeded.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable

import redis.asyncio as aioredis
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from gali_core.config import get_settings
from starlette.middleware.base import BaseHTTPMiddleware

from gali_api.dependencies import get_redis  # module-level for testability via mock.patch

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter backed by Redis.

    Key schema: ``gali:rl:<anon|keyed>:<identifier>:<minute_bucket>``

    Counter is incremented on every request within the current 60-second bucket;
    the key expires after 70 seconds so memory is bounded automatically.
    """

    EXEMPT_PATHS: frozenset[str] = frozenset({"/health", "/ready", "/metrics", "/docs", "/redoc", "/openapi.json"})

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Exempt health/telemetry paths from rate limiting
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        redis: aioredis.Redis | None = getattr(request.app.state, "redis_client", None)
        if redis is None:
            try:
                redis = await get_redis()
            except Exception:
                redis = None

        if redis is None:
            # Fail-open: no Redis → bypass rate limiting
            logger.debug("Rate limiting bypassed (Redis unavailable)")
            return await call_next(request)

        settings = get_settings()
        api_key = request.headers.get("X-API-Key", "").strip()

        if api_key:
            tier = "keyed"
            identifier = api_key[:32]  # truncate to avoid huge keys
            limit = settings.rate_limit_keyed_per_min
        else:
            tier = "anon"
            # Use X-Forwarded-For (Vercel sets this) → fallback to direct IP
            forwarded = request.headers.get("X-Forwarded-For", "")
            client_ip = (
                forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
            )
            identifier = client_ip
            limit = settings.rate_limit_anon_per_min

        # 60-second bucket: key changes every minute
        minute_bucket = int(time.time()) // 60
        redis_key = f"gali:rl:{tier}:{identifier}:{minute_bucket}"

        try:
            count = await redis.incr(redis_key)
            if count == 1:
                # First request in this bucket — set TTL
                await redis.expire(redis_key, 70)

            if count > limit:
                retry_after = 60 - (int(time.time()) % 60)
                logger.warning(
                    "Rate limit exceeded: tier=%s identifier=%s count=%d limit=%d",
                    tier,
                    identifier,
                    count,
                    limit,
                )
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={"Retry-After": str(retry_after)},
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Rate limit exceeded ({limit} requests/minute). "
                            f"Retry after {retry_after} seconds.",
                            "limit": limit,
                            "retry_after_seconds": retry_after,
                        }
                    },
                )
        except Exception as exc:
            # Fail-open: Redis error → let request through
            logger.warning("Rate limiter Redis error (bypassing): %s", exc)

        return await call_next(request)
