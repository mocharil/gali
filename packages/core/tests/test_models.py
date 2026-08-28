"""Unit tests for ORM models and schema constraints."""

import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from gali_core.db.base import async_session
from gali_core.db.models import ApiKey, CreditLedger, DataCoverage


@pytest.mark.asyncio
async def test_api_key_model() -> None:
    test_hash = uuid.uuid4().hex
    async with async_session() as session:
        async with session.begin():
            key = ApiKey(
                key_hash=test_hash,
                label="test_key",
                rate_limit_per_min=600,
            )
            session.add(key)
            await session.flush()
            assert key.id is not None
            assert key.created_at is not None

            # Cleanup
            await session.delete(key)


@pytest.mark.asyncio
async def test_data_coverage_model() -> None:
    async with async_session() as session:
        async with session.begin():
            cov = DataCoverage(
                metric="rli_coverage",
                numerator=15,
                denominator=20,
                ratio=0.75,
                detail={"note": "fase 1 baseline test"},
            )
            session.add(cov)
            await session.flush()
            assert cov.id is not None

            # Cleanup
            await session.delete(cov)


@pytest.mark.asyncio
async def test_tier_check_constraint() -> None:
    async with async_session() as session:
        with pytest.raises(IntegrityError):
            async with session.begin():
                invalid_entry = CreditLedger(
                    endpoint="/v2/invalid",
                    credits=1,
                    tier="bad",  # violates CheckConstraint tier IN ('cold', 'warm', 'hot')
                    status_code=200,
                )
                session.add(invalid_entry)
                await session.flush()
