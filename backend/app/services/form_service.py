from __future__ import annotations

import copy
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.admin import Admin
from app.models.form_platform import ActivityLog, ConditionalLogic, Field, FieldOption, Form, FormVersion, Section, ValidationRuleTemplate
from app.schemas.auth import AdminResponse
from app.schemas.forms import (
    DuplicateResponse,
    FieldCreate,
    FieldResponse,
    FieldUpdate,
    FormCreate,
    FormResponse,
    FormUpdate,
    PublishOptionsRequest,
    PublishResponse,
    PublishValidationError,
    SectionCreate,
    SectionResponse,
    SectionUpdate,
)
from app.utils.forms import build_version_hash, generate_public_slug, generate_share_token, utcnow


def _strip_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _generate_field_key(title: str, existing_keys: set[str]) -> str:
    base = "".join(ch.lower() if ch.isalnum() else "_" for ch in title).strip("_")
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


def _load_form_query():
    # Note: We use selectinload for relationships, which doesn't support ORDER BY.
    # Sorting is handled explicitly in _form_to_response() using _section_sort_key()
    # and _field_sort_key() to ensure deterministic ordering.
    return (
        select(Form)
        .options(
            selectinload(Form.owner_admin),
            selectinload(Form.sections).selectinload(Section.fields).selectinload(Field.options),
        )
    )


def _section_sort_key(section: Section) -> tuple[int, str]:
    return (section.section_order if section.section_order is not None else 0, str(section.id) if section.id else "")


def _field_sort_key(field: Field) -> tuple[int, str]:
    return (field.sort_order if field.sort_order is not None else 0, str(field.id) if field.id else "")


def _option_sort_key(option: FieldOption) -> tuple[int, str]:
    return (option.sort_order if option.sort_order is not None else 0, str(option.id) if option.id else "")


def _section_to_payload(section: Section) -> dict[str, Any]:
    ordered_fields = sorted(section.fields, key=_field_sort_key)
    return {
        "id": str(section.id),
        "title": section.title,
        "description": section.description,
        "section_order": section.section_order,
        "is_collapsible": section.is_collapsible,
        "fields": [_field_to_payload(field) for field in ordered_fields],
    }


def _field_to_payload(field: Field) -> dict[str, Any]:
    ordered_options = sorted(field.options, key=_option_sort_key)
    return {
        "id": str(field.id),
        "field_key": field.field_key,
        "label": field.label,
        "field_type": field.field_type,
        "description": field.description,
        "placeholder": field.placeholder,
        "helper_text": field.helper_text,
        "default_value": field.default_value,
        "config": copy.deepcopy(field.config),
        "validation_rules": copy.deepcopy(field.validation_rules),
        "ai_config": copy.deepcopy(field.ai_config),
        "is_required": field.is_required,
        "is_hidden": field.is_hidden,
        "is_read_only": field.is_read_only,
        "allows_multiple": field.allows_multiple,
        "sort_order": field.sort_order,
        "options": [
            {
                "id": str(option.id),
                "label": option.label,
                "option_value": option.option_value,
                "sort_order": option.sort_order,
                "is_default": option.is_default,
                "option_config": copy.deepcopy(option.option_config),
            }
            for option in ordered_options
        ],
    }


def _form_snapshot(form: Form) -> dict[str, Any]:
    ordered_sections = sorted(form.sections, key=_section_sort_key)
    return {
        "form": {
            "id": str(form.id),
            "title": form.title,
            "description": form.description,
            "status": form.status,
            "public_slug": form.public_slug,
            "share_token": form.share_token,
            "settings": copy.deepcopy(form.settings),
            "theme_config": copy.deepcopy(form.theme_config),
            "analytics_config": copy.deepcopy(form.analytics_config),
            "ai_config": copy.deepcopy(form.ai_config),
            "published_at": form.published_at.isoformat() if form.published_at else None,
            "archived_at": form.archived_at.isoformat() if form.archived_at else None,
        },
        "sections": [_section_to_payload(section) for section in ordered_sections],
    }


def _conditional_logic_snapshot(db: Session, form_id: UUID) -> list[dict[str, Any]]:
    statement = (
        select(ConditionalLogic)
        .options(
            selectinload(ConditionalLogic.source_field),
            selectinload(ConditionalLogic.target_field),
        )
        .where(ConditionalLogic.form_id == form_id)
        .order_by(ConditionalLogic.priority, ConditionalLogic.created_at)
    )
    rules = list(db.scalars(statement).all())
    return [
        {
            "source_field_key": rule.source_field.field_key if rule.source_field else None,
            "operator": rule.operator,
            "comparison_value": copy.deepcopy(rule.comparison_value),
            "action_type": rule.action_type,
            "action_config": {
                "target_field_key": rule.target_field.field_key if rule.target_field else None,
                **copy.deepcopy(rule.action_config),
            },
            "priority": rule.priority,
            "is_active": rule.is_active,
        }
        for rule in rules
        if rule.source_field is not None
    ]


