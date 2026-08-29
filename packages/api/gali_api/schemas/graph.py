"""Schemas for Issuer Entity & Concession Graph Visualizations."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: str
    type: Literal["issuer", "operating_company", "mining_site", "license", "contractor"]
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    weight: float | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class IssuerGraphResponse(BaseModel):
    symbol: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
