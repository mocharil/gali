"""Dagster resources for GALI pipeline."""

from __future__ import annotations

from typing import Any

from dagster import ConfigurableResource
from gali_core.config import get_settings
from gali_core.db.base import async_session
from gali_core.sectors.client import SectorsClient
from pydantic import Field


class DbResource(ConfigurableResource):
    """Provides async database sessions for pipeline execution."""

    def get_session(self) -> Any:
        return async_session()


class SectorsResource(ConfigurableResource):
    """Provides SectorsClient instance with caching and rate limiting."""

    dry_run: bool = Field(default=False, description="Whether to run in offline dry-run mode.")

    def get_client(self) -> SectorsClient:
        settings = get_settings().model_copy(update={"gali_dry_run": self.dry_run})
        return SectorsClient(settings=settings)


class RedisResource(ConfigurableResource):
    """Provides Redis connection parameters."""

    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis connection URL.")
