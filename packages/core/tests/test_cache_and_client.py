"""Unit tests for cache lookup, SectorsClient behavior, and credit accounting edge cases (0.14-0.17)."""

from __future__ import annotations

import uuid

import httpx
import pytest
import respx
from sqlalchemy import select, text

from gali_core.config import Settings
from gali_core.db.base import async_session
from gali_core.db.models import CreditLedger, RawResponse
from gali_core.sectors.cache import (
    compute_params_hash,
    get_cached_response_async,
    save_raw_response_async,
)
from gali_core.sectors.client import (
    DryRunCacheMissError,
    SectorsClient,
    SectorsNotFoundError,
)
from gali_core.sectors.endpoints import ENDPOINTS


def test_params_hash_deterministic() -> None:
    h1 = compute_params_hash({"a": 1, "b": "xyz", "c": [1, 2]})
    h2 = compute_params_hash({"c": [1, 2], "a": 1, "b": "xyz"})
    assert h1 == h2
    assert len(h1) == 64

    # Empty dict and None produce same empty hash
    assert compute_params_hash({}) == compute_params_hash(None)


def test_screener_endpoints_registered_separately() -> None:
    """Task 0.16: verify structured screener is 1 credit and natural-language screener is 3 credits."""
    structured = ENDPOINTS["companies_screener_structured"]
    nl = ENDPOINTS["companies_screener_nl"]
    default = ENDPOINTS["companies_screener"]

    assert structured.credit_cost == 1
    assert structured.tier == "hot"
    assert nl.credit_cost == 3
    assert nl.tier == "hot"
    assert default.credit_cost == 1


@pytest.mark.asyncio
async def test_cache_persistence_and_hit() -> None:
    endpoint = "/v2/test/cache-probe/"
    params = {"page": 1, "limit": 30}
    p_hash = compute_params_hash(params)
    mock_payload = {"data": "test_data", "count": 42}
    test_run_id = f"test_cache_run_{uuid.uuid4().hex[:8]}"

    async with async_session() as session:
        try:
            # Initially no cache
            cached = await get_cached_response_async(endpoint, p_hash, session)
            assert cached is None

            # Save to raw.responses
            raw_entry = await save_raw_response_async(
                endpoint=endpoint,
                params=params,
                params_hash=p_hash,
                payload=mock_payload,
                status_code=200,
                credits_charged=1,
                tier="cold",
                session=session,
                run_id=test_run_id,
            )
            assert raw_entry.id is not None

            # Now cache hit
            cached = await get_cached_response_async(endpoint, p_hash, session)
            assert cached is not None
            assert cached.payload == mock_payload
        finally:
            # Clean up
            await session.execute(
                text("DELETE FROM raw.responses WHERE run_id = :run_id"),
                {"run_id": test_run_id},
            )
            await session.commit()


@pytest.mark.asyncio
async def test_sectors_client_dry_run_raises_on_miss() -> None:
    settings = Settings(
        gali_dry_run=True,
        sectors_api_key="",
    )
    client = SectorsClient(settings=settings)

    with pytest.raises(DryRunCacheMissError):
        await client.get(
            endpoint="/v2/uncached/endpoint/",
            params={"param": "value"},
            tier="cold",
        )
    await client.close()


@pytest.mark.asyncio
async def test_sectors_client_dry_run_serves_from_cache() -> None:
    test_run = f"test_dry_run_hit_{uuid.uuid4().hex[:8]}"
    endpoint = "/v2/mining/cached-test/"
    params = {"slug": "test-slug"}
    p_hash = compute_params_hash(params)
    payload = {"company": "Test PT", "reserves": 500}

    async with async_session() as session:
        await save_raw_response_async(
            endpoint=endpoint,
            params=params,
            params_hash=p_hash,
            payload=payload,
            status_code=200,
            credits_charged=1,
            tier="warm",
            session=session,
            run_id=test_run,
        )
        await session.commit()

    settings = Settings(
        gali_dry_run=True,
        sectors_api_key="",
    )
    client = SectorsClient(settings=settings)

    try:
        result = await client.get(endpoint=endpoint, params=params, tier="warm")
        assert result == payload
    finally:
        await client.close()
        # Clean up
        async with async_session() as session:
            await session.execute(
                text("DELETE FROM raw.responses WHERE run_id = :run_id"),
                {"run_id": test_run},
            )
            await session.commit()


