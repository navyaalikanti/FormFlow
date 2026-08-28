from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.models.form_platform import Response, ResponseAnswer
from app.services.submission_service import SubmissionService
from app.services.submission_service import _extract_file_keys
from app.schemas.files import (
    FileStorageDeleteResponse,
    FileStorageDownloadResponse,
    FileUploadBatchResponse,
    FileUploadItemResponse,
    PublicFileUploadResponse,
)
from app.services.file_storage_service import FileStorageService, FileStorageServiceError
from app.services.supabase_storage_service import SupabaseStorageError


router = APIRouter(prefix="/files", tags=["Files"])
public_router = APIRouter(prefix="/public/forms", tags=["Public File Uploads"])


def _parse_validation_rules(validation_rules: str | None) -> dict[str, Any]:
    if not validation_rules:
        return {}
    try:
        parsed = json.loads(validation_rules)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Invalid validation rules JSON."},
        ) from exc
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Validation rules must be a JSON object."},
        )
    return parsed


def _find_field_in_snapshot(snapshot: dict[str, Any], field_key: str) -> dict[str, Any] | None:
    for section in snapshot.get("sections", []):
        for field in section.get("fields", []):
            if field.get("field_key") == field_key:
                return field
    return None


@router.post(
    "/upload",
    response_model=FileUploadBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload files to Supabase Storage",
)
async def upload_files(
    files: list[UploadFile] = File(...),
    validation_rules: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FileUploadBatchResponse:
    rules = _parse_validation_rules(validation_rules)
    try:
        uploaded_files = FileStorageService.upload_files(db, files, current_admin.id, rules)
    except FileStorageServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(exc)},
        ) from exc
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": str(exc)},
        ) from exc

    items = [FileStorageService.build_file_upload_item_response(storage_file) for storage_file in uploaded_files]
    return FileUploadBatchResponse(items=items)


@router.get(
    "/{file_key}",
    response_model=FileStorageDownloadResponse,
    summary="Generate a signed download URL",
)
def get_file(
    file_key: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    expires_in: int = Query(default=600, ge=60, le=3600),
    download: bool = Query(default=True),
) -> FileStorageDownloadResponse:
    try:
        storage_file = FileStorageService.get_file_or_404(db, file_key)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc

    if storage_file.uploaded_by is not None and storage_file.uploaded_by != current_admin.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this file")

    try:
        return FileStorageService.build_file_download_response(storage_file, expires_in, download=download)
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": str(exc)},
        ) from exc


@router.delete(
    "/{file_key}",
    response_model=FileStorageDeleteResponse,
    summary="Delete a file and soft-delete its metadata",
)
def delete_file(
    file_key: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FileStorageDeleteResponse:
    try:
        storage_file = FileStorageService.get_file_or_404(db, file_key)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc

    if storage_file.uploaded_by is not None and storage_file.uploaded_by != current_admin.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to delete this file")

    try:
        FileStorageService.delete_file(db, storage_file)
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": str(exc)},
        ) from exc

    return FileStorageDeleteResponse(file_key=file_key)


@public_router.post(
    "/{link_token}/fields/{field_key}/files/upload",
    response_model=PublicFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload respondent files for a published form field",
)
async def public_upload_files(
    link_token: str,
    field_key: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> PublicFileUploadResponse:
    try:
        form, _, snapshot, _ = SubmissionService.resolve_public_form_context(db, link_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc

    field = _find_field_in_snapshot(snapshot, field_key)
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found in published form")
    if field.get("field_type") != "file":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This field does not accept file uploads")

    effective_rules = dict(field.get("validation_rules", {}) or {})
    if not field.get("allows_multiple", False):
        effective_rules["max_file_count"] = min(int(effective_rules.get("max_file_count", 1) or 1), 1)

    try:
        uploaded_files = FileStorageService.upload_files(
            db,
            files,
            uploaded_by_admin_id=None,
            form_id=form.id,
            field_id=UUID(str(field["id"])),
            validation_rules=effective_rules,
        )
    except FileStorageServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(exc)},
        ) from exc
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": str(exc)},
        ) from exc

    return PublicFileUploadResponse(
        file_keys=[storage_file.file_key for storage_file in uploaded_files],
        items=[FileStorageService.build_file_upload_item_response(storage_file) for storage_file in uploaded_files],
    )


@public_router.get(
    "/{link_token}/fields/{field_key}/files/{file_key}",
    response_model=FileStorageDownloadResponse,
    summary="Generate a signed preview URL for a respondent file",
)
def public_get_file(
    link_token: str,
    field_key: str,
    file_key: str,
    db: Session = Depends(get_db),
    expires_in: int = Query(default=600, ge=60, le=3600),
    download: bool = Query(default=True),
) -> FileStorageDownloadResponse:
    try:
        form, _, snapshot, _ = SubmissionService.resolve_public_form_context(db, link_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc

    field = _find_field_in_snapshot(snapshot, field_key)
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found in published form")

    storage_file = FileStorageService.get_file_or_404(db, file_key)
    if storage_file.form_id != form.id or storage_file.field_id != UUID(str(field["id"])):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    try:
        return FileStorageService.build_file_download_response(storage_file, expires_in, download=download)
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": str(exc)},
        ) from exc


@public_router.delete(
    "/{link_token}/fields/{field_key}/files/{file_key}",
    response_model=FileStorageDeleteResponse,
    summary="Delete a pre-submit respondent file",
)
def public_delete_file(
    link_token: str,
    field_key: str,
    file_key: str,
    db: Session = Depends(get_db),
) -> FileStorageDeleteResponse:
    try:
        form, _, snapshot, _ = SubmissionService.resolve_public_form_context(db, link_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc

    field = _find_field_in_snapshot(snapshot, field_key)
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found in published form")

    storage_file = FileStorageService.get_file_or_404(db, file_key)
    if storage_file.form_id != form.id or storage_file.field_id != UUID(str(field["id"])):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    submitted_values = db.scalars(
        select(ResponseAnswer.answer_value)
        .join(Response, ResponseAnswer.response_id == Response.id)
        .where(Response.form_id == form.id)
        .where(Response.status == "submitted")
        .where(ResponseAnswer.field_id == UUID(str(field["id"])))
    ).all()

    if any(file_key in _extract_file_keys(answer_value) for answer_value in submitted_values):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This file is already attached to a submitted response and cannot be deleted.",
        )

    try:
        FileStorageService.delete_file(db, storage_file)
    except SupabaseStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": str(exc)},
        ) from exc

    return FileStorageDeleteResponse(file_key=file_key)
