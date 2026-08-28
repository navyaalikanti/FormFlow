"""Service for managing data retention policies and automatic response archival."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.form_platform import Form, Response
from app.models.retention_policies import RetentionPolicy
from app.services.audit_log_service import AuditLogService


class RetentionService:
    """Service for retention policy management and archival operations."""

    @staticmethod
    def get_or_create_retention_policy(
        db: Session,
        form_id: UUID,
    ) -> RetentionPolicy:
        """Get existing retention policy for a form, or create a default one."""
        policy = db.scalars(
            select(RetentionPolicy).where(RetentionPolicy.form_id == form_id)
        ).first()

        if policy is not None:
            return policy

        # Create default policy (disabled, 90 days)
        policy = RetentionPolicy(
            form_id=form_id,
            enabled=False,
            retention_days=90,
            action="archive",
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)
        return policy

    @staticmethod
    def update_retention_policy(
        db: Session,
        form_id: UUID,
        enabled: bool | None = None,
        retention_days: int | None = None,
        action: str | None = None,
    ) -> RetentionPolicy:
        """Update retention policy for a form."""
        policy = RetentionService.get_or_create_retention_policy(db, form_id)

        if enabled is not None:
            policy.enabled = enabled
        if retention_days is not None:
            policy.retention_days = retention_days
        if action is not None:
            policy.action = action

        db.add(policy)
        db.commit()
        db.refresh(policy)
        return policy

    @staticmethod
    def archive_expired_responses(db: Session) -> dict[str, int]:
        """
        Archive all responses that have exceeded their retention period.

        Returns:
            {
                "forms_processed": number of forms with enabled policies checked,
                "responses_archived": total responses archived,
            }
        """
        forms_processed = 0
        total_archived = 0

        # Get all forms with enabled retention policies
        forms = db.scalars(
            select(Form)
            .join(RetentionPolicy, Form.id == RetentionPolicy.form_id)
            .where(RetentionPolicy.enabled == True)
        ).all()

        for form in forms:
            policy = form.retention_policy
            if not policy or not policy.enabled:
                continue

            forms_processed += 1

            # Calculate cutoff date: submitted_at < now - retention_days
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=policy.retention_days)

            # Find responses to archive
            responses_to_archive = db.scalars(
                select(Response)
                .where(Response.form_id == form.id)
                .where(Response.status == "submitted")
                .where(Response.submitted_at < cutoff_date)
            ).all()

            if not responses_to_archive:
                continue

            # Archive responses by setting status
            for response in responses_to_archive:
                response.status = "archived"

            db.commit()
            archived_count = len(responses_to_archive)
            total_archived += archived_count

            # Create audit log entry
            AuditLogService.create_audit_log(
                db=db,
                user_id=None,  # System action
                action="RETENTION_ARCHIVE_RESPONSES",
                form_id=form.id,
                resource_type="response",
                details={
                    "responses_archived": archived_count,
                    "retention_days": policy.retention_days,
                    "cutoff_date": cutoff_date.isoformat(),
                },
            )

        return {
            "forms_processed": forms_processed,
            "responses_archived": total_archived,
        }
