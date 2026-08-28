"""Sectors Financial API client with tiered caching, dry-run guard, and credit budget enforcement."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from gali_core.config import Settings, get_settings
from gali_core.db.base import async_session
from gali_core.sectors.budget import CreditBudget
from gali_core.sectors.cache import (
    compute_params_hash,
    get_cached_response_async,
    save_raw_response_async,
)

logger = structlog.get_logger(__name__)


class DryRunCacheMissError(Exception):
    """Raised when GALI_DRY_RUN=True and a requested endpoint is not present in raw.responses."""


class RateLimiter:
    """Async token bucket / leaky rate limiter."""

    def __init__(self, requests_per_second: float = 4.0) -> None:
        self.interval = 1.0 / max(requests_per_second, 0.1)
        self.lock = asyncio.Lock()
        self.last_request_time = 0.0

    async def acquire(self) -> None:
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_request_time
            if elapsed < self.interval:
                await asyncio.sleep(self.interval - elapsed)
            self.last_request_time = time.monotonic()


class SectorsClient:
    """Primary client for interacting with Sectors Financial API.

    Guarantees:
    1. ALWAYS checks raw.responses first. Cache hit = 0 credits charged.
    2. In GALI_DRY_RUN=1 (default dev mode), cache miss raises DryRunCacheMissError.
    3. Live calls are gated by CreditBudget (hard ceiling: 950).
    4. Every live call writes immutable payload to raw.responses and records spend to ops.credit_ledger.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        budget: CreditBudget | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.budget = budget or CreditBudget(hard_cap=self.settings.sectors_credit_hard_cap)
        self.rate_limiter = RateLimiter(requests_per_second=self.settings.sectors_requests_per_second)
        self._client: httpx.AsyncClient | None = None

    async def _get_http_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            headers = {
                "Accept": "application/json",
                "User-Agent": "GALI-Analytics/0.1.0",
            }
            if self.settings.sectors_api_key:
                # Sectors accepts raw key or Bearer format
                key = self.settings.sectors_api_key.strip()
                headers["Authorization"] = key if key.startswith("Bearer ") else key

            self._client = httpx.AsyncClient(
                base_url=self.settings.sectors_base_url.rstrip("/"),
                headers=headers,
                timeout=httpx.Timeout(self.settings.sectors_timeout_seconds),
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def get(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
        tier: str = "cold",
        credit_cost: int = 1,
        run_id: str | None = None,
        session: AsyncSession | None = None,
        force_refresh: bool = False,
    ) -> Any:
        """Fetch data from Sectors API or raw.responses cache."""
        clean_params = params or {}
        params_hash = compute_params_hash(clean_params)

        if session is not None:
            return await self._get_with_session(
                endpoint=endpoint,
                params=clean_params,
                params_hash=params_hash,
                tier=tier,
                credit_cost=credit_cost,
                run_id=run_id,
                session=session,
                force_refresh=force_refresh,
            )

        async with async_session() as managed_session:
            async with managed_session.begin():
                return await self._get_with_session(
                    endpoint=endpoint,
                    params=clean_params,
                    params_hash=params_hash,
                    tier=tier,
                    credit_cost=credit_cost,
                    run_id=run_id,
                    session=managed_session,
                    force_refresh=force_refresh,
                )

    async def _get_with_session(
        self,
        endpoint: str,
        params: dict[str, Any],
        params_hash: str,
        tier: str,
        credit_cost: int,
        run_id: str | None,
        session: AsyncSession,
        force_refresh: bool,
    ) -> Any:
        # 1. Check raw.responses cache first
        if not force_refresh:
            cached = await get_cached_response_async(endpoint, params_hash, session)
            if cached is not None:
                logger.debug(
                    "cache_hit",
                    endpoint=endpoint,
                    params_hash=params_hash,
                    credits=0,
                )
                return cached.payload

        # 2. Check DRY_RUN mode
        if self.settings.gali_dry_run:
            raise DryRunCacheMissError(
                f"Cache miss for '{endpoint}' (params_hash={params_hash[:8]}) in GALI_DRY_RUN mode. "
                "Live API calls are disabled during development to protect credit budget."
            )

        # 3. Live call validations
        if not self.settings.sectors_api_key:
            raise ValueError("SECTORS_API_KEY is not configured in environment or .env file.")

        await self.budget.check_budget_async(credit_cost, session)

        # 4. Rate limiting and HTTP request with retry
        await self.rate_limiter.acquire()
        http_client = await self._get_http_client()

        payload, status_code = await self._execute_http_request(http_client, endpoint, params)

        # 5. Persist to raw.responses and debit ops.credit_ledger
        raw_entry = await save_raw_response_async(
            endpoint=endpoint,
            params=params,
            params_hash=params_hash,
            payload=payload,
            status_code=status_code,
            credits_charged=credit_cost,
            tier=tier,
            session=session,
            run_id=run_id,
        )

        await self.budget.record_spend_async(
            endpoint=endpoint,
            credits=credit_cost,
            tier=tier,
            status_code=status_code,
            session=session,
            run_id=run_id,
            raw_response_id=raw_entry.id,
        )

        logger.info(
            "api_call_success",
            endpoint=endpoint,
            credits_charged=credit_cost,
            tier=tier,
            status_code=status_code,
        )

        return payload

    @retry(
        retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def _execute_http_request(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        params: dict[str, Any],
    ) -> tuple[Any, int]:
        response = await client.get(endpoint, params=params)
        response.raise_for_status()
        return response.json(), response.status_code
