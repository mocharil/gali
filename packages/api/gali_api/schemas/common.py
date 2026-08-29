"""Common Pydantic v2 schemas and response models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: dict[str, Any] | None = Field(default=None, description="Optional extra error context")


class ErrorResponse(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: str = Field(default="ok", json_schema_extra={"example": "ok"})
    version: str = Field(default="v1.0.0")


class ReadyResponse(BaseModel):
    status: str = Field(default="ready", json_schema_extra={"example": "ready"})
    database: bool
    redis: bool
    published_run_id: str | None = None
