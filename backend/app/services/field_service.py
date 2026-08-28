"""Field CRUD + reorder service for the FormFlow API."""
from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.admin import Admin
from app.models.form_platform import Field, FieldOption, Form, Section
from app.schemas.forms import FieldCreate, FieldOptionCreate, FieldUpdate


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class FormNotFoundException(Exception):
    pass


class FieldNotFoundException(Exception):
    pass


class FormAccessDeniedException(Exception):
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _generate_field_key(label: str, existing_keys: set[str]) -> str:
    base = "".join(ch.lower() if ch.isalnum() else "_" for ch in label).strip("_")
    base = "_".join(part for part in base.split("_") if part)
    if not base:
        base = "field"
    candidate = base[:160]
    index = 2
    while candidate in existing_keys:
        suffix = f"_{index}"
        candidate = f"{base[:160 - len(suffix)]}{suffix}"
        index += 1
    return candidate


def _get_form_or_raise(db: Session, admin: Admin, form_id: UUID) -> Form:
    form = db.scalar(
        select(Form)
        .options(
            selectinload(Form.sections).selectinload(Section.fields).selectinload(Field.options),
        )
        .where(Form.id == form_id)
    )
    if form is None:
        raise FormNotFoundException()
    if form.owner_admin_id != admin.id:
        raise FormAccessDeniedException()
    return form


def _get_field_or_raise(db: Session, admin: Admin, field_id: UUID) -> Field:
    field = db.scalar(
        select(Field)
        .options(selectinload(Field.options))
        .where(Field.id == field_id)
    )
    if field is None:
        raise FieldNotFoundException()
    # Load form to check ownership
    form = db.scalar(select(Form).where(Form.id == field.form_id))
    if form is None or form.owner_admin_id != admin.id:
        raise FormAccessDeniedException()
    return field


def _sync_options(db: Session, field: Field, options_payload: list[FieldOptionCreate]) -> None:
    # Delete existing options and replace
    for opt in list(field.options):
        db.delete(opt)
    db.flush()
    for idx, opt_data in enumerate(options_payload):
        option = FieldOption(
            id=uuid.uuid4(),
            field_id=field.id,
            label=opt_data.label,
            option_value=opt_data.option_value,
            sort_order=opt_data.sort_order if opt_data.sort_order is not None else idx,
            is_default=opt_data.is_default,
            option_config=opt_data.option_config or {},
        )
        db.add(option)
    db.flush()


def _ensure_default_section(db: Session, form: Form) -> Section:
    """Return the first section for a form, or create one named 'Untitled Section'."""
    if form.sections:
        return sorted(form.sections, key=lambda s: s.section_order)[0]
    section = Section(
        id=uuid.uuid4(),
        form_id=form.id,
        title="Untitled Section",
        description=None,
        section_order=0,
        is_collapsible=False,
    )
    db.add(section)
    db.flush()
    return section


# ---------------------------------------------------------------------------
# FieldService
# ---------------------------------------------------------------------------


