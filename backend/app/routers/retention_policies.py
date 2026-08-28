"""API endpoints for retention policy management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.models.form_platform import Form
from app.models.retention_policies import RetentionPolicy
from app.schemas.retention_policies import (
    RetentionPolicyResponse,
    RetentionPolicyUpdate,
    RetentionArchivalResult,
)
from app.services.retention_service import RetentionService


router = APIRouter(prefix="/forms", tags=["Retention Policies"])


@router.get(
    "/{form_id}/retention-policy",
    response_model=RetentionPolicyResponse,
    summary="Get form retention policy",
    description="Retrieve the retention policy for a form.",
)
def get_retention_policy(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> RetentionPolicyResponse:
    """Get retention policy for a form owned by the current admin."""
    # Verify form ownership
    form = db.scalars(
        select(Form).where(Form.id == form_id, Form.owner_admin_id == current_admin.id)
    ).first()

    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    # Get or create default retention policy
    policy = RetentionService.get_or_create_retention_policy(db, form_id)

    return RetentionPolicyResponse.model_validate(policy)


@router.patch(
    "/{form_id}/retention-policy",
    response_model=RetentionPolicyResponse,
    summary="Update form retention policy",
    description="Update the retention policy for a form.",
)
def update_retention_policy(
    form_id: UUID,
    payload: RetentionPolicyUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> RetentionPolicyResponse:
    """Update retention policy for a form owned by the current admin."""
    # Verify form ownership
    form = db.scalars(
        select(Form).where(Form.id == form_id, Form.owner_admin_id == current_admin.id)
    ).first()

    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    # Update policy
    policy = RetentionService.update_retention_policy(
        db,
        form_id,
        enabled=payload.enabled,
        retention_days=payload.retention_days,
        action=payload.action,
    )

    return RetentionPolicyResponse.model_validate(policy)


@router.post(
    "/admin/retention/run",
    response_model=RetentionArchivalResult,
    summary="Manually trigger retention archival",
    description="Manually run the retention archival job (admin only).",
    status_code=status.HTTP_200_OK,
)
def trigger_retention_archival(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> RetentionArchivalResult:
    """Manually trigger retention archival for testing (admin only)."""
    import time

    start_time = time.time()
    result = RetentionService.archive_expired_responses(db)
    execution_time_ms = int((time.time() - start_time) * 1000)

    return RetentionArchivalResult(
        forms_processed=result["forms_processed"],
        responses_archived=result["responses_archived"],
        execution_time_ms=execution_time_ms,
    )
