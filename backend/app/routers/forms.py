from __future__ import annotations
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.models.form_platform import Form, Section, Field, FormVersion
from app.schemas.auth import AdminResponse
from app.schemas.forms import (
    DuplicateResponse,
    FormCreate,
    FormListResponse,
    FormResponse,
    FormUpdate,
    MessageResponse,
    PublishOptionsRequest,
    PublishResponse,
    FormVersionResponse,
    FormVersionListResponse,
    FormVersionDetailResponse,
    RestoreVersionRequest,
    RestoreVersionResponse,
    SectionResponse,
    FieldResponse,
    FieldOptionResponse,
)
from app.schemas.responses import PublicFormSubmitRequest, PublicFormSubmitResponse
from app.schemas.analytics import FormAnalyticsResponse
from app.services.form_service import FormAccessDeniedException, FormNotFoundException, FormService, FormValidationException
from app.services.submission_service import SubmissionService


router = APIRouter(prefix="/forms", tags=["Form Management"])
public_router = APIRouter(prefix="/public/forms", tags=["Public Forms"])


def _handle_not_found() -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")


def _handle_validation_error(exc: FormValidationException) -> None:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={"message": "Form cannot be published.", "errors": [error.model_dump() for error in exc.errors]},
    ) from exc


@router.post(
    "",
    response_model=FormResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a form",
    description="Create a new draft form with Version 1 for the authenticated admin.",
)
def create_form(
    payload: FormCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponse:
    try:
        form = FormService.create_form(db, current_admin, payload)
    except FormNotFoundException:
        _handle_not_found()
    return FormResponse.model_validate(form)


@router.get(
    "",
    response_model=FormListResponse,
    summary="List forms",
    description="Return all forms owned by the authenticated admin. Each form appears exactly once.",
)
def list_forms(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormListResponse:
    forms = FormService.list_forms(db, current_admin)
    return FormListResponse(items=[FormResponse.model_validate(form) for form in forms])


@router.get(
    "/{form_id}",
    response_model=FormResponse,
    summary="Get a form",
    description="Return a single form with its sections and fields.",
)
def get_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponse:
    try:
        form = FormService.get_form(db, current_admin, form_id)
    except FormNotFoundException as exc:
        _handle_not_found()
    return FormResponse.model_validate(form)


@router.put(
    "/{form_id}",
    response_model=FormResponse,
    summary="Update a form",
    description="Update form metadata and optionally replace the full section structure.",
)
def update_form(
    form_id: UUID,
    payload: FormUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponse:
    try:
        form = FormService.update_form(db, current_admin, form_id, payload)
    except FormNotFoundException:
        _handle_not_found()
    return FormResponse.model_validate(form)


@router.delete(
    "/{form_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a form",
    description="Delete a form and all its versions owned by the authenticated admin.",
)
def delete_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> MessageResponse:
    try:
        FormService.delete_form(db, current_admin, form_id)
    except FormNotFoundException:
        _handle_not_found()
    return MessageResponse(message="Form deleted successfully.")


@router.post(
    "/{form_id}/duplicate",
    response_model=DuplicateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate a form",
    description="Create a brand-new separate Form (not a version) as a copy of an existing form.",
)
def duplicate_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> DuplicateResponse:
    try:
        form = FormService.duplicate_form(db, current_admin, form_id)
    except FormNotFoundException:
        _handle_not_found()
    return DuplicateResponse(form=FormResponse.model_validate(form))


@router.post(
    "/{form_id}/publish",
    response_model=PublishResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish a form",
    description=(
        "Validate the form, then transition the existing Draft FormVersion to Published status. "
        "Does NOT create a duplicate FormVersion. The Form ID never changes."
    ),
)
def publish_form(
    form_id: UUID,
    payload: PublishOptionsRequest | None = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PublishResponse:
    try:
        form, version = FormService.publish_form(db, current_admin, form_id, publish_options=payload)
    except FormNotFoundException:
        _handle_not_found()
    except FormValidationException as exc:
        _handle_validation_error(exc)
    return PublishResponse(form=FormResponse.model_validate(form), version_id=version.id, version_number=version.version_number)


@router.post(
    "/{form_id}/edit-as-draft",
    response_model=FormResponse,
    summary="Edit a published form as draft",
    description=(
        "Creates the next draft FormVersion under the SAME Form (same form_id). "
        "Rebuilds live sections/fields from the latest published snapshot. "
        "If a draft already exists, returns the form as-is (idempotent). "
        "The form_id in the response will always match the request form_id."
    ),
)
def edit_as_draft(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponse:
    try:
        form = FormService.edit_as_new_draft(db, current_admin, form_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except FormNotFoundException:
        _handle_not_found()
    return FormResponse.model_validate(form)


@router.post(
    "/{form_id}/unpublish",
    response_model=FormResponse,
    summary="Unpublish a form",
    description="Return a published form to draft state without deleting its version history.",
)
def unpublish_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponse:
    try:
        form = FormService.unpublish_form(db, current_admin, form_id)
    except FormNotFoundException:
        _handle_not_found()
    return FormResponse.model_validate(form)


@router.post(
    "/{form_id}/archive",
    response_model=FormResponse,
    summary="Archive a form",
    description="Mark a form as archived so it is no longer active for publishing or distribution.",
)
def archive_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponse:
    try:
        form = FormService.archive_form(db, current_admin, form_id)
    except FormNotFoundException:
        _handle_not_found()
    return FormResponse.model_validate(form)


@router.post(
    "/{form_id}/restore",
    response_model=FormResponse,
    summary="Restore a form",
    description="Restore an archived form back to draft state.",
)
def restore_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormResponse:
    try:
        form = FormService.restore_form(db, current_admin, form_id)
    except FormNotFoundException:
        _handle_not_found()
    return FormResponse.model_validate(form)


@router.get(
    "/{form_id}/analytics",
    response_model=FormAnalyticsResponse,
    summary="Get per-field analytics for a form",
    description="Returns per-field distribution analytics for a specific form owned by the admin.",
)
def get_form_analytics(
    form_id: UUID,
    version_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormAnalyticsResponse:
    try:
        analytics = SubmissionService.get_form_analytics(db, form_id, current_admin.id, version_id=version_id)
        return FormAnalyticsResponse.model_validate(analytics)
    except LookupError:
        _handle_not_found()


# ─── Public Forms Endpoints (No Authentication Required) ──────────────────────


@public_router.get(
    "/{token}/status",
    summary="Get public form acceptance status",
    description="Returns whether the form is currently accepting responses, and the reason if not.",
)
def get_public_form_status(
    token: str,
    db: Session = Depends(get_db),
) -> dict:
    try:
        status_info = SubmissionService.get_form_submission_status(db, token)
        return status_info
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found.") from exc


@public_router.get(
    "/{token}",
    response_model=FormResponse,
    summary="Get a published form by token",
    description="Retrieve a published form using its share token. No authentication required.",
)
def get_public_form(
    token: str,
    db: Session = Depends(get_db),
) -> FormResponse:
    try:
        return SubmissionService.build_public_form_response(db, token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found. The link may be invalid or expired.") from exc


@public_router.get(
    "/version/{version_token}",
    response_model=FormResponse,
    summary="Get a specific form version by token",
    description="Retrieve a specific published version of a form using its version-specific link token. No authentication required.",
)
def get_public_form_version(
    version_token: str,
    db: Session = Depends(get_db),
) -> FormResponse:
    try:
        return SubmissionService.build_public_form_response(db, version_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form version not found. The link may be invalid or expired.") from exc


@public_router.post(
    "/{link_token}/submit",
    response_model=PublicFormSubmitResponse,
    summary="Submit a public form",
    description="Validate and store a submission for a published form version.",
)
def submit_public_form(
    link_token: str,
    payload: PublicFormSubmitRequest,
    db: Session = Depends(get_db),
) -> PublicFormSubmitResponse:
    try:
        result = SubmissionService.submit_public_form(db, link_token, payload.answers, payload.metadata)
        return PublicFormSubmitResponse.model_validate(result)
    except ValueError as exc:
        # Response limit / deadline errors are single strings – return 410
        first_arg = exc.args[0] if exc.args else ""
        if isinstance(first_arg, str) and first_arg in ("response_limit_reached", "deadline_passed", "archived"):
            raise HTTPException(status_code=status.HTTP_410_GONE, detail=first_arg) from exc
        # Field validation errors are lists – return 422
        errors = first_arg if isinstance(first_arg, list) else []
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Form submission failed validation", "errors": errors},
        ) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found. The link may be invalid or expired.") from exc


# ─── Version Management Endpoints ───────────────────────────────────────────

@router.get(
    "/{form_id}/versions",
    response_model=FormVersionListResponse,
    summary="Get form version history",
    description="List all versions of a form (both draft and published), newest first.",
)
def get_form_versions(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormVersionListResponse:
    try:
        versions = FormService.get_form_versions(db, current_admin, form_id)
        form = FormService.get_form(db, current_admin, form_id)

        return FormVersionListResponse(
            items=[FormVersionResponse.model_validate(v) for v in versions],
            total=len(versions),
            current_version_id=form.published_version_id,
        )
    except FormNotFoundException:
        _handle_not_found()


@router.get(
    "/{form_id}/versions/{version_id}",
    response_model=FormVersionDetailResponse,
    summary="Get form version details",
    description="Get a specific version with its complete snapshot.",
)
def get_form_version(
    form_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FormVersionDetailResponse:
    try:
        version = FormService.get_form_version(db, current_admin, form_id, version_id)
        return FormVersionDetailResponse.model_validate(version)
    except FormNotFoundException:
        _handle_not_found()


@router.post(
    "/{form_id}/versions/{version_id}/restore",
    response_model=RestoreVersionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Restore a version as new draft",
    description=(
        "Create a new draft FormVersion from a previous published version. "
        "Rebuilds live form structure from that version's snapshot. "
        "Fails if an active draft already exists."
    ),
)
def restore_version(
    form_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> RestoreVersionResponse:
    try:
        form, new_version = FormService.restore_version_as_draft(db, current_admin, form_id, version_id)
        return RestoreVersionResponse(
            form=FormResponse.model_validate(form),
            new_version_id=new_version.id,
            new_draft_version_number=new_version.version_number,
        )
    except FormNotFoundException:
        _handle_not_found()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
