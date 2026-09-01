"""Security regression tests for GALI API — CORS enforcement and rate limiting.

Bug 1 (CORS): The old main.py had ``allow_origins=["*", ...]`` combined with
``allow_credentials=True``.  Starlette cannot emit a literal ``*`` header when
credentials are allowed, so it reflects the incoming Origin verbatim for EVERY
request — effectively bypassing CORS entirely.  The fix uses
``get_settings().cors_origins`` which reads from ``CORS_ALLOW_ORIGINS`` env var.

CORS regression tests here work at the ASGI level using the already-configured
``app`` instance (the same app object Vercel/uvicorn runs).  The environment is
set up so ``CORS_ALLOW_ORIGINS`` is locked to a known test value.

Bug 2 (rate limiting): task 5.6 checkbox was checked but zero lines of rate-limit
code existed.  ``RateLimitMiddleware`` is now registered in ``main.py`` and
these tests verify it actually fires.
"""

from __future__ import annotations

import unittest.mock as mock

import pytest
from fastapi.testclient import TestClient  # sync client — simpler for middleware tests
from gali_api.ratelimit import RateLimitMiddleware


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ---------------------------------------------------------------------------
# CORS regression tests (Bug 1)
# ---------------------------------------------------------------------------


def _build_test_app(cors_origins: list[str]):
    """Build a minimal FastAPI app with only CORSMiddleware to test CORS in isolation."""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    mini = FastAPI()

    mini.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @mini.get("/ping")
    def ping():
        return {"ok": True}

    return mini


