"""SQLAlchemy declarative base and engine/session factories.

Two engines exist on purpose:
  * async  (asyncpg)  -> FastAPI request handling
  * sync   (psycopg)  -> Alembic migrations and Dagster asset bodies

Both point at the same database; the split only reflects driver capability.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from functools import lru_cache
from typing import Any

from sqlalchemy import MetaData, create_engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool

from gali_core.config import get_settings

SCHEMAS = ("raw", "core", "market", "graph", "metrics", "ops")

# Explicit naming convention so Alembic autogenerate produces stable, diffable
# constraint names instead of database-assigned ones.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_N_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


@lru_cache(maxsize=1)
def get_async_engine() -> AsyncEngine:
    s = get_settings()
    is_test = s.environment in ("test", "testing", "development")
    pool_cls = NullPool if is_test else AsyncAdaptedQueuePool
    kwargs: dict[str, Any] = {
        "pool_pre_ping": True,
        "future": True,
        "poolclass": pool_cls,
    }
    if pool_cls is not NullPool:
        kwargs["pool_size"] = s.db_pool_size
        kwargs["max_overflow"] = s.db_max_overflow
    return create_async_engine(s.database_url, **kwargs)


@lru_cache(maxsize=1)
def get_sync_engine() -> Any:
    s = get_settings()
    return create_engine(s.database_url_sync, pool_pre_ping=True, future=True)


@lru_cache(maxsize=1)
def _async_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_async_engine(), expire_on_commit=False)


@lru_cache(maxsize=1)
def _sync_session_factory() -> sessionmaker[Session]:
    return sessionmaker(get_sync_engine(), expire_on_commit=False)


@asynccontextmanager
async def async_session() -> AsyncIterator[AsyncSession]:
    async with _async_session_factory()() as session:
        yield session


@contextmanager
def sync_session() -> Iterator[Session]:
    with _sync_session_factory()() as session:
        yield session