@pytest.mark.asyncio
@respx.mock
async def test_sectors_client_live_mock_flow() -> None:
    test_run = f"test_live_mock_run_{uuid.uuid4().hex[:8]}"
    endpoint = "/v2/mining/live-test/"
    params = {"limit": 30}
    api_url = f"https://api.sectors.app{endpoint}?limit=30"
    mock_body = {"items": [{"name": "Mine A"}], "total": 1}

    respx.get(api_url).respond(status_code=200, json=mock_body)

    settings = Settings(
        gali_dry_run=False,
        sectors_api_key="test_api_key_123",
        sectors_base_url="https://api.sectors.app",
    )
    client = SectorsClient(settings=settings)

    try:
        # First call: makes HTTP request, records to DB
        result = await client.get(
            endpoint=endpoint,
            params=params,
            tier="cold",
            credit_cost=1,
            run_id=test_run,
        )
        assert result == mock_body

        # Second call: served from raw.responses cache (0 HTTP calls)
        respx.reset()  # clear mock so any network call would error
        cached_result = await client.get(
            endpoint=endpoint,
            params=params,
            tier="cold",
        )
        assert cached_result == mock_body
    finally:
        await client.close()
        # Clean up DB
        async with async_session() as session:
            await session.execute(
                text("DELETE FROM raw.responses WHERE run_id = :run_id"),
                {"run_id": test_run},
            )
            await session.execute(
                text("DELETE FROM ops.credit_ledger WHERE run_id = :run_id"),
                {"run_id": test_run},
            )
            await session.commit()


@pytest.mark.asyncio
@respx.mock
async def test_sectors_client_404_charges_exact_1_credit_and_raises_sectors_not_found_error() -> None:
    """Task 0.14 & 0.17: 404 writes raw.responses (status 404), records 1 credit in ledger, and raises SectorsNotFoundError."""
    test_run = f"test_404_accounting_run_{uuid.uuid4().hex[:8]}"
    endpoint = "/v2/mining/companies/performance/non-existent-slug/"
    api_url = f"https://api.sectors.app{endpoint}"

    respx.get(api_url).respond(status_code=404, json={"detail": "Not found"})

    settings = Settings(
        gali_dry_run=False,
        sectors_api_key="test_api_key_123",
        sectors_base_url="https://api.sectors.app",
    )
    client = SectorsClient(settings=settings)

    try:
        with pytest.raises(SectorsNotFoundError) as exc_info:
            await client.get(
                endpoint=endpoint,
                params={},
                tier="warm",
                credit_cost=1,
                run_id=test_run,
            )

        assert exc_info.value.endpoint == endpoint

        # Verify DB records
        async with async_session() as session:
            raw_res = await session.execute(select(RawResponse).where(RawResponse.run_id == test_run))
            raw_entry = raw_res.scalar_one_or_none()
            assert raw_entry is not None
            assert raw_entry.status_code == 404
            assert raw_entry.credits_charged == 1
            assert raw_entry.payload is None

            ledger_res = await session.execute(select(CreditLedger).where(CreditLedger.run_id == test_run))
            ledger_entry = ledger_res.scalar_one_or_none()
            assert ledger_entry is not None
            assert ledger_entry.credits == 1
            assert ledger_entry.status_code == 404
    finally:
        await client.close()
        async with async_session() as session:
            await session.execute(text("DELETE FROM raw.responses WHERE run_id = :run_id"), {"run_id": test_run})
            await session.execute(text("DELETE FROM ops.credit_ledger WHERE run_id = :run_id"), {"run_id": test_run})
            await session.commit()


