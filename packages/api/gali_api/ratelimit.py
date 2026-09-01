"""Redis-backed continuous sliding-window rate limiter middleware for GALI API.

Design:
- Anonymous requests (no X-API-Key header): limited to rate_limit_anon_per_min RPM.
- Keyed requests (X-API-Key header present): limited to rate_limit_keyed_per_min RPM.
- Uses an atomic Redis Sorted Set (ZSET) continuous sliding window (ZREMRANGEBYSCORE + ZCARD + ZADD).
- Prevents minute-boundary resets and fixed-window burst bypass.
- If Redis is unavailable, rate limiting is bypassed gracefully (fail-open).
- Returns HTTP 429 with accurate Retry-After header when limit exceeded.
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable

import redis.asyncio as aioredis
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from gali_core.config import get_settings
from starlette.middleware.base import BaseHTTPMiddleware

from gali_api.dependencies import get_redis  # module-level for testability via mock.patch

logger = logging.getLogger(__name__)

LUA_SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local member = ARGV[4]

local clear_before = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, clear_before)
local current_requests = redis.call('ZCARD', key)

if current_requests < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window + 10))
    return {1, current_requests + 1, 0}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = window
    if oldest and #oldest >= 2 then
        retry_after = math.max(1, math.ceil(tonumber(oldest[2]) + window - now))
    end
    return {0, current_requests, retry_after}
end
"""


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Continuous sliding-window rate limiter backed by Redis Sorted Sets.

    Key schema: ``gali:rl:<anon|keyed>:<identifier>``

    Uses an atomic Lua script to prune timestamps older than 60 seconds, count
    active requests in the rolling 60-second window, and calculate exact Retry-After.
    """

    EXEMPT_PATHS: frozenset[str] = frozenset({"/health", "/ready", "/metrics", "/docs", "/redoc", "/openapi.json"})

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Exempt health/telemetry paths from rate limiting
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        redis: aioredis.Redis | None = None
        try:
            redis = await get_redis()
        except Exception as exc:
            logger.warning("RateLimitMiddleware get_redis failed: %s", exc)
            redis = None

        if redis is None:
            # Fail-open: no Redis → bypass rate limiting
            logger.warning("Rate limiting bypassed (Redis unavailable) for path=%s", request.url.path)
            return await call_next(request)

        settings = get_settings()
        api_key = request.headers.get("X-API-Key", "").strip()

        if api_key:
            tier = "keyed"
            identifier = api_key[:32]  # truncate to avoid huge keys
            limit = settings.rate_limit_keyed_per_min
        else:
            tier = "anon"
            real_ip = request.headers.get("x-real-ip", "").strip()
            forwarded = request.headers.get("x-forwarded-for", "").strip()
            client_ip = (
                real_ip
                or (forwarded.split(",")[0].strip() if forwarded else "")
                or (request.client.host if request.client else "unknown")
            )
            identifier = client_ip
            limit = settings.rate_limit_anon_per_min

        redis_key = f"gali:rl:{tier}:{identifier}"
        now = time.time()
        window_seconds = 60.0

        try:
            if hasattr(redis, "eval"):
                member = f"{now}:{uuid.uuid4().hex[:8]}"
                res = await redis.eval(
                    LUA_SLIDING_WINDOW_SCRIPT,
                    1,
                    redis_key,
                    str(now),
                    str(limit),
                    str(window_seconds),
                    member,
                )
                allowed = bool(res[0])
                count = int(res[1])
                retry_after = int(res[2]) if not allowed else 0
            else:
                # Fallback for mock objects without eval support
                count = await redis.incr(redis_key)
                if count == 1:
                    await redis.expire(redis_key, 70)
                allowed = count <= limit
                retry_after = 60 - (int(now) % 60)

            logger.info("RATE_LIMIT_CHECK: key=%s count=%d limit=%d allowed=%s", redis_key, count, limit, allowed)

            if not allowed:
                retry_after = max(1, retry_after)
                logger.warning(
                    "Rate limit exceeded: tier=%s identifier=%s count=%d limit=%d retry_after=%d",
                    tier,
                    identifier,
                    count,
                    limit,
                    retry_after,
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
