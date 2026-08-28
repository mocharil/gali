"""Main Dagster Definitions entrypoint."""

from __future__ import annotations

from dagster import Definitions

from gali_pipeline.assets import ALL_ASSETS
from gali_pipeline.resources import DbResource, RedisResource, SectorsResource
from gali_pipeline.schedules import ALL_JOBS, ALL_SCHEDULES

defs = Definitions(
    assets=ALL_ASSETS,
    schedules=ALL_SCHEDULES,
    jobs=ALL_JOBS,
    resources={
        "db": DbResource(),
        "sectors": SectorsResource(),
        "redis": RedisResource(),
    },
)