@pytest.mark.asyncio
@respx.mock
async def test_sectors_client_404_on_expensive_endpoint_still_charges_only_1_credit() -> None:
    """Task 0.14 & 0.17: 404 on high-cost endpoint (e.g. cost 3) charges only 1 credit in ledger and raw.responses."""
    test_run = f"test_404_expensive_run_{uuid.uuid4().hex[:8]}"
    endpoint = "/v2/company-report/UNKNOWN/"
    api_url = f"https://api.sectors.app{endpoint}"

    respx.get(api_url).respond(status_code=404, json={"detail": "Company not found"})

    settings = Settings(
        gali_dry_run=False,
        sectors_api_key="test_api_key_123",
        sectors_base_url="https://api.sectors.app",
    )
    client = SectorsClient(settings=settings)

    try:
        with pytest.raises(SectorsNotFoundError):
            await client.get(
                endpoint=endpoint,
                params={},
                tier="hot",
                credit_cost=3,  # normal cost is 3
                run_id=test_run,
            )

        # Verify DB records charge exactly 1 credit, NOT 3
        async with async_session() as session:
            raw_res = await session.execute(select(RawResponse).where(RawResponse.run_id == test_run))
            raw_entry = raw_res.scalar_one_or_none()
            assert raw_entry is not None
            assert raw_entry.status_code == 404
            assert raw_entry.credits_charged == 1

            ledger_res = await session.execute(select(CreditLedger).where(CreditLedger.run_id == test_run))
            ledger_entry = ledger_res.scalar_one_or_none()
            assert ledger_entry is not None
            assert ledger_entry.credits == 1
            assert ledger_entry.status_code == 404
    finally:
        await client.close()
        async with async_session() as session:
            await session.execute(text("DELETE FROM raw.responses WHERE run_id = :run_id"), {"run_id": test_run})
            await session.execute(text("DELETE FROM ops.credit_ledger WHERE run_id = :run_id"), {"run_id": test_run})
            await session.commit()


@pytest.mark.asyncio
@respx.mock
async def test_sectors_client_429_retries_and_succeeds_with_single_credit_entry() -> None:
    """Task 0.15 & 0.17: 429 rate limit is retried with backoff; failed 429 attempts charge 0 credits."""
    test_run = f"test_429_retry_run_{uuid.uuid4().hex[:8]}"
    endpoint = "/v2/mining/licenses-retry-test/"
    params = {"page": 1}
    api_url = f"https://api.sectors.app{endpoint}?page=1"

    # 1st attempt: 429 with short Retry-After header
    # 2nd attempt: 200 OK
    respx.get(api_url).mock(
        side_effect=[
            httpx.Response(429, headers={"Retry-After": "0.01"}),
            httpx.Response(200, json={"items": [{"id": 1}], "page": 1}),
        ]
    )

    settings = Settings(
        gali_dry_run=False,
        sectors_api_key="test_api_key_123",
        sectors_base_url="https://api.sectors.app",
        sectors_max_retries=3,
    )
    client = SectorsClient(settings=settings)

    try:
        payload = await client.get(
            endpoint=endpoint,
            params=params,
            tier="cold",
            credit_cost=1,
            run_id=test_run,
            force_refresh=True,
        )
        assert payload == {"items": [{"id": 1}], "page": 1}

        # Verify exactly ONE ledger row (from the successful 200 response, none from the 429)
        async with async_session() as session:
            ledger_res = await session.execute(select(CreditLedger).where(CreditLedger.run_id == test_run))
            ledger_entries = ledger_res.scalars().all()
            assert len(ledger_entries) == 1
            assert ledger_entries[0].credits == 1
            assert ledger_entries[0].status_code == 200
    finally:
        await client.close()
        async with async_session() as session:
            await session.execute(text("DELETE FROM raw.responses WHERE run_id = :run_id"), {"run_id": test_run})
            await session.execute(text("DELETE FROM ops.credit_ledger WHERE run_id = :run_id"), {"run_id": test_run})
            await session.commit()


