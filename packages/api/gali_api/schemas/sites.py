"""GeoJSON Schemas for Mining Sites (RFC 7946 compliant)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GeoJSONGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(..., description="[longitude, latitude]")


class MiningSiteProperties(BaseModel):
    slug: str
    name: str
    commodity: str | None = None
    company_slug: str | None = None
    company_name: str | None = None
    issuer_symbol: str | None = None
    province: str | None = None
    city: str | None = None
    project_name: str | None = None
    production_volume_mt: float | None = None
    is_in_universe: bool = False


class GeoJSONFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: str | None = None
    geometry: GeoJSONGeometry
    properties: MiningSiteProperties


class GeoJSONFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[GeoJSONFeature]
    total_features: int
