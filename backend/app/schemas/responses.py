from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.files import FileUploadItemResponse


class PublicFormSubmitRequest(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SubmissionAnswerResponse(BaseModel):
    field_id: UUID
    field_key: str
    field_label: str
    field_type: str
    value: Any = None
    display_value: str | None = None
    download_url: str | None = None
    files: list[FileUploadItemResponse] = Field(default_factory=list)


class SubmissionResponseItem(BaseModel):
    response_id: UUID
    submitted_at: datetime
    answers: list[SubmissionAnswerResponse] = Field(default_factory=list)


class FormResponsesResponse(BaseModel):
    total_responses: int
    latest_submission: datetime | None = None
    responses: list[SubmissionResponseItem] = Field(default_factory=list)


class PublicFormSubmitResponse(BaseModel):
    success: bool = True
    response_id: UUID
    submitted_at: datetime


class BulkDeleteResponsesRequest(BaseModel):
    response_ids: list[UUID]


class BulkDeleteResponsesResponse(BaseModel):
    deleted_count: int

