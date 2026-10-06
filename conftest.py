"""Fixtures shared by database-backed API regression tests."""

import asyncio
import runpy
from pathlib import Path

import pytest


@pytest.fixture(scope="module")
def seeded_dataset():
    namespace = runpy.run_path(str(Path(__file__).parent / "scripts" / "seed_test_database.py"))
    return asyncio.run(namespace["seed_test_database"]())
