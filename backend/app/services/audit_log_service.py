from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session, selectinload

from app.models.form_platform import AuditLog, Form


class AuditLogService:
    @staticmethod
    def create_audit_log(
        db: Session,
        user_id: int | None,
        action: str,
        form_id: UUID | None = None,
        resource_type: str = "form",
        resource_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> AuditLog:
        """Create a new audit log entry and commit it to the database."""
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            form_id=form_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    @staticmethod
    def list_audit_logs(
        db: Session,
        admin_id: int,
        form_id: UUID | None = None,
        action: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> dict[str, Any]:
        """Retrieve paginated, filtered audit logs for forms owned by the admin, or actions performed by the admin."""
        # 1. Base query: restrict to logs owned by the admin's forms, or performed by the admin
        stmt = (
            select(AuditLog)
            .outerjoin(Form, AuditLog.form_id == Form.id)
            .where(
                or_(
                    AuditLog.user_id == admin_id,
                    Form.owner_admin_id == admin_id,
                )
            )
        )

        # 2. Filters
        if form_id is not None:
            # First verify the admin owns this form (security check)
            form_exists = db.scalar(
                select(Form).where(Form.id == form_id, Form.owner_admin_id == admin_id)
            )
            if not form_exists:
                raise PermissionError("You do not have access to this form's audit logs.")
            stmt = stmt.where(AuditLog.form_id == form_id)

        if action is not None:
            stmt = stmt.where(AuditLog.action == action)

        # 3. Count total matching logs
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = db.scalar(count_stmt) or 0

        # 4. Paginate and order by newest first, eager-load user/form relations for serialization
        offset = (page - 1) * limit
        stmt = (
            stmt.order_by(AuditLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .options(selectinload(AuditLog.user), selectinload(AuditLog.form))
        )
        items = list(db.scalars(stmt).all())

        return {"items": items, "total": total}
