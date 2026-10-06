"""Ensure scheduled ingestion respects the operator's explicit offline mode."""

import pytest
from gali_core.config import Settings
from gali_pipeline import resources


@pytest.mark.parametrize(
    ("environment_mode", "override", "expected"),
    [(True, None, True), (False, None, False), (True, False, False), (False, True, True)],
)
def test_sectors_resource_honors_environment_unless_explicitly_overridden(
    monkeypatch, environment_mode, override, expected
):
    settings = Settings(gali_dry_run=environment_mode)
    monkeypatch.setattr(resources, "get_settings", lambda: settings)
    monkeypatch.setattr(resources, "SectorsClient", lambda *, settings: settings)

    configured = resources.SectorsResource(dry_run=override).get_client()

    assert configured.gali_dry_run is expected
    assert settings.gali_dry_run is environment_mode
