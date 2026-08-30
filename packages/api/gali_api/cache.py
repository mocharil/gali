"""Redis Cache Decorator & Key Generator with Blue/Green run-id auto-invalidation."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import redis.asyncio as aioredis
from pydantic import BaseModel

logger = logging.getLogger(__name__)


def make_cache_key(prefix: str, run_id: str, endpoint: str, params: dict[str, Any]) -> str:
    """Generate a deterministic versioned cache key."""
    sorted_params = json.dumps(params, sort_keys=True, default=str)
    param_hash = hashlib.sha256(sorted_params.encode("utf-8")).hexdigest()[:16]
    return f"gali:v1:{run_id}:{prefix}:{endpoint}:{param_hash}"


async def get_cached_json(redis: aioredis.Redis | None, key: str) -> dict[str, Any] | list[Any] | None:
    """Retrieve and deserialize cached JSON payload."""
    if not redis:
        return None
    try:
        data = await redis.get(key)
        if data:
            return json.loads(data)
    except Exception as exc:
        logger.warning("Redis GET error for key %s: %s", key, exc)
    return None


async def set_cached_json(
    redis: aioredis.Redis | None,
    key: str,
    payload: Any,
    ttl_seconds: int = 3600,
) -> None:
    """Serialize and write payload to Redis cache with TTL."""
    if not redis:
        return
    try:
        if isinstance(payload, BaseModel):
            data = payload.model_dump_json()
        elif isinstance(payload, list):
            serialized = [item.model_dump(mode="json") if isinstance(item, BaseModel) else item for item in payload]
            data = json.dumps(serialized)
        elif isinstance(payload, dict):
            serialized_dict = {
                k: v.model_dump(mode="json") if isinstance(v, BaseModel) else v for k, v in payload.items()
            }
            data = json.dumps(serialized_dict, default=str)
        else:
            data = json.dumps(payload, default=str)
        await redis.setex(key, ttl_seconds, data)
    except Exception as exc:
        logger.warning("Redis SET error for key %s: %s", key, exc)