def _form_to_response(form: Form) -> FormResponse:
    owner = form.owner_admin
    # Sort sections and fields to ensure deterministic ordering
    ordered_sections = sorted(form.sections, key=_section_sort_key)
    return FormResponse(
        id=form.id,
        owner_admin_id=form.owner_admin_id,
        title=form.title,
        description=form.description,
        status=form.status,
        public_slug=form.public_slug,
        share_token=form.share_token,
        published_version_id=form.published_version_id,
        published_version_link_token=form.published_version_link_token,
        settings=copy.deepcopy(form.settings),
        theme_config=copy.deepcopy(form.theme_config),
        analytics_config=copy.deepcopy(form.analytics_config),
        ai_config=copy.deepcopy(form.ai_config),
        published_at=form.published_at,
        archived_at=form.archived_at,
        created_at=form.created_at,
        updated_at=form.updated_at,
        owner=None if owner is None else AdminResponse.model_validate(owner),
        sections=[
            SectionResponse(
                id=section.id,
                form_id=section.form_id,
                title=section.title,
                description=section.description,
                section_order=section.section_order,
                is_collapsible=section.is_collapsible,
                fields=[
                    FieldResponse(
                        id=field.id,
                        form_id=field.form_id,
                        section_id=field.section_id,
                        field_key=field.field_key,
                        label=field.label,
                        field_type=field.field_type,
                        description=field.description,
                        placeholder=field.placeholder,
                        helper_text=field.helper_text,
                        default_value=field.default_value,
                        config=copy.deepcopy(field.config),
                        validation_rules=copy.deepcopy(field.validation_rules),
                        ai_config=copy.deepcopy(field.ai_config),
                        is_required=field.is_required,
                        is_hidden=field.is_hidden,
                        is_read_only=field.is_read_only,
                        allows_multiple=field.allows_multiple,
                        sort_order=field.sort_order,
                        options=[
                            {
                                "id": option.id,
                                "label": option.label,
                                "option_value": option.option_value,
                                "sort_order": option.sort_order,
                                "is_default": option.is_default,
                                "option_config": copy.deepcopy(option.option_config),
                                "created_at": option.created_at,
                                "updated_at": option.updated_at,
                            }
                            for option in sorted(field.options, key=_option_sort_key)
                        ],
                        created_at=field.created_at,
                        updated_at=field.updated_at,
                    )
                    for field in sorted(section.fields, key=_field_sort_key)
                ],
                created_at=section.created_at,
                updated_at=section.updated_at,
            )
            for section in ordered_sections
        ],
    )


def _field_payload_to_model(
    form_id: UUID,
    section_id: UUID,
    payload: FieldCreate,
    existing_keys: set[str],
    field_index: int | None = None,
) -> Field:
    field_key = payload.field_key.strip() if payload.field_key else _generate_field_key(payload.label, existing_keys)
    existing_keys.add(field_key)
    allows_multiple = payload.allows_multiple
    if payload.field_type == "file":
        max_count = payload.validation_rules.get("max_file_count")
        allows_multiple = (max_count is None) or (max_count > 1)

    return Field(
        form_id=form_id,
        section_id=section_id,
        field_key=field_key[:160],
        label=payload.label.strip(),
        field_type=payload.field_type.strip(),
        description=_strip_optional_text(payload.description),
        placeholder=_strip_optional_text(payload.placeholder),
        helper_text=_strip_optional_text(payload.helper_text),
        default_value=copy.deepcopy(payload.default_value),
        config=copy.deepcopy(payload.config),
        validation_rules=copy.deepcopy(payload.validation_rules),
        ai_config=copy.deepcopy(payload.ai_config),
        is_required=payload.is_required,
        is_hidden=payload.is_hidden,
        is_read_only=payload.is_read_only,
        allows_multiple=allows_multiple,
        sort_order=field_index if field_index is not None else payload.sort_order,
        options=[
            FieldOption(
                label=option.label.strip(),
                option_value=option.option_value.strip(),
                sort_order=opt_idx,
                is_default=option.is_default,
                option_config=copy.deepcopy(option.option_config),
            )
            for opt_idx, option in enumerate(payload.options)
        ],
    )


def _section_payload_to_model(
    form_id: UUID,
    payload: SectionCreate | SectionUpdate,
    existing_keys: set[str],
    section_index: int,
) -> Section:
    section = Section(
        form_id=form_id,
        title=payload.title.strip() if getattr(payload, "title", None) else f"Section {section_index + 1}",
        description=_strip_optional_text(getattr(payload, "description", None)),
        section_order=getattr(payload, "section_order", None) if getattr(payload, "section_order", None) is not None else section_index,
        is_collapsible=getattr(payload, "is_collapsible", False) if getattr(payload, "is_collapsible", None) is not None else False,
    )
    fields = getattr(payload, "fields", None) or []
    section.fields = [
        _field_payload_to_model(form_id, section.id or UUID(int=0), field_payload, existing_keys, field_index)
        for field_index, field_payload in enumerate(fields)
    ]
    return section


# ---------------------------------------------------------------------------
# Version helpers
# ---------------------------------------------------------------------------

def _get_draft_version(db: Session, form_id: UUID) -> FormVersion | None:
    """Return the single draft FormVersion for this Form, or None."""
    return db.scalars(
        select(FormVersion)
        .where(FormVersion.form_id == form_id, FormVersion.status == "draft")
        .order_by(FormVersion.version_number.desc())
    ).first()


def _get_latest_published_version(db: Session, form_id: UUID) -> FormVersion | None:
    """Return the latest published FormVersion for this Form, or None."""
    return db.scalars(
        select(FormVersion)
        .where(FormVersion.form_id == form_id, FormVersion.status == "published")
        .order_by(FormVersion.version_number.desc())
    ).first()


def _next_version_number(db: Session, form_id: UUID) -> int:
    """Return max(version_number) + 1 for the given form."""
    return (
        db.execute(
            select(func.coalesce(func.max(FormVersion.version_number), 0))
            .where(FormVersion.form_id == form_id)
        ).scalar_one()
        + 1
    )


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class FormValidationException(Exception):
    def __init__(self, errors: list[PublishValidationError]):
        self.errors = errors
        super().__init__("Form validation failed")