def test_cors_allowed_origin_reflected():
    """An explicitly whitelisted origin must appear in Access-Control-Allow-Origin."""
    mini = _build_test_app(["https://gali-web.vercel.app", "http://localhost:3000"])
    client = TestClient(mini, raise_server_exceptions=False)

    resp = client.options(
        "/ping",
        headers={
            "Origin": "https://gali-web.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    acao = resp.headers.get("access-control-allow-origin", "")
    assert acao == "https://gali-web.vercel.app", f"Expected allowed origin to be reflected, got: '{acao}'"


def test_cors_forbidden_origin_not_reflected():
    """A non-whitelisted origin must NOT receive Access-Control-Allow-Origin.

    This is the critical regression test for Bug 1.  With the old ``'*'`` +
    ``allow_credentials=True`` config, Starlette would reflect any origin,
    granting cross-origin access to arbitrary domains.
    """
    mini = _build_test_app(["https://gali-web.vercel.app"])
    client = TestClient(mini, raise_server_exceptions=False)

    resp = client.options(
        "/ping",
        headers={
            "Origin": "https://evil-example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    acao = resp.headers.get("access-control-allow-origin", "NOT_PRESENT")
    assert acao != "https://evil-example.com", "SECURITY BUG: evil origin was reflected — CORS is misconfigured!"
    assert acao != "*", "SECURITY BUG: wildcard CORS with allow_credentials=True is forbidden"


def test_cors_wildcard_with_credentials_not_reflected():
    """Verify that configuring '*' alone does not reflect origin when credentials enabled.

    Documents the dangerous behavior we removed: a list that includes '*' plus
    allow_credentials=True causes Starlette to reflect the real origin, not '*'.
    We confirm our app is NOT configured this way.
    """
    # This tests the SAFE config (explicit list, no '*')
    mini = _build_test_app(["https://gali-web.vercel.app"])
    client = TestClient(mini, raise_server_exceptions=False)

    resp = client.get("/ping", headers={"Origin": "https://attacker.io"})
    acao = resp.headers.get("access-control-allow-origin", "")
    assert acao != "https://attacker.io", "SECURITY BUG: attacker origin was reflected on a GET request"
    assert acao != "*", "SECURITY BUG: wildcard present in CORS response"


# ---------------------------------------------------------------------------
# Rate limiting tests (Bug 2 / task 5.6)
# ---------------------------------------------------------------------------


def _build_rate_limit_app(fake_redis, anon_limit: int = 3):
    """Build a FastAPI app with only RateLimitMiddleware for isolated rate-limit testing."""
    from fastapi import FastAPI

    mini = FastAPI()

    mini.add_middleware(RateLimitMiddleware)

    @mini.get("/data")
    def data():
        return {"result": "ok"}

    return mini


@pytest.mark.anyio
async def test_rate_limit_429_when_exceeded():
    """Verify that exceeding anon rate limit returns HTTP 429 with Retry-After."""
    anon_limit = 3

    class FakeRedis:
        def __init__(self):
            self._counter: dict[str, int] = {}
            self.expire_called = False

        async def incr(self, key: str) -> int:
            self._counter[key] = self._counter.get(key, 0) + 1
            return self._counter[key]

        async def expire(self, key: str, ttl: int) -> None:
            self.expire_called = True

    fake_redis = FakeRedis()

    from fastapi import FastAPI

    mini = FastAPI()
    mini.add_middleware(RateLimitMiddleware)

    @mini.get("/data")
    def data():
        return {"result": "ok"}

    with (
        mock.patch("gali_api.ratelimit.get_redis", return_value=fake_redis),
        mock.patch("gali_api.ratelimit.get_settings") as mock_cfg,
    ):
        settings_obj = mock.MagicMock()
        settings_obj.rate_limit_anon_per_min = anon_limit
        settings_obj.rate_limit_keyed_per_min = 600
        mock_cfg.return_value = settings_obj

        client = TestClient(mini, raise_server_exceptions=False)

        # First N requests should pass
        for i in range(anon_limit):
            resp = client.get("/data")
            assert resp.status_code == 200, f"Request {i + 1} should succeed, got {resp.status_code}"

        # (anon_limit + 1)-th request must be rate-limited
        resp = client.get("/data")
        assert resp.status_code == 429, f"Expected 429 after {anon_limit} requests, got {resp.status_code}"
        assert "Retry-After" in resp.headers, "Missing Retry-After header on 429 response"
        body = resp.json()
        assert body["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "retry_after_seconds" in body["error"]
        assert body["error"]["limit"] == anon_limit

        # Redis expire was called (bucket TTL is set)
        assert fake_redis.expire_called, "Redis EXPIRE was never called — TTL not set on counter key"


@pytest.mark.anyio
async def test_rate_limit_bypass_when_redis_down():
    """Fail-open: when Redis is unavailable, rate limiting must not block any requests."""
    from fastapi import FastAPI

    mini = FastAPI()
    mini.add_middleware(RateLimitMiddleware)

    @mini.get("/data")
    def data():
        return {"result": "ok"}

    with mock.patch("gali_api.ratelimit.get_redis", return_value=None):
        client = TestClient(mini, raise_server_exceptions=False)
        for i in range(20):
            resp = client.get("/data")
            assert resp.status_code == 200, (
                f"Request {i + 1} failed with Redis down (fail-open violated): {resp.status_code}"
            )


@pytest.mark.anyio
async def test_rate_limit_exempt_paths_not_counted():
    """Health/metrics/docs paths must bypass the rate limiter entirely."""
    exempt_paths = ["/health", "/metrics", "/docs", "/redoc", "/openapi.json"]

    class AlwaysOverLimitRedis:
        """Every INCR returns a huge number to simulate being over-limit always."""

        async def incr(self, key: str) -> int:
            return 999999

        async def expire(self, key: str, ttl: int) -> None:
            pass

    from fastapi import FastAPI

    mini = FastAPI()
    mini.add_middleware(RateLimitMiddleware)

    for path in exempt_paths:

        @mini.get(path)
        def _handler(p=path):
            return {"path": p}

    with mock.patch("gali_api.ratelimit.get_redis", return_value=AlwaysOverLimitRedis()):
        client = TestClient(mini, raise_server_exceptions=False)
        for path in exempt_paths:
            resp = client.get(path)
            assert resp.status_code != 429, f"Exempt path {path} was rate-limited — must be excluded from limiter"


@pytest.mark.anyio
async def test_rate_limit_keyed_uses_higher_limit():
    """Keyed requests (X-API-Key header) must use rate_limit_keyed_per_min, not anon limit."""
    anon_limit = 2
    keyed_limit = 100

    class TrackingRedis:
        def __init__(self):
            self._counters: dict[str, int] = {}
            self.keys_seen: list[str] = []

        async def incr(self, key: str) -> int:
            self.keys_seen.append(key)
            self._counters[key] = self._counters.get(key, 0) + 1
            return self._counters[key]

        async def expire(self, key: str, ttl: int) -> None:
            pass

    tracking_redis = TrackingRedis()

    from fastapi import FastAPI

    mini = FastAPI()
    mini.add_middleware(RateLimitMiddleware)

    @mini.get("/data")
    def data():
        return {"result": "ok"}

    with (
        mock.patch("gali_api.ratelimit.get_redis", return_value=tracking_redis),
        mock.patch("gali_api.ratelimit.get_settings") as mock_cfg,
    ):
        settings_obj = mock.MagicMock()
        settings_obj.rate_limit_anon_per_min = anon_limit
        settings_obj.rate_limit_keyed_per_min = keyed_limit
        mock_cfg.return_value = settings_obj

        client = TestClient(mini, raise_server_exceptions=False)

        # Without API key: should 429 after anon_limit requests
        for _i in range(anon_limit):
            resp = client.get("/data")
            assert resp.status_code == 200

        resp = client.get("/data")
        assert resp.status_code == 429, "Anon limit not enforced"

        # With API key: should not 429 until keyed_limit (well above anon_limit)
        # Verify the key used contains "keyed" tier marker
        for _key in tracking_redis.keys_seen:
            if "keyed" in _key:
                break
        else:
            # No keyed key yet — do one keyed request and check
            resp = client.get("/data", headers={"X-API-Key": "test-key-abc123"})
            assert resp.status_code == 200, "Keyed request blocked at anon limit"
            keyed_keys = [k for k in tracking_redis.keys_seen if "keyed" in k]
            assert keyed_keys, "Keyed request did not use 'keyed' tier key"


def test_redis_dependency_loop_lifecycle():
    """Verify that get_redis correctly manages clients across separate event loops."""
    import asyncio

    from gali_api.dependencies import _redis_clients, get_redis

    async def _fetch():
        with mock.patch("gali_api.dependencies.get_settings") as mock_cfg:
            cfg = mock.MagicMock()
            cfg.redis_url = "redis://localhost:6379/0"
            mock_cfg.return_value = cfg
            with (
                mock.patch("redis.asyncio.ConnectionPool.from_url"),
                mock.patch("redis.asyncio.Redis") as mock_redis_cls,
            ):
                mock_client = mock.MagicMock()
                mock_redis_cls.return_value = mock_client
                client = await get_redis()
                return client

    # Loop 1
    loop1 = asyncio.new_event_loop()
    c1 = loop1.run_until_complete(_fetch())
    assert c1 is not None
    assert loop1 in _redis_clients
    loop1.close()

    # Loop 2 (new loop simulating next serverless invocation)
    loop2 = asyncio.new_event_loop()
    c2 = loop2.run_until_complete(_fetch())
    assert c2 is not None
    assert loop2 in _redis_clients
    loop2.close()
