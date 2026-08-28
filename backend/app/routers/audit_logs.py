from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.schemas.audit_logs import AuditLogListResponse
from app.services.audit_log_service import AuditLogService

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])


@router.get(
    "",
    response_model=AuditLogListResponse,
    summary="Get audit logs",
    description="Retrieve paginated and filtered audit logs for the authenticated admin's workspace.",
)
def get_audit_logs(
    form_id: UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> AuditLogListResponse:
    try:
        result = AuditLogService.list_audit_logs(
            db=db,
            admin_id=current_admin.id,
            form_id=form_id,
            action=action,
            page=page,
            limit=limit,
        )
        return AuditLogListResponse.model_validate(result)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
