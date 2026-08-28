"""Sectors Financial API client with tiered caching, dry-run guard, and credit budget enforcement."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

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


class SectorsNotFoundError(Exception):
    """Raised when Sectors API returns 404 (Resource Not Found).

    Note: Sectors bills exactly 1 credit for 404 responses. This exception is distinct
    from network/transport errors so that callers (e.g. Fase 1 data audit loops) can catch
    it cleanly as missing coverage without failing the entire pipeline.
    """

    def __init__(self, message: str, endpoint: str, params: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.endpoint = endpoint
        self.params = params or {}


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
    5. 404 responses are charged exactly 1 credit, persisted with status_code=404, and raise SectorsNotFoundError.
    6. 429 rate limits are retried with backoff and cost 0 credits for failed attempts.
    7. 400/401/403/5xx errors raise without charging credits or saving to database.
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
            try:
                result = await self._get_with_session(
                    endpoint=endpoint,
                    params=clean_params,
                    params_hash=params_hash,
                    tier=tier,
                    credit_cost=credit_cost,
                    run_id=run_id,
                    session=managed_session,
                    force_refresh=force_refresh,
                )
                await managed_session.commit()
                return result
            except SectorsNotFoundError:
                # 404 accounting (raw.responses + ops.credit_ledger) must be persisted
                await managed_session.commit()
                raise
            except Exception:
                await managed_session.rollback()
                raise

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
        # 1. Check raw.responses cache first (strictly status_code == 200)
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

        # 5. Handle 404: charges exactly 1 credit, records raw.responses, raises SectorsNotFoundError
        if status_code == 404:
            charged_credits = 1
            raw_entry = await save_raw_response_async(
                endpoint=endpoint,
                params=params,
                params_hash=params_hash,
                payload=None,
                status_code=404,
                credits_charged=charged_credits,
                tier=tier,
                session=session,
                run_id=run_id,
            )

            await self.budget.record_spend_async(
                endpoint=endpoint,
                credits=charged_credits,
                tier=tier,
                status_code=404,
                session=session,
                run_id=run_id,
                raw_response_id=raw_entry.id,
            )

            logger.warning(
                "api_resource_not_found_404",
                endpoint=endpoint,
                params=params,
                credits_charged=charged_credits,
            )

            raise SectorsNotFoundError(
                f"Resource not found (404) for endpoint '{endpoint}' with params {params}",
                endpoint=endpoint,
                params=params,
            )

        # 6. Handle 200 (Success): persist to raw.responses and debit ops.credit_ledger
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

    async def _execute_http_request(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        params: dict[str, Any],
    ) -> tuple[Any, int]:
        """Execute HTTP request with 429 retry backoff and network error handling."""
        max_attempts = self.settings.sectors_max_retries
        for attempt in range(max_attempts + 1):
            try:
                response = await client.get(endpoint, params=params)

                # 429: Rate limited -> retry with backoff, respect Retry-After header
                if response.status_code == 429:
                    if attempt == max_attempts:
                        response.raise_for_status()
                    retry_after_hdr = response.headers.get("Retry-After")
                    wait_time: float = min(1.0 * (2**attempt), 10.0)
                    if retry_after_hdr:
                        try:
                            wait_time = float(retry_after_hdr)
                        except ValueError:
                            pass
                    logger.warning(
                        "rate_limited_429",
                        endpoint=endpoint,
                        attempt=attempt + 1,
                        retry_after=wait_time,
                    )
                    await asyncio.sleep(wait_time)
                    continue

                # 404: Not Found -> return immediately without exception (caller handles credit & raises SectorsNotFoundError)
                if response.status_code == 404:
                    return None, 404

                # 200 or other 4xx/5xx
                response.raise_for_status()
                return response.json(), response.status_code

            except (httpx.TransportError, httpx.TimeoutException) as exc:
                if attempt == max_attempts:
                    raise
                wait_time = min(1.0 * (2**attempt), 10.0)
                logger.warning(
                    "network_error_retry",
                    endpoint=endpoint,
                    attempt=attempt + 1,
                    error=str(exc),
                )
                await asyncio.sleep(wait_time)
                continue

        raise httpx.RequestError(f"Exhausted {max_attempts} retries for endpoint '{endpoint}'")
