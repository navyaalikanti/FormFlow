"""Dashboard statistics API."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.models.form_platform import Form, Response

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    totalForms: int
    publishedForms: int
    totalResponses: int
    completionRate: float
    created_at: str


@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Get dashboard statistics",
    description=(
        "Returns aggregate statistics for the authenticated admin's workspace. "
        "Completion rate = submitted responses / total responses × 100. "
        "If there are no responses, completion rate is 0."
    ),
)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> DashboardStats:
    # Total forms owned by this admin
    total_forms: int = db.scalar(
        select(func.count(Form.id)).where(Form.owner_admin_id == current_admin.id)
    ) or 0

    # Published (live) forms
    published_forms: int = db.scalar(
        select(func.count(Form.id))
        .where(Form.owner_admin_id == current_admin.id)
        .where(Form.status == "published")
    ) or 0

    # Total responses across all forms owned by this admin (join through Form)
    total_responses: int = db.scalar(
        select(func.count(Response.id))
        .join(Form, Response.form_id == Form.id)
        .where(Form.owner_admin_id == current_admin.id)
    ) or 0

    # Submitted (completed) responses
    submitted_responses: int = db.scalar(
        select(func.count(Response.id))
        .join(Form, Response.form_id == Form.id)
        .where(Form.owner_admin_id == current_admin.id)
        .where(Response.status == "submitted")
    ) or 0

    completion_rate: float = (
        round(submitted_responses / total_responses * 100, 1)
        if total_responses > 0
        else 0.0
    )

    return DashboardStats(
        totalForms=total_forms,
        publishedForms=published_forms,
        totalResponses=total_responses,
        completionRate=completion_rate,
        created_at=current_admin.created_at.isoformat(),
    )