class FormNotFoundException(Exception):
    pass


class FormAccessDeniedException(Exception):
    pass


# ---------------------------------------------------------------------------
# FormService
# ---------------------------------------------------------------------------

class FormService:

    @staticmethod
    def _get_owned_form_query(db: Session, admin: Admin, form_id: UUID):
        statement = _load_form_query().where(Form.id == form_id, Form.owner_admin_id == admin.id)
        return db.scalars(statement).first()

    @staticmethod
    def _require_form(db: Session, admin: Admin, form_id: UUID) -> Form:
        form = FormService._get_owned_form_query(db, admin, form_id)
        if not form:
            raise FormNotFoundException()
        return form

    @staticmethod
    def _replace_form_structure(
        db: Session,
        form: Form,
        sections: list[SectionCreate | SectionUpdate],
    ) -> None:
        db.execute(delete(ConditionalLogic).where(ConditionalLogic.form_id == form.id))
        form.sections.clear()
        db.flush()

        existing_keys: set[str] = set()
        new_sections: list[Section] = []
        for index, section_payload in enumerate(sections):
            section = Section(
                form_id=form.id,
                title=section_payload.title.strip(),
                description=_strip_optional_text(section_payload.description),
                section_order=section_payload.section_order if section_payload.section_order is not None else index,
                is_collapsible=section_payload.is_collapsible if section_payload.is_collapsible is not None else False,
            )
            for field_index, field_payload in enumerate(section_payload.fields or []):
                field = _field_payload_to_model(form.id, UUID(int=0), field_payload, existing_keys, field_index)
                field.section = section
                section.fields.append(field)
            new_sections.append(section)

        form.sections = new_sections
        for section in form.sections:
            for field in section.fields:
                field.section_id = section.id

    @staticmethod
    def normalize_form_field_orders(db: Session, form: Form) -> None:
        """Ensure all sections and fields have clean, strictly sequential section_order and sort_order."""
        sorted_sections = sorted(form.sections, key=lambda s: (s.section_order if s.section_order is not None else 0, str(s.id) if s.id else ""))
        for s_idx, section in enumerate(sorted_sections):
            section.section_order = s_idx
            sorted_fields = sorted(section.fields, key=lambda f: (f.sort_order if f.sort_order is not None else 0, str(f.id) if f.id else ""))
            for f_idx, field in enumerate(sorted_fields):
                field.sort_order = f_idx
                sorted_options = sorted(field.options, key=lambda o: (o.sort_order if o.sort_order is not None else 0, str(o.id) if o.id else ""))
                for o_idx, option in enumerate(sorted_options):
                    option.sort_order = o_idx

    # ── List / Get ──────────────────────────────────────────────────────────

    @staticmethod
    def list_forms(db: Session, admin: Admin) -> list[Form]:
        statement = _load_form_query().where(Form.owner_admin_id == admin.id).order_by(Form.updated_at.desc())
        return list(db.scalars(statement).unique().all())

    @staticmethod
    def get_form(db: Session, admin: Admin, form_id: UUID) -> Form:
        return FormService._require_form(db, admin, form_id)

    # ── Create ──────────────────────────────────────────────────────────────

    @staticmethod
    def create_form(db: Session, admin: Admin, payload: FormCreate) -> Form:
        """
        Create a new Form with an initial Version 1 (Draft).
        The live sections/fields on the Form represent the current draft working copy.
        """
        try:
            form = Form(
                owner_admin_id=admin.id,
                title=payload.title.strip(),
                description=_strip_optional_text(payload.description),
                status="draft",
                public_slug=generate_public_slug(payload.title),
                share_token=generate_share_token(),
                settings=copy.deepcopy(payload.settings),
                theme_config=copy.deepcopy(payload.theme_config),
                analytics_config=copy.deepcopy(payload.analytics_config),
                ai_config=copy.deepcopy(payload.ai_config),
            )
            db.add(form)
            db.flush()

            # Create sections (or default section)
            sections_to_create = payload.sections
            if not sections_to_create:
                sections_to_create = [SectionCreate(
                    title="Section 1",
                    description=None,
                    section_order=0,
                    is_collapsible=False,
                    fields=[]
                )]

            FormService._replace_form_structure(db, form, sections_to_create)
            FormService.normalize_form_field_orders(db, form)
            db.flush()

            # Create Version 1 as a Draft FormVersion record
            # The snapshot is minimal at creation – it gets a full snapshot on publish.
            draft_version = FormVersion(
                form_id=form.id,
                version_number=1,
                status="draft",
                title=form.title,
                description=form.description,
                snapshot={},  # Empty snapshot; will be populated when published
                created_by_admin_id=admin.id,
            )
            db.add(draft_version)

            db.commit()
            db.refresh(form)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="CREATE_FORM",
                form_id=form.id,
                resource_type="form",
                resource_id=str(form.id),
                details={"title": form.title}
            )
            return FormService._require_form(db, admin, form.id)
        except Exception:
            db.rollback()
            raise

    # ── Update ──────────────────────────────────────────────────────────────

    @staticmethod
    def update_form(db: Session, admin: Admin, form_id: UUID, payload: FormUpdate) -> Form:
        form = FormService._require_form(db, admin, form_id)
        try:
            if payload.title is not None:
                form.title = payload.title.strip()
            if payload.description is not None:
                form.description = _strip_optional_text(payload.description)
            if payload.settings is not None:
                form.settings = copy.deepcopy(payload.settings)
            if payload.theme_config is not None:
                form.theme_config = copy.deepcopy(payload.theme_config)
            if payload.analytics_config is not None:
                form.analytics_config = copy.deepcopy(payload.analytics_config)
            if payload.ai_config is not None:
                form.ai_config = copy.deepcopy(payload.ai_config)
            if payload.sections is not None:
                FormService._replace_form_structure(db, form, payload.sections)  # type: ignore[arg-type]

            if payload.conditional_logic_rules is not None:
                # Delete existing rules
                db.execute(delete(ConditionalLogic).where(ConditionalLogic.form_id == form.id))
                db.flush()

                # Build field_key -> field map
                field_by_key = {}
                for section in form.sections:
                    for field in section.fields:
                        if field.field_key:
                            field_by_key[field.field_key] = field
                
                # Create new rules
                for rule_data in payload.conditional_logic_rules:
                    source_key = rule_data.get("source_field_key")
                    target_key = rule_data.get("action_config", {}).get("target_field_key")
                    source_field = field_by_key.get(source_key) if source_key else None
                    target_field = field_by_key.get(target_key) if target_key else None
                    
                    if source_field is None:
                        continue
                        
                    db.add(ConditionalLogic(
                        form_id=form.id,
                        source_field=source_field,
                        target_field=target_field,
                        trigger_event=rule_data.get("trigger_event", "change"),
                        operator=rule_data.get("operator", "equals"),
                        comparison_value=copy.deepcopy(rule_data.get("comparison_value")),
                        action_type=rule_data.get("action_type", "show"),
                        action_config={
                            key: value
                            for key, value in copy.deepcopy(rule_data.get("action_config", {})).items()
                            if key != "target_field_key"
                        },
                        priority=rule_data.get("priority", 0),
                        is_active=rule_data.get("is_active", True),
                    ))

            # Keep the draft version's title/description in sync
            draft_version = _get_draft_version(db, form_id)
            if draft_version is not None:
                if payload.title is not None:
                    draft_version.title = form.title
                if payload.description is not None:
                    draft_version.description = form.description

            FormService.normalize_form_field_orders(db, form)
            db.commit()
            db.refresh(form)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="UPDATE_FORM",
                form_id=form.id,
                resource_type="form",
                resource_id=str(form.id),
                details={"title": form.title}
            )
            return FormService._require_form(db, admin, form.id)
        except Exception:
            db.rollback()
            raise

    # ── Delete ──────────────────────────────────────────────────────────────

    @staticmethod
    def delete_form(db: Session, admin: Admin, form_id: UUID) -> None:
        form = FormService._require_form(db, admin, form_id)
        try:
            form_title = form.title
            db.delete(form)
            db.commit()
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="DELETE_FORM",
                form_id=None,
                resource_type="form",
                resource_id=str(form_id),
                details={"title": form_title, "form_id": str(form_id)}
            )
        except Exception:
            db.rollback()
            raise

    # ── Duplicate ────────────────────────────────────────────────────────────

    @staticmethod
    def duplicate_form(db: Session, admin: Admin, form_id: UUID) -> Form:
        """Create a brand-new separate Form (not a version) as a copy."""
        source = FormService._require_form(db, admin, form_id)
        try:
            duplicated = Form(
                owner_admin_id=admin.id,
                title=f"{source.title.strip()} (Copy)"[:255],
                description=source.description,
                status="draft",
                public_slug=generate_public_slug(source.title),
                share_token=generate_share_token(),
                settings=copy.deepcopy(source.settings),
                theme_config=copy.deepcopy(source.theme_config),
                analytics_config=copy.deepcopy(source.analytics_config),
                ai_config=copy.deepcopy(source.ai_config),
            )
            existing_keys: set[str] = set()
            for section_index, section in enumerate(sorted(source.sections, key=_section_sort_key)):
                new_section = Section(
                    title=section.title,
                    description=section.description,
                    section_order=section.section_order,
                    is_collapsible=section.is_collapsible,
                )
                for field in sorted(section.fields, key=_field_sort_key):
                    new_field = Field(
                        form=duplicated,
                        field_key=_generate_field_key(field.label, existing_keys),
                        label=field.label,
                        field_type=field.field_type,
                        description=field.description,
                        placeholder=field.placeholder,
                        helper_text=field.helper_text,
                        default_value=copy.deepcopy(field.default_value),
                        config=copy.deepcopy(field.config),
                        validation_rules=copy.deepcopy(field.validation_rules),
                        ai_config=copy.deepcopy(field.ai_config),
                        is_required=field.is_required,
                        is_hidden=field.is_hidden,
                        is_read_only=field.is_read_only,
                        allows_multiple=field.allows_multiple,
                        sort_order=field.sort_order,
                    )
                    new_field.options = [
                        FieldOption(
                            label=option.label,
                            option_value=option.option_value,
                            sort_order=option.sort_order,
                            is_default=option.is_default,
                            option_config=copy.deepcopy(option.option_config),
                        )
                        for option in sorted(field.options, key=_option_sort_key)
                    ]
                    new_section.fields.append(new_field)
                duplicated.sections.append(new_section)

            db.add(duplicated)
            db.flush()

            # Create Version 1 Draft for the duplicated form
            draft_version = FormVersion(
                form_id=duplicated.id,
                version_number=1,
                status="draft",
                title=duplicated.title,
                description=duplicated.description,
                snapshot={},
                created_by_admin_id=admin.id,
                change_summary=f"Duplicated from form {source.id}",
            )
            db.add(draft_version)

            db.commit()
            db.refresh(duplicated)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="DUPLICATE_FORM",
                form_id=duplicated.id,
                resource_type="form",
                resource_id=str(duplicated.id),
                details={"source_form_id": str(form_id), "title": duplicated.title}
            )
            return FormService._require_form(db, admin, duplicated.id)
        except Exception:
            db.rollback()
            raise

    # ── Publish ─────────────────────────────────────────────────────────────

    @staticmethod
    def _validate_publishable(form: Form) -> list[PublishValidationError]:
        errors: list[PublishValidationError] = []
        if not form.title.strip():
            errors.append(PublishValidationError(field="title", message="Title is required before publishing."))
        if not form.sections:
            errors.append(PublishValidationError(field="sections", message="At least one section is required before publishing."))
        field_count = sum(len(section.fields) for section in form.sections)
        if field_count == 0:
            errors.append(PublishValidationError(field="fields", message="At least one field is required before publishing."))
        return errors

    @staticmethod
    def publish_form(
        db: Session,
        admin: Admin,
        form_id: UUID,
        publish_options: "PublishOptionsRequest | None" = None,
    ) -> tuple[Form, FormVersion]:
        """
        Publish the form by transitioning the existing Draft FormVersion to Published.
        Does NOT create a duplicate FormVersion — it upgrades the draft in-place.
        The Form ID never changes.
        """
        form = FormService._require_form(db, admin, form_id)
        errors = FormService._validate_publishable(form)
        if errors:
            raise FormValidationException(errors)

        try:
            now = utcnow()
            FormService.normalize_form_field_orders(db, form)
            db.flush()

            # Persist response collection limits on the Form record
            if publish_options is not None:
                form.limit_enabled = publish_options.limit_enabled
                form.max_responses = publish_options.max_responses if publish_options.limit_enabled else None
                form.deadline_enabled = publish_options.deadline_enabled
                form.deadline_datetime = publish_options.deadline_datetime if publish_options.deadline_enabled else None
            else:
                # Keep existing limit settings (re-publish preserves previous limits)
                pass

            # Build the snapshot from the current live form structure
            snapshot = _form_snapshot(form)
            snapshot["conditional_logic_rules"] = _conditional_logic_snapshot(db, form.id)
            # Embed publish options in snapshot for historical reference
            snapshot["publish_options"] = {
                "limit_enabled": form.limit_enabled,
                "max_responses": form.max_responses,
                "deadline_enabled": form.deadline_enabled,
                "deadline_datetime": form.deadline_datetime.isoformat() if form.deadline_datetime else None,
            }

            # Find the existing draft version — this is what we promote to published
            draft_version = _get_draft_version(db, form_id)

            if draft_version is not None:
                # Promote the existing draft version to published (in-place transition)
                draft_version.status = "published"
                draft_version.snapshot = snapshot
                draft_version.version_hash = build_version_hash(snapshot)
                draft_version.title = form.title
                draft_version.description = form.description
                draft_version.published_by_admin_id = admin.id
                draft_version.published_at = now
                if not draft_version.link_token:
                    draft_version.link_token = generate_share_token()
                version = draft_version
            else:
                # Edge-case: no draft version found — create one (e.g. legacy forms)
                version_number = _next_version_number(db, form_id)
                version = FormVersion(
                    form_id=form.id,
                    version_number=version_number,
                    status="published",
                    snapshot=snapshot,
                    version_hash=build_version_hash(snapshot),
                    title=form.title,
                    description=form.description,
                    created_by_admin_id=admin.id,
                    published_by_admin_id=admin.id,
                    published_at=now,
                    link_token=generate_share_token(),
                )
                db.add(version)

            db.flush()

            # Update the Form aggregate state
            form.status = "published"
            form.published_version_id = version.id
            form.published_at = now
            form.archived_at = None
            if not form.public_slug:
                form.public_slug = generate_public_slug(form.title)
            if not form.share_token:
                form.share_token = generate_share_token()

            db.commit()
            db.refresh(form)
            db.refresh(version)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="PUBLISH_FORM",
                form_id=form.id,
                resource_type="form",
                resource_id=str(form.id),
                details={"version_number": version.version_number, "version_id": str(version.id), "title": form.title}
            )
            return FormService._require_form(db, admin, form.id), version
        except Exception:
            db.rollback()
            raise

    # ── Edit as New Draft ────────────────────────────────────────────────────

    @staticmethod
    def edit_as_new_draft(db: Session, admin: Admin, form_id: UUID) -> Form:
        """
        Create the next draft version under the same Form (same form_id).
        If a draft already exists, return the form as-is (idempotent).
        This replaces the old approach that created a duplicate Form record.
        """
        form = FormService._require_form(db, admin, form_id)

        if form.status not in ("published", "archived"):
            # Form already has a draft — return it as-is
            return form

        # Verify no existing draft version
        existing_draft = _get_draft_version(db, form_id)
        if existing_draft is not None:
            # Draft version already exists — just set form status to draft and return
            if form.status != "draft":
                form.status = "draft"
                db.commit()
                db.refresh(form)
            return FormService._require_form(db, admin, form_id)

        # Get the latest published version to duplicate from
        latest_published = _get_latest_published_version(db, form_id)
        if latest_published is None:
            raise ValueError("No published version found to create a draft from.")

        try:
            next_version = _next_version_number(db, form_id)

            # Restore live sections/fields from the published snapshot
            snapshot = latest_published.snapshot or {}
            form_snap = snapshot.get("form", {})
            sections_snap = snapshot.get("sections", [])

            # Restore form metadata from the published version
            form.title = form_snap.get("title", form.title)
            form.description = form_snap.get("description", form.description)
            form.settings = copy.deepcopy(form_snap.get("settings", form.settings))
            form.theme_config = copy.deepcopy(form_snap.get("theme_config", form.theme_config))
            form.analytics_config = copy.deepcopy(form_snap.get("analytics_config", form.analytics_config))
            form.ai_config = copy.deepcopy(form_snap.get("ai_config", form.ai_config))
            form.status = "draft"

            # Clear and rebuild live sections/fields from the snapshot
            db.execute(delete(ConditionalLogic).where(ConditionalLogic.form_id == form.id))
            form.sections.clear()
            db.flush()

            existing_keys: set[str] = set()
            field_by_key: dict[str, Field] = {}

            # The snapshot is already saved in the correct sorted order, so we process them in list order.
            for s_idx, section_data in enumerate(sections_snap):
                section_id_str = section_data.get("id")
                section = Section(
                    id=UUID(section_id_str) if section_id_str and section_id_str != "None" else uuid.uuid4(),
                    form_id=form.id,
                    title=section_data.get("title", "Section"),
                    description=section_data.get("description"),
                    section_order=s_idx,
                    is_collapsible=section_data.get("is_collapsible", False),
                )

                fields_snap = section_data.get("fields", [])
                for f_idx, field_data in enumerate(fields_snap):
                    field_key = field_data.get("field_key", "")
                    if not field_key:
                        continue
                    existing_keys.add(field_key)

                    field_id_str = field_data.get("id")
                    field = Field(
                        id=UUID(field_id_str) if field_id_str and field_id_str != "None" else uuid.uuid4(),
                        form_id=form.id,
                        section=section,
                        field_key=field_key,
                        label=field_data.get("label", ""),
                        field_type=field_data.get("field_type", ""),
                        description=field_data.get("description"),
                        placeholder=field_data.get("placeholder"),
                        helper_text=field_data.get("helper_text"),
                        default_value=copy.deepcopy(field_data.get("default_value")),
                        config=copy.deepcopy(field_data.get("config", {})),
                        validation_rules=copy.deepcopy(field_data.get("validation_rules", {})),
                        ai_config=copy.deepcopy(field_data.get("ai_config", {})),
                        is_required=field_data.get("is_required", False),
                        is_hidden=field_data.get("is_hidden", False),
                        is_read_only=field_data.get("is_read_only", False),
                        allows_multiple=field_data.get("allows_multiple", False),
                        sort_order=f_idx,
                    )
                    field_by_key[field_key] = field

                    for opt_idx, option_data in enumerate(field_data.get("options", [])):
                        option_id_str = option_data.get("id")
                        option = FieldOption(
                            id=UUID(option_id_str) if option_id_str and option_id_str != "None" else uuid.uuid4(),
                            label=option_data.get("label", ""),
                            option_value=option_data.get("option_value", ""),
                            sort_order=opt_idx,
                            is_default=option_data.get("is_default", False),
                            option_config=copy.deepcopy(option_data.get("option_config", {})),
                        )
                        field.options.append(option)

                    section.fields.append(field)

                form.sections.append(section)

            # Restore conditional logic from the snapshot
            for rule_data in snapshot.get("conditional_logic_rules", []):
                source_key = rule_data.get("source_field_key")
                target_key = rule_data.get("action_config", {}).get("target_field_key")
                source_field = field_by_key.get(source_key) if source_key else None
                target_field = field_by_key.get(target_key) if target_key else None
                if source_field is None:
                    continue
                db.add(ConditionalLogic(
                    form_id=form.id,
                    source_field=source_field,
                    target_field=target_field,
                    trigger_event=rule_data.get("trigger_event", "change"),
                    operator=rule_data.get("operator", "equals"),
                    comparison_value=copy.deepcopy(rule_data.get("comparison_value")),
                    action_type=rule_data.get("action_type", "show"),
                    action_config={
                        key: value
                        for key, value in copy.deepcopy(rule_data.get("action_config", {})).items()
                        if key != "target_field_key"
                    },
                    priority=rule_data.get("priority", 0),
                    is_active=rule_data.get("is_active", True),
                ))

            FormService.normalize_form_field_orders(db, form)
            db.flush()

            # Create the new draft FormVersion record (lightweight — no full snapshot yet)
            new_draft = FormVersion(
                form_id=form.id,
                version_number=next_version,
                status="draft",
                title=form.title,
                description=form.description,
                snapshot={},  # Will be populated on publish
                created_by_admin_id=admin.id,
                change_summary=f"Editing from Version {latest_published.version_number}",
            )
            db.add(new_draft)

            db.commit()
            db.refresh(form)
            return FormService._require_form(db, admin, form.id)
        except Exception:
            db.rollback()
            raise

    # ── Unpublish ────────────────────────────────────────────────────────────

    @staticmethod
    def unpublish_form(db: Session, admin: Admin, form_id: UUID) -> Form:
        form = FormService._require_form(db, admin, form_id)
        try:
            # If no draft exists, keep form at published state but logically
            # we set status to draft to allow editing (creates implicit draft).
            form.status = "draft"
            form.published_version_id = None

            # Ensure a draft FormVersion exists so the form can be edited
            existing_draft = _get_draft_version(db, form_id)
            if existing_draft is None:
                # Create a lightweight draft version
                next_version = _next_version_number(db, form_id)
                draft = FormVersion(
                    form_id=form.id,
                    version_number=next_version,
                    status="draft",
                    title=form.title,
                    description=form.description,
                    snapshot={},
                    created_by_admin_id=admin.id,
                    change_summary="Unpublished for editing",
                )
                db.add(draft)

            db.commit()
            db.refresh(form)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="UNPUBLISH_FORM",
                form_id=form.id,
                resource_type="form",
                resource_id=str(form.id),
                details={"title": form.title}
            )
            return FormService._require_form(db, admin, form.id)
        except Exception:
            db.rollback()
            raise

    # ── Archive / Restore ────────────────────────────────────────────────────

    @staticmethod
    def archive_form(db: Session, admin: Admin, form_id: UUID) -> Form:
        form = FormService._require_form(db, admin, form_id)
        try:
            form.status = "archived"
            form.archived_at = utcnow()
            form.published_version_id = None
            db.commit()
            db.refresh(form)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="ARCHIVE_FORM",
                form_id=form.id,
                resource_type="form",
                resource_id=str(form.id),
                details={"title": form.title}
            )
            return FormService._require_form(db, admin, form.id)
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def restore_form(db: Session, admin: Admin, form_id: UUID) -> Form:
        form = FormService._require_form(db, admin, form_id)
        try:
            form.status = "draft"
            form.archived_at = None

            # Ensure a draft FormVersion exists
            existing_draft = _get_draft_version(db, form_id)
            if existing_draft is None:
                next_version = _next_version_number(db, form_id)
                draft = FormVersion(
                    form_id=form.id,
                    version_number=next_version,
                    status="draft",
                    title=form.title,
                    description=form.description,
                    snapshot={},
                    created_by_admin_id=admin.id,
                    change_summary="Restored from archived state",
                )
                db.add(draft)

            db.commit()
            db.refresh(form)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="RESTORE_FORM",
                form_id=form.id,
                resource_type="form",
                resource_id=str(form.id),
                details={"title": form.title}
            )
            return FormService._require_form(db, admin, form.id)
        except Exception:
            db.rollback()
            raise

    # ── Version Management ────────────────────────────────────────────────────

    @staticmethod
    def get_form_versions(db: Session, admin: Admin, form_id: UUID) -> list[FormVersion]:
        """Get all versions for a form, ordered newest first."""
        FormService._require_form(db, admin, form_id)
        statement = (
            select(FormVersion)
            .where(FormVersion.form_id == form_id)
            .order_by(FormVersion.version_number.desc())
        )
        return list(db.scalars(statement).all())

    @staticmethod
    def get_form_version(db: Session, admin: Admin, form_id: UUID, version_id: UUID) -> FormVersion:
        """Get a specific version with full snapshot."""
        FormService._require_form(db, admin, form_id)
        version = db.query(FormVersion).filter(
            FormVersion.id == version_id,
            FormVersion.form_id == form_id
        ).first()
        if not version:
            raise FormNotFoundException()
        return version

    @staticmethod
    def restore_version_as_draft(
        db: Session,
        admin: Admin,
        form_id: UUID,
        version_id: UUID,
    ) -> tuple[Form, FormVersion]:
        """
        Restore a published version as a new draft.
        Rebuilds the live form structure from the version snapshot.
        Does NOT modify the source version.
        """
        form = FormService._require_form(db, admin, form_id)
        source_version = db.query(FormVersion).filter(
            FormVersion.id == version_id,
            FormVersion.form_id == form_id
        ).first()

        if not source_version:
            raise FormNotFoundException()

        # If the form already has a draft, we can't create another
        existing_draft = _get_draft_version(db, form_id)
        if existing_draft is not None:
            raise ValueError(
                f"A draft (Version {existing_draft.version_number}) already exists. "
                "Publish or discard it before restoring another version."
            )

        try:
            next_version = _next_version_number(db, form_id)

            snapshot = source_version.snapshot or {}
            form_snap = snapshot.get("form", {})
            sections_snap = snapshot.get("sections", [])

            # Restore form metadata
            form.title = form_snap.get("title", form.title)
            form.description = form_snap.get("description", form.description)
            form.settings = copy.deepcopy(form_snap.get("settings", form.settings))
            form.theme_config = copy.deepcopy(form_snap.get("theme_config", form.theme_config))
            form.analytics_config = copy.deepcopy(form_snap.get("analytics_config", form.analytics_config))
            form.ai_config = copy.deepcopy(form_snap.get("ai_config", form.ai_config))
            form.status = "draft"

            # Rebuild live structure from snapshot
            db.execute(delete(ConditionalLogic).where(ConditionalLogic.form_id == form.id))
            form.sections.clear()
            db.flush()

            existing_keys: set[str] = set()
            field_by_key: dict[str, Field] = {}

            # The snapshot is already saved in the correct sorted order, so we process them in list order.
            for s_idx, section_data in enumerate(sections_snap):
                section = Section(
                    form_id=form.id,
                    title=section_data.get("title", "Section"),
                    description=section_data.get("description"),
                    section_order=s_idx,
                    is_collapsible=section_data.get("is_collapsible", False),
                )

                fields_snap = section_data.get("fields", [])
                for f_idx, field_data in enumerate(fields_snap):
                    field_key = field_data.get("field_key", "")
                    if not field_key:
                        continue
                    existing_keys.add(field_key)
                    field = Field(
                        form_id=form.id,
                        section=section,
                        field_key=field_key,
                        label=field_data.get("label", ""),
                        field_type=field_data.get("field_type", ""),
                        description=field_data.get("description"),
                        placeholder=field_data.get("placeholder"),
                        helper_text=field_data.get("helper_text"),
                        default_value=copy.deepcopy(field_data.get("default_value")),
                        config=copy.deepcopy(field_data.get("config", {})),
                        validation_rules=copy.deepcopy(field_data.get("validation_rules", {})),
                        ai_config=copy.deepcopy(field_data.get("ai_config", {})),
                        is_required=field_data.get("is_required", False),
                        is_hidden=field_data.get("is_hidden", False),
                        is_read_only=field_data.get("is_read_only", False),
                        allows_multiple=field_data.get("allows_multiple", False),
                        sort_order=f_idx,
                    )
                    field_by_key[field_key] = field

                    for opt_idx, option_data in enumerate(field_data.get("options", [])):
                        option = FieldOption(
                            label=option_data.get("label", ""),
                            option_value=option_data.get("option_value", ""),
                            sort_order=opt_idx,
                            is_default=option_data.get("is_default", False),
                            option_config=copy.deepcopy(option_data.get("option_config", {})),
                        )
                        field.options.append(option)

                    section.fields.append(field)

                form.sections.append(section)

            # Restore conditional logic
            for rule_data in snapshot.get("conditional_logic_rules", []):
                source_key = rule_data.get("source_field_key")
                target_key = rule_data.get("action_config", {}).get("target_field_key")
                source_field = field_by_key.get(source_key) if source_key else None
                target_field = field_by_key.get(target_key) if target_key else None
                if source_field is None:
                    continue
                db.add(ConditionalLogic(
                    form_id=form.id,
                    source_field=source_field,
                    target_field=target_field,
                    trigger_event=rule_data.get("trigger_event", "change"),
                    operator=rule_data.get("operator", "equals"),
                    comparison_value=copy.deepcopy(rule_data.get("comparison_value")),
                    action_type=rule_data.get("action_type", "show"),
                    action_config={
                        key: value
                        for key, value in copy.deepcopy(rule_data.get("action_config", {})).items()
                        if key != "target_field_key"
                    },
                    priority=rule_data.get("priority", 0),
                    is_active=rule_data.get("is_active", True),
                ))

            FormService.normalize_form_field_orders(db, form)
            db.flush()

            # Create new draft version
            new_version = FormVersion(
                form_id=form.id,
                version_number=next_version,
                status="draft",
                title=form.title,
                description=form.description,
                snapshot={},
                created_by_admin_id=admin.id,
                change_summary=f"Restored from Version {source_version.version_number}",
            )
            db.add(new_version)

            form.published_version_id = None

            db.commit()
            db.refresh(form)
            db.refresh(new_version)
            from app.services.audit_log_service import AuditLogService
            AuditLogService.create_audit_log(
                db=db,
                user_id=admin.id,
                action="RESTORE_VERSION",
                form_id=form.id,
                resource_type="form",
                resource_id=str(form.id),
                details={
                    "version_number": new_version.version_number,
                    "restored_from_version_number": source_version.version_number,
                    "title": form.title
                }
            )
            return FormService._require_form(db, admin, form.id), new_version
        except Exception:
            db.rollback()
            raise

    # ── Clone form structure helper (used by duplicate) ─────────────────────

    @staticmethod
    def _clone_form_structure(db: Session, source: Form, target: Form) -> None:
        field_id_map = {}
        for section in sorted(source.sections, key=_section_sort_key):
            new_section = Section(
                form=target,
                title=section.title,
                description=section.description,
                section_order=section.section_order,
                is_collapsible=section.is_collapsible,
            )
            db.add(new_section)
            db.flush()

            for field in sorted(section.fields, key=_field_sort_key):
                new_field = Field(
                    form=target,
                    section=new_section,
                    field_key=field.field_key,
                    label=field.label,
                    field_type=field.field_type,
                    description=field.description,
                    placeholder=field.placeholder,
                    helper_text=field.helper_text,
                    default_value=copy.deepcopy(field.default_value),
                    config=copy.deepcopy(field.config),
                    validation_rules=copy.deepcopy(field.validation_rules),
                    ai_config=copy.deepcopy(field.ai_config),
                    is_required=field.is_required,
                    is_hidden=field.is_hidden,
                    is_read_only=field.is_read_only,
                    allows_multiple=field.allows_multiple,
                    sort_order=field.sort_order,
                )
                db.add(new_field)
                db.flush()
                field_id_map[field.id] = new_field.id

                for option in sorted(field.options, key=_option_sort_key):
                    new_option = FieldOption(
                        field=new_field,
                        label=option.label,
                        option_value=option.option_value,
                        sort_order=option.sort_order,
                        is_default=option.is_default,
                        option_config=copy.deepcopy(option.option_config),
                    )
                    db.add(new_option)

        db.flush()

        # Clone conditional logic
        conditional_rules = db.scalars(
            select(ConditionalLogic).where(ConditionalLogic.form_id == source.id)
        ).all()
        for rule in conditional_rules:
            new_source_id = field_id_map.get(rule.source_field_id)
            new_target_id = field_id_map.get(rule.target_field_id) if rule.target_field_id else None
            if new_source_id:
                new_rule = ConditionalLogic(
                    form_id=target.id,
                    source_field_id=new_source_id,
                    target_field_id=new_target_id,
                    trigger_event=rule.trigger_event,
                    operator=rule.operator,
                    comparison_value=copy.deepcopy(rule.comparison_value),
                    action_type=rule.action_type,
                    action_config=copy.deepcopy(rule.action_config),
                    priority=rule.priority,
                    is_active=rule.is_active,
                )
                db.add(new_rule)

        # Clone validation templates
        templates = db.scalars(
            select(ValidationRuleTemplate).where(ValidationRuleTemplate.form_id == source.id)
        ).all()
        for template in templates:
            new_template = ValidationRuleTemplate(
                form_id=target.id,
                name=template.name,
                field_type=template.field_type,
                rules=copy.deepcopy(template.rules),
            )
            db.add(new_template)
