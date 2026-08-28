"""API endpoints for form submissions and response retrieval."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.models.form_platform import Form
from app.schemas.responses import (
    BulkDeleteResponsesRequest,
    BulkDeleteResponsesResponse,
    FormResponsesResponse,
    PublicFormSubmitRequest,
    PublicFormSubmitResponse,
)
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/api/v1", tags=["responses"])


@router.post(
    "/forms/{form_id}/responses",
    response_model=PublicFormSubmitResponse,
    summary="Submit a form response",
    description="Compatibility endpoint for submitting a response using a form id.",
)
def submit_form_response(
    form_id: UUID,
    payload: PublicFormSubmitRequest,
    db: Session = Depends(get_db),
) -> PublicFormSubmitResponse:
    form = db.scalars(
        select(Form)
        .where(Form.id == form_id)
        .where(Form.status == "published")
    ).first()
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    try:
        result = SubmissionService.submit_public_form(db, form.share_token, payload.answers, payload.metadata)
        return PublicFormSubmitResponse.model_validate(result)
    except ValueError as exc:
        errors = exc.args[0] if exc.args else []
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Form submission failed validation", "errors": errors},
        ) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc


@router.get(
    "/forms/{form_id}/responses",
    response_model=FormResponsesResponse,
    summary="List form responses",
    description="Return all submissions for a form, grouped by submission.",
)
def list_form_responses(
    form_id: UUID,
    form_version_id: UUID | None = Query(default=None),
    field_id: str | None = Query(default=None),
    field_value: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponsesResponse:
    try:
        result = SubmissionService.list_form_responses(db, form_id, current_admin.id, form_version_id, field_id, field_value)
        return FormResponsesResponse.model_validate(result)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/forms/{form_id}/responses/export",
    summary="Export form responses",
    description="Export submissions for a form as CSV or JSON.",
)
def export_form_responses(
    form_id: UUID,
    format: str = Query(..., pattern="^(csv|json)$"),
    form_version_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> StreamingResponse:
    try:
        result = SubmissionService.export_form_responses(db, form_id, current_admin.id, format, form_version_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return StreamingResponse(
        result["content"],
        media_type=result["media_type"],
        headers=result["headers"],
    )


@router.delete(
    "/forms/{form_id}/responses/bulk",
    response_model=BulkDeleteResponsesResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk delete form responses",
    description="Permanently delete multiple form responses and all their associated records.",
)
def bulk_delete_form_responses(
    form_id: UUID,
    payload: BulkDeleteResponsesRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> BulkDeleteResponsesResponse:
    try:
        deleted_count = SubmissionService.delete_responses_bulk(
            db, form_id, payload.response_ids, current_admin.id
        )
        return BulkDeleteResponsesResponse(deleted_count=deleted_count)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.delete(
    "/forms/{form_id}/responses/{response_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a form response",
    description="Permanently delete a single form response and all its associated answer records.",
)
def delete_form_response(
    form_id: UUID,
    response_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> dict:
    try:
        SubmissionService.delete_response(db, form_id, response_id, current_admin.id)
        return {"message": "Response deleted successfully."}
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
