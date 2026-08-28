from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FileStorageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    file_key: str
    original_name: str
    bucket_name: str
    object_path: str
    content_type: str | None
    extension: str | None
    size: int
    checksum: str | None
    uploaded_by: int | None
    uploaded_at: datetime
    deleted_at: datetime | None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class FileStorageDownloadResponse(FileStorageResponse):
    signed_download_url: str
    expires_in_seconds: int = 600


class FileStorageDeleteResponse(BaseModel):
    success: bool = True
    file_key: str
    message: str = "File deleted successfully."


class FileUploadItemResponse(FileStorageResponse):
    signed_download_url: str | None = None


class FileUploadBatchResponse(BaseModel):
    items: list[FileUploadItemResponse] = Field(default_factory=list)


class PublicFileUploadResponse(BaseModel):
    file_keys: list[str] = Field(default_factory=list)
    items: list[FileUploadItemResponse] = Field(default_factory=list)
