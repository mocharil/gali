"""FastAPI Application Entrypoint for GALI Intelligence API."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from gali_core.config import get_settings
from prometheus_fastapi_instrumentator import Instrumentator

from gali_api.dependencies import close_redis_pool, init_redis_pool
from gali_api.ratelimit import RateLimitMiddleware
from gali_api.routers import (
    cost_curve,
    coverage,
    flow_overlay,
    issuers,
    ops,
    rankings,
    scenario,
    sites,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gali_api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Lifespan context for startup and shutdown resource management."""
    logger.info("Initializing GALI API services...")
    await init_redis_pool()

    # Optional Sentry initialization
    settings = get_settings()
    if settings.sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                environment=settings.environment,
                traces_sample_rate=0.1,
            )
            logger.info("Sentry monitoring initialized.")
        except Exception as exc:
            logger.warning("Failed to initialize Sentry: %s", exc)

    yield

    logger.info("Closing GALI API services...")
    await close_redis_pool()


app = FastAPI(
    title="GALI — Ground-truth Analytics for Listed Issuers API",
    description=(
        "Production read API and live scenario simulation engine bridging upstream Indonesian mining "
        "concession intelligence (ESDM) with listed capital market equity valuations (IDX)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware — origins come from CORS_ALLOW_ORIGINS (settings.cors_origins), never hardcoded.
# A wildcard "*" combined with allow_credentials=True lets Starlette reflect ANY request Origin
# verbatim (it cannot send an actual "*" header when credentials are allowed), which is equivalent
# to no CORS restriction at all — do not reintroduce "*" here.
_cors_settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware — Redis sliding-window counter per client IP (anon) or API key (keyed).
# Limits come from settings.rate_limit_anon_per_min / rate_limit_keyed_per_min.
# Fail-open: if Redis is down, rate limiting is bypassed rather than blocking all traffic.
app.add_middleware(RateLimitMiddleware)


@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next) -> Response:
    """Add X-Request-ID and X-Process-Time headers to every response."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.perf_counter()

    response = await call_next(request)

    process_time = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response


# Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
            }
        },
    )


# Prometheus Instrumentation
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Register Routers
app.include_router(ops.router)
app.include_router(issuers.router)
app.include_router(sites.router)
app.include_router(rankings.router)
app.include_router(cost_curve.router)
app.include_router(scenario.router)
app.include_router(flow_overlay.router)
app.include_router(coverage.router)
