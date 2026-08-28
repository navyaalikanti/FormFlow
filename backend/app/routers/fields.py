"""Field management router for the FormFlow API."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.schemas.forms import FieldCreate, FieldResponse, FieldUpdate, MessageResponse
from app.services.field_service import (
    FieldNotFoundException,
    FieldService,
    FormAccessDeniedException,
    FormNotFoundException,
)

router = APIRouter(tags=["Field Builder"])


# ---------------------------------------------------------------------------
# Static data – field type catalogue
# ---------------------------------------------------------------------------

FIELD_TYPES = [
    {
        "type": "short_text",
        "label": "Short Text",
        "icon": "Type",
        "description": "Single-line text input",
        "category": "basic",
        "color": "#6366f1",
        "default_config": {},
    },
    {
        "type": "paragraph",
        "label": "Paragraph",
        "icon": "AlignLeft",
        "description": "Multi-line text area",
        "category": "basic",
        "color": "#8b5cf6",
        "default_config": {"rows": 4},
    },
    {
        "type": "number",
        "label": "Number",
        "icon": "Hash",
        "description": "Numeric input",
        "category": "basic",
        "color": "#06b6d4",
        "default_config": {},
    },
    {
        "type": "email",
        "label": "Email",
        "icon": "Mail",
        "description": "Email address input",
        "category": "basic",
        "color": "#f97316",
        "default_config": {},
    },
    {
        "type": "phone",
        "label": "Phone",
        "icon": "Phone",
        "description": "Phone number input",
        "category": "basic",
        "color": "#10b981",
        "default_config": {},
    },
    {
        "type": "url",
        "label": "URL",
        "icon": "Globe",
        "description": "Website URL input",
        "category": "basic",
        "color": "#3b82f6",
        "default_config": {},
    },
    {
        "type": "dropdown",
        "label": "Dropdown",
        "icon": "ChevronDown",
        "description": "Single-select dropdown",
        "category": "choice",
        "color": "#f59e0b",
        "default_config": {},
    },
    {
        "type": "radio",
        "label": "Multiple Choice",
        "icon": "CircleDot",
        "description": "Single-select radio buttons",
        "category": "choice",
        "color": "#ec4899",
        "default_config": {},
    },
    {
        "type": "checkbox",
        "label": "Checkboxes",
        "icon": "CheckSquare",
        "description": "Multi-select checkboxes",
        "category": "choice",
        "color": "#84cc16",
        "default_config": {},
    },
    {
        "type": "date",
        "label": "Date",
        "icon": "Calendar",
        "description": "Date picker",
        "category": "date_time",
        "color": "#3b82f6",
        "default_config": {},
    },
    {
        "type": "time",
        "label": "Time",
        "icon": "Clock",
        "description": "Time picker",
        "category": "date_time",
        "color": "#0ea5e9",
        "default_config": {},
    },
    {
        "type": "rating",
        "label": "Rating",
        "icon": "Star",
        "description": "Star rating 1–5",
        "category": "advanced",
        "color": "#f97316",
        "default_config": {"max_stars": 5},
    },
    {
        "type": "file",
        "label": "File Upload",
        "icon": "Upload",
        "description": "File upload field",
        "category": "advanced",
        "color": "#64748b",
        "default_config": {"accept": "*", "max_size_mb": 10},
    },
    {
        "type": "section",
        "label": "Section",
        "icon": "Layout",
        "description": "Visual section separator",
        "category": "layout",
        "color": "#94a3b8",
        "default_config": {},
    },
]


# ---------------------------------------------------------------------------
# Routes
# NOTE: /fields/reorder MUST be declared before /fields/{field_id} so that
#       FastAPI does not try to parse the literal "reorder" as a UUID.
# ---------------------------------------------------------------------------


@router.get("/field-types", summary="Get all available field types")
def get_field_types() -> dict:
    """Return catalogue of supported field types."""
    return {"field_types": FIELD_TYPES}


@router.post(
    "/forms/{form_id}/fields",
    response_model=FieldResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a field to a form",
)
def create_field(
    form_id: UUID,
    payload: FieldCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FieldResponse:
    try:
        field = FieldService.create_field(db, current_admin, form_id, payload)
    except FormNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    except FormAccessDeniedException:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return FieldResponse.model_validate(field)


@router.put(
    "/fields/reorder",
    response_model=MessageResponse,
    summary="Reorder fields within a form",
)
def reorder_fields(
    payload: dict,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> MessageResponse:
    """
    Accepts ``{ "form_id": "uuid", "field_orders": [{ "field_id": "uuid", "sort_order": int, "section_id": "uuid" }] }``
    """
    try:
        form_id = UUID(payload["form_id"])
        field_orders = payload["field_orders"]
        FieldService.reorder_fields(db, current_admin, form_id, field_orders)
    except FormNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    except FormAccessDeniedException:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return MessageResponse(message="Fields reordered successfully.")


@router.put(
    "/fields/{field_id}",
    response_model=FieldResponse,
    summary="Update a field",
)
def update_field(
    field_id: UUID,
    payload: FieldUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> FieldResponse:
    try:
        field = FieldService.update_field(db, current_admin, field_id, payload)
    except FieldNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    except FormAccessDeniedException:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return FieldResponse.model_validate(field)


@router.delete(
    "/fields/{field_id}",
    response_model=MessageResponse,
    summary="Delete a field",
)
def delete_field(
    field_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> MessageResponse:
    try:
        FieldService.delete_field(db, current_admin, field_id)
    except FieldNotFoundException:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    except FormAccessDeniedException:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return MessageResponse(message="Field deleted successfully.")