@pytest.mark.asyncio
@respx.mock
async def test_sectors_client_400_and_500_do_not_record_credits() -> None:
    """Task 0.17: 400 and 500 status codes raise HTTPStatusError and record 0 credits in ledger and raw.responses."""
    settings = Settings(
        gali_dry_run=False,
        sectors_api_key="test_api_key_123",
        sectors_base_url="https://api.sectors.app",
        sectors_max_retries=1,
    )
    client = SectorsClient(settings=settings)

    # 1. Test 400 Bad Request
    run_400 = f"test_400_run_{uuid.uuid4().hex[:8]}"
    ep_400 = "/v2/invalid-request/"
    respx.get(f"https://api.sectors.app{ep_400}").respond(status_code=400, json={"error": "Bad request"})

    try:
        with pytest.raises(httpx.HTTPStatusError) as exc_400:
            await client.get(endpoint=ep_400, tier="cold", credit_cost=1, run_id=run_400)
        assert exc_400.value.response.status_code == 400

        # 2. Test 500 Internal Server Error
        run_500 = f"test_500_run_{uuid.uuid4().hex[:8]}"
        ep_500 = "/v2/server-error/"
        respx.get(f"https://api.sectors.app{ep_500}").respond(status_code=500, json={"error": "Server error"})

        with pytest.raises(httpx.HTTPStatusError) as exc_500:
            await client.get(endpoint=ep_500, tier="cold", credit_cost=1, run_id=run_500)
        assert exc_500.value.response.status_code == 500

        # Verify no credits charged in ledger and no raw responses saved
        async with async_session() as session:
            ledger_400 = (
                (await session.execute(select(CreditLedger).where(CreditLedger.run_id == run_400))).scalars().all()
            )
            assert len(ledger_400) == 0

            raw_400 = (await session.execute(select(RawResponse).where(RawResponse.run_id == run_400))).scalars().all()
            assert len(raw_400) == 0

            ledger_500 = (
                (await session.execute(select(CreditLedger).where(CreditLedger.run_id == run_500))).scalars().all()
            )
            assert len(ledger_500) == 0

            raw_500 = (await session.execute(select(RawResponse).where(RawResponse.run_id == run_500))).scalars().all()
            assert len(raw_500) == 0
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_cache_regression_404_never_served_as_cache_hit() -> None:
    """Task 0.17 regression test: cache lookup strictly queries status_code == 200."""
    test_run = f"test_404_cache_reg_{uuid.uuid4().hex[:8]}"
    endpoint = "/v2/mining/companies/performance/missing-target/"
    params = {"slug": "missing-target"}
    p_hash = compute_params_hash(params)

    # Persist a 404 entry in raw.responses
    async with async_session() as session:
        await save_raw_response_async(
            endpoint=endpoint,
            params=params,
            params_hash=p_hash,
            payload=None,
            status_code=404,
            credits_charged=1,
            tier="warm",
            session=session,
            run_id=test_run,
        )
        await session.commit()

        # Direct cache query should return None (not 404 row)
        cached = await get_cached_response_async(endpoint, p_hash, session)
        assert cached is None

    # In dry-run mode, client.get must raise DryRunCacheMissError (not return None or 404)
    settings = Settings(
        gali_dry_run=True,
        sectors_api_key="",
    )
    client = SectorsClient(settings=settings)

    try:
        with pytest.raises(DryRunCacheMissError):
            await client.get(endpoint=endpoint, params=params, tier="warm")
    finally:
        await client.close()
        # Clean up
        async with async_session() as session:
            await session.execute(text("DELETE FROM raw.responses WHERE run_id = :run_id"), {"run_id": test_run})
            await session.commit()
