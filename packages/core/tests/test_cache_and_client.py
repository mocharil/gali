"""Unit tests for cache lookup and SectorsClient behavior."""

import pytest
import respx
from sqlalchemy import text

from gali_core.config import Settings
from gali_core.db.base import async_session
from gali_core.sectors.cache import (
    compute_params_hash,
    get_cached_response_async,
    save_raw_response_async,
)
from gali_core.sectors.client import DryRunCacheMissError, SectorsClient


def test_params_hash_deterministic() -> None:
    h1 = compute_params_hash({"a": 1, "b": "xyz", "c": [1, 2]})
    h2 = compute_params_hash({"c": [1, 2], "a": 1, "b": "xyz"})
    assert h1 == h2
    assert len(h1) == 64

    # Empty dict and None produce same empty hash
    assert compute_params_hash({}) == compute_params_hash(None)


@pytest.mark.asyncio
async def test_cache_persistence_and_hit() -> None:
    endpoint = "/v2/test/cache-probe/"
    params = {"page": 1, "limit": 30}
    p_hash = compute_params_hash(params)
    mock_payload = {"data": "test_data", "count": 42}
    test_run_id = "test_cache_run_01"

    async with async_session() as session:
        async with session.begin():
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

            # Clean up
            await session.execute(
                text("DELETE FROM raw.responses WHERE run_id = :run_id"),
                {"run_id": test_run_id},
            )


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
    test_run = "test_dry_run_hit"
    endpoint = "/v2/mining/cached-test/"
    params = {"slug": "test-slug"}
    p_hash = compute_params_hash(params)
    payload = {"company": "Test PT", "reserves": 500}

    async with async_session() as session:
        async with session.begin():
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

    settings = Settings(
        gali_dry_run=True,
        sectors_api_key="",
    )
    client = SectorsClient(settings=settings)

    result = await client.get(endpoint=endpoint, params=params, tier="warm")
    assert result == payload

    await client.close()

    # Clean up
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                text("DELETE FROM raw.responses WHERE run_id = :run_id"),
                {"run_id": test_run},
            )


@pytest.mark.asyncio
@respx.mock
async def test_sectors_client_live_mock_flow() -> None:
    test_run = "test_live_mock_run"
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

    await client.close()

    # Clean up DB
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                text("DELETE FROM raw.responses WHERE run_id = :run_id"),
                {"run_id": test_run},
            )
            await session.execute(
                text("DELETE FROM ops.credit_ledger WHERE run_id = :run_id"),
                {"run_id": test_run},
            )