class FieldService:
    @staticmethod
    def create_field(db: Session, admin: Admin, form_id: UUID, payload: FieldCreate) -> Field:
        form = _get_form_or_raise(db, admin, form_id)

        # Determine target section
        section_id = getattr(payload, "section_id", None)
        if section_id is not None:
            section = next((s for s in form.sections if s.id == section_id), None)
            if section is None:
                raise FormNotFoundException()
        else:
            section = _ensure_default_section(db, form)

        # Collect existing field keys for this form
        existing_keys: set[str] = {
            f.field_key
            for s in form.sections
            for f in s.fields
        }

        field_key = payload.field_key
        if not field_key:
            field_key = _generate_field_key(payload.label, existing_keys)

        # Calculate max sort_order for this section
        max_sort = max((f.sort_order for f in section.fields), default=-1) + 1
        sort_order = payload.sort_order if payload.sort_order is not None else max_sort

        field = Field(
            id=uuid.uuid4(),
            form_id=form.id,
            section_id=section.id,
            field_key=field_key,
            label=payload.label,
            field_type=payload.field_type,
            description=payload.description,
            placeholder=payload.placeholder,
            helper_text=payload.helper_text,
            default_value=payload.default_value,
            config=payload.config or {},
            validation_rules=payload.validation_rules or {},
            ai_config=payload.ai_config or {},
            is_required=payload.is_required,
            is_hidden=payload.is_hidden,
            is_read_only=payload.is_read_only,
            allows_multiple=payload.allows_multiple,
            sort_order=sort_order,
        )
        db.add(field)
        db.flush()

        if payload.options:
            for idx, opt_data in enumerate(payload.options):
                option = FieldOption(
                    id=uuid.uuid4(),
                    field_id=field.id,
                    label=opt_data.label,
                    option_value=opt_data.option_value,
                    sort_order=opt_data.sort_order if opt_data.sort_order is not None else idx,
                    is_default=opt_data.is_default,
                    option_config=opt_data.option_config or {},
                )
                db.add(option)
            db.flush()

        db.commit()
        db.refresh(field)
        # Eagerly load options so response serialises correctly
        _ = field.options
        return field

    @staticmethod
    def update_field(db: Session, admin: Admin, field_id: UUID, payload: FieldUpdate) -> Field:
        field = _get_field_or_raise(db, admin, field_id)

        if payload.label is not None:
            field.label = payload.label
        if payload.field_type is not None:
            field.field_type = payload.field_type
        if payload.description is not None:
            field.description = payload.description
        if payload.placeholder is not None:
            field.placeholder = payload.placeholder
        if payload.helper_text is not None:
            field.helper_text = payload.helper_text
        if payload.default_value is not None:
            field.default_value = payload.default_value
        if payload.config is not None:
            field.config = payload.config
        if payload.validation_rules is not None:
            field.validation_rules = payload.validation_rules
        if payload.ai_config is not None:
            field.ai_config = payload.ai_config
        if payload.is_required is not None:
            field.is_required = payload.is_required
        if payload.is_hidden is not None:
            field.is_hidden = payload.is_hidden
        if payload.is_read_only is not None:
            field.is_read_only = payload.is_read_only
        if payload.allows_multiple is not None:
            field.allows_multiple = payload.allows_multiple
        if payload.sort_order is not None:
            field.sort_order = payload.sort_order
        if payload.field_key is not None:
            field.field_key = payload.field_key

        if payload.options is not None:
            _sync_options(db, field, payload.options)

        db.commit()
        db.refresh(field)
        _ = field.options
        return field

    @staticmethod
    def delete_field(db: Session, admin: Admin, field_id: UUID) -> None:
        field = _get_field_or_raise(db, admin, field_id)
        db.delete(field)
        db.commit()

    @staticmethod
    def reorder_fields(
        db: Session,
        admin: Admin,
        form_id: UUID,
        field_orders: list[dict[str, Any]],
    ) -> None:
        form = _get_form_or_raise(db, admin, form_id)

        # Build maps for quick lookup
        section_map: dict[UUID, Section] = {s.id: s for s in form.sections}
        field_map: dict[UUID, Field] = {f.id: f for s in form.sections for f in s.fields}

        for item in field_orders:
            fid = UUID(str(item["field_id"]))
            field = field_map.get(fid)
            if field is None:
                continue
            field.sort_order = int(item["sort_order"])
            if "section_id" in item and item["section_id"]:
                sec_id = UUID(str(item["section_id"]))
                target_sec = section_map.get(sec_id)
                if target_sec and field.section_id != sec_id:
                    field.section = target_sec

        # Strictly normalize sort_order per section to 0, 1, 2...
        for section in form.sections:
            sorted_fields = sorted(section.fields, key=lambda f: (f.sort_order, str(f.id)))
            for idx, field in enumerate(sorted_fields):
                field.sort_order = idx

        db.commit()
