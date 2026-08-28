from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogResponseItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: int | None
    user_name: str | None = None
    user_email: str | None = None
    action: str
    form_id: UUID | None
    form_title: str | None = None
    resource_type: str
    resource_id: str | None
    details: dict[str, Any]
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponseItem]
    total: int
