from __future__ import annotations

import csv
import copy
import io
import json
import uuid
import re
from datetime import datetime
from urllib.parse import quote
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.form_platform import (
    ConditionalLogic,
    Field,
    FieldOption,
    Form,
    FormVersion,
    Response,
    ResponseAnswer,
    Section,
)
from app.models.file_storage import FileStorage
from app.schemas.auth import AdminResponse
from app.schemas.forms import FieldOptionResponse, FieldResponse, FormResponse, SectionResponse
from app.services.conditional_logic_service import ConditionalLogicEngine
from app.schemas.files import FileUploadItemResponse
from app.services.file_storage_service import FileStorageService
from app.repositories.file_storage_repository import FileStorageRepository
from app.services.validation_service import ValidationService
from app.utils.forms import utcnow
from sqlalchemy import func


def _is_empty_value(value: Any) -> bool:
    if value is None:
        return True
    if value == "":
        return True
    if isinstance(value, (list, tuple, set)):
        return len(value) == 0
    if isinstance(value, dict):
        return len(value) == 0
    return False


def _load_form_for_public_access(db: Session, form_id: UUID) -> Form | None:
    statement = (
        select(Form)
        .options(
            selectinload(Form.owner_admin),
            selectinload(Form.sections).selectinload(Section.fields).selectinload(Field.options),
            selectinload(Form.fields).selectinload(Field.options),
        )
        .where(Form.id == form_id)
    )
    return db.scalars(statement).first()


def _load_latest_published_version(db: Session, form_id: UUID) -> FormVersion | None:
    statement = (
        select(FormVersion)
        .where(FormVersion.form_id == form_id)
        .where(FormVersion.status == "published")
        .order_by(FormVersion.version_number.desc(), FormVersion.published_at.desc().nullslast())
    )
    return db.scalars(statement).first()


def _build_logic_rules(db: Session, form: Form) -> list[dict[str, Any]]:
    statement = (
        select(ConditionalLogic)
        .options(
            selectinload(ConditionalLogic.source_field),
            selectinload(ConditionalLogic.target_field),
        )
        .where(ConditionalLogic.form_id == form.id)
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


def _build_snapshot_field_map(snapshot: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    fields: list[dict[str, Any]] = []
    field_map: dict[str, dict[str, Any]] = {}

    ordered_sections = sorted(
        snapshot.get("sections", []),
        key=lambda section_data: (
            section_data.get("section_order", 0),
            str(section_data.get("id") or ""),
        ),
    )

    for section_index, section_data in enumerate(ordered_sections):
        section_order = section_data.get("section_order", section_index)
        ordered_fields = sorted(
            section_data.get("fields", []),
            key=lambda field_data: (
                field_data.get("sort_order", 0),
                str(field_data.get("id") or ""),
            ),
        )
        for field_index, field_data in enumerate(ordered_fields):
            field_key = field_data.get("field_key")
            if not field_key:
                continue
            field_entry = {
                "id": UUID(field_data.get("id")) if field_data.get("id") else uuid.uuid4(),
                "field_key": field_key,
                "label": field_data.get("label", field_key),
                "field_type": field_data.get("field_type", "short_text"),
                "is_required": field_data.get("is_required", False),
                "is_hidden": field_data.get("is_hidden", False),
                "allows_multiple": field_data.get("allows_multiple", False),
                "config": copy.deepcopy(field_data.get("config", {})),
                "validation_rules": copy.deepcopy(field_data.get("validation_rules", {})),
                "options": copy.deepcopy(field_data.get("options", [])),
                "section_order": section_order,
                "sort_order": field_data.get("sort_order", field_index),
            }
            fields.append(field_entry)
            field_map[field_key] = field_entry

    return fields, field_map


def _extract_file_keys(value: Any) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        key = value.get("file_key") or value.get("storage_key") or value.get("object_path")
        return [str(key)] if key else []
    if isinstance(value, (list, tuple, set)):
        keys: list[str] = []
        for item in value:
            keys.extend(_extract_file_keys(item))
        return keys
    return []


def _build_file_storage_map(db: Session, answers: dict[str, Any]) -> dict[str, FileStorage]:
    file_keys: set[str] = set()
    for value in answers.values():
        file_keys.update(_extract_file_keys(value))
    if not file_keys:
        return {}
    records = FileStorageRepository.list_by_file_keys(db, file_keys, include_deleted=True)
    return {record.file_key: record for record in records}


def _build_file_storage_map_from_responses(db: Session, responses: list[Response]) -> dict[str, FileStorage]:
    file_keys: set[str] = set()
    for response in responses:
        for answer in response.answers:
            file_keys.update(_extract_file_keys(answer.answer_value))
    if not file_keys:
        return {}
    records = FileStorageRepository.list_by_file_keys(db, file_keys, include_deleted=True)
    return {record.file_key: record for record in records}


def _build_content_disposition(filename: str) -> str:
    safe_filename = filename.replace("\\", "_").replace("/", "_").replace('"', "'")
    quoted_filename = quote(filename)
    return f'attachment; filename="{safe_filename}"; filename*=UTF-8\'\'{quoted_filename}'


def _sanitize_export_base_name(value: str | None) -> str:
    base_name = (value or "form").strip()
    base_name = re.sub(r'[\\/:*?"<>|]+', "-", base_name)
    base_name = re.sub(r"\s+", " ", base_name).strip(" .")
    return base_name or "form"


def _build_form_response_from_snapshot(
    form: Form,
    version: FormVersion,
    snapshot: dict[str, Any],
    conditional_logic_rules: list[dict[str, Any]],
) -> FormResponse:
    owner = form.owner_admin
    sections: list[SectionResponse] = []

    sections_list = snapshot.get("sections", [])
    ordered_sections = sorted(
        sections_list,
        key=lambda section_data: section_data.get("section_order", 0),
    )

    for section_data in ordered_sections:
        section_id_raw = section_data.get("id")
        section_id = UUID(section_id_raw) if section_id_raw and section_id_raw != "None" else uuid.uuid4()
        fields_list = section_data.get("fields", [])
        ordered_fields = sorted(
            fields_list,
            key=lambda field_data: field_data.get("sort_order", 0),
        )
        section = SectionResponse(
            id=section_id,
            form_id=form.id,
            title=section_data.get("title", ""),
            description=section_data.get("description"),
            section_order=section_data.get("section_order", 0),
            is_collapsible=section_data.get("is_collapsible", False),
            created_at=form.created_at,
            updated_at=form.updated_at,
            fields=[
                FieldResponse(
                    id=UUID(field_data.get("id")) if field_data.get("id") and field_data.get("id") != "None" else uuid.uuid4(),
                    form_id=form.id,
                    section_id=section_id,
                    field_key=field_data.get("field_key", ""),
                    label=field_data.get("label", ""),
                    field_type=field_data.get("field_type", ""),
                    description=field_data.get("description"),
                    placeholder=field_data.get("placeholder"),
                    helper_text=field_data.get("helper_text"),
                    default_value=field_data.get("default_value"),
                    config=copy.deepcopy(field_data.get("config", {})),
                    validation_rules=copy.deepcopy(field_data.get("validation_rules", {})),
                    ai_config=copy.deepcopy(field_data.get("ai_config", {})),
                    is_required=field_data.get("is_required", False),
                    is_hidden=field_data.get("is_hidden", False),
                    is_read_only=field_data.get("is_read_only", False),
                    allows_multiple=field_data.get("allows_multiple", False),
                    sort_order=field_data.get("sort_order", 0),
                    options=[
                        FieldOptionResponse(
                            id=UUID(option_data.get("id")) if option_data.get("id") and option_data.get("id") != "None" else uuid.uuid4(),
                            label=option_data.get("label", ""),
                            option_value=option_data.get("option_value", ""),
                            sort_order=option_data.get("sort_order", 0),
                            is_default=option_data.get("is_default", False),
                            option_config=copy.deepcopy(option_data.get("option_config", {})),
                            created_at=form.created_at,
                            updated_at=form.updated_at,
                        )
                        for option_data in sorted(
                            field_data.get("options", []),
                            key=lambda option_data: option_data.get("sort_order", 0),
                        )
                    ],
                    created_at=form.created_at,
                    updated_at=form.updated_at,
                )
                for field_data in ordered_fields
            ],
        )
        sections.append(section)

    return FormResponse(
        id=form.id,
        owner_admin_id=form.owner_admin_id,
        title=snapshot.get("form", {}).get("title", form.title),
        description=snapshot.get("form", {}).get("description", form.description),
        status=form.status,
        public_slug=form.public_slug,
        share_token=form.share_token,
        published_version_id=version.id,
        published_version_link_token=version.link_token,
        settings=copy.deepcopy(snapshot.get("form", {}).get("settings", form.settings)),
        theme_config=copy.deepcopy(snapshot.get("form", {}).get("theme_config", form.theme_config)),
        analytics_config=copy.deepcopy(snapshot.get("form", {}).get("analytics_config", form.analytics_config)),
        ai_config=copy.deepcopy(snapshot.get("form", {}).get("ai_config", form.ai_config)),
        published_at=version.published_at,
        archived_at=form.archived_at,
        created_at=form.created_at,
        updated_at=form.updated_at,
        owner=None if owner is None else AdminResponse.model_validate(owner),
        sections=sections,
        conditional_logic_rules=conditional_logic_rules,
    )


def _count_submitted_responses(db: Session, form_id: UUID) -> int:
    """Return the number of successfully submitted responses for a form."""
    return db.execute(
        select(func.count(Response.id))
        .where(Response.form_id == form_id)
        .where(Response.status == "submitted")
    ).scalar_one()


def _check_response_limits(form: Form, current_count: int) -> tuple[bool, str | None]:
    """
    Returns (accepting, reason).
    reason is None when accepting=True.
    """
    now = utcnow()

    # Check deadline first (most time-sensitive)
    if form.deadline_enabled and form.deadline_datetime is not None:
        if now > form.deadline_datetime:
            return False, "deadline_passed"

    # Check response count
    if form.limit_enabled and form.max_responses is not None:
        if current_count >= form.max_responses:
            return False, "response_limit_reached"

    return True, None


class SubmissionService:
    @staticmethod
    def get_form_submission_status(db: Session, token: str) -> dict:
        """Return acceptance status for the public form status endpoint."""
        version = db.scalars(
            select(FormVersion)
            .where(FormVersion.link_token == token)
            .where(FormVersion.status == "published")
        ).first()

        if version is not None:
            form = _load_form_for_public_access(db, version.form_id)
        else:
            form = db.scalars(
                select(Form).where(Form.share_token == token)
            ).first()

        if form is None:
            raise LookupError("Form not found")
        if form.status == "archived":
            return {"accepting": False, "reason": "archived", "current_responses": None, "max_responses": None, "deadline": None}

        current_count = _count_submitted_responses(db, form.id)
        accepting, reason = _check_response_limits(form, current_count)

        return {
            "accepting": accepting,
            "reason": reason,
            "current_responses": current_count if form.limit_enabled else None,
            "max_responses": form.max_responses if form.limit_enabled else None,
            "deadline": form.deadline_datetime.isoformat() if (form.deadline_enabled and form.deadline_datetime) else None,
            "limit_enabled": form.limit_enabled,
            "deadline_enabled": form.deadline_enabled,
        }

    @staticmethod
    def resolve_public_form_context(db: Session, token: str) -> tuple[Form, FormVersion, dict[str, Any], list[dict[str, Any]]]:
        version = db.scalars(
            select(FormVersion)
            .where(FormVersion.link_token == token)
            .where(FormVersion.status == "published")
        ).first()

        if version is not None:
            form = _load_form_for_public_access(db, version.form_id)
            if form is None:
                raise LookupError("Form not found")
            if form.status == "archived":
                raise ValueError("This form is archived and no longer accepts responses.")
            # Enforce response limits
            current_count = _count_submitted_responses(db, form.id)
            accepting, reason = _check_response_limits(form, current_count)
            if not accepting:
                raise ValueError(reason)
            snapshot = copy.deepcopy(version.snapshot or {})
            conditional_logic_rules = copy.deepcopy(snapshot.get("conditional_logic_rules") or _build_logic_rules(db, form))
            return form, version, snapshot, conditional_logic_rules

        form = db.scalars(
            select(Form)
            .where(Form.share_token == token)
            .options(
                selectinload(Form.owner_admin),
                selectinload(Form.sections).selectinload(Section.fields).selectinload(Field.options),
                selectinload(Form.fields).selectinload(Field.options),
            )
        ).first()
        if form is None:
            raise LookupError("Form not found")
        if form.status == "archived":
            raise ValueError("This form is archived and no longer accepts responses.")
        if form.status != "published":
            raise LookupError("Form not found")

        version = form.published_version
        if version is None:
            raise LookupError("Published form version not found")
        # Enforce response limits
        current_count = _count_submitted_responses(db, form.id)
        accepting, reason = _check_response_limits(form, current_count)
        if not accepting:
            raise ValueError(reason)
        snapshot = copy.deepcopy(version.snapshot or {})
        conditional_logic_rules = copy.deepcopy(snapshot.get("conditional_logic_rules") or _build_logic_rules(db, form))
        return form, version, snapshot, conditional_logic_rules

    @staticmethod
    def build_public_form_response(db: Session, token: str) -> FormResponse:
        form, version, snapshot, conditional_logic_rules = SubmissionService.resolve_public_form_context(db, token)
        return _build_form_response_from_snapshot(form, version, snapshot, conditional_logic_rules)

    @staticmethod
    def _validate_public_submission(
        db: Session,
        form_id: UUID,
        answers: dict[str, Any],
        field_map: dict[str, dict[str, Any]],
        field_states: dict[str, dict[str, Any]],
    ) -> list[dict[str, Any]]:
        errors: list[dict[str, Any]] = []
        file_storage_map = _build_file_storage_map(db, answers)

        for field_key, field_info in field_map.items():
            state = field_states.get(field_key, {})
            is_hidden = state.get("is_hidden", field_info.get("is_hidden", False))
            is_required = state.get("is_required", field_info.get("is_required", False))
            value = answers.get(field_key)

            if is_hidden:
                if not _is_empty_value(value):
                    errors.append(
                        {
                            "field_key": field_key,
                            "message": f"{field_info.get('label') or field_key} is hidden and must not contain a value.",
                            "type": "hidden_field_value",
                            "attempted_value": value,
                            "validation_rule": {"type": "hidden_field"},
                        }
                    )
                continue

            if is_required and _is_empty_value(value):
                errors.append(
                    {
                        "field_key": field_key,
                        "message": f"{field_info.get('label') or field_key} is required",
                        "type": "required",
                        "attempted_value": value,
                        "validation_rule": {"type": "required"},
                    }
                )
                continue

            if _is_empty_value(value):
                continue

            if field_info.get("field_type") == "file":
                file_errors = SubmissionService._validate_file_submission_value(
                    field_key,
                    value,
                    field_info,
                    form_id,
                    file_storage_map,
                )
                errors.extend(file_errors)
                continue

            result = ValidationService.validate_field(
                value,
                field_info.get("field_type", "short_text"),
                field_info.get("validation_rules", {}),
                field_info,
            )
            for error in result.errors:
                errors.append(
                    {
                        "field_key": field_key,
                        "message": error["error_message"],
                        "type": error["error_type"],
                        "attempted_value": error.get("attempted_value"),
                        "validation_rule": error.get("validation_rule", {}),
                    }
                )

        for field_key, value in answers.items():
            if field_key not in field_map:
                continue
            if _is_empty_value(value):
                continue
            # field already validated above
        return errors

    @staticmethod
    def _validate_file_submission_value(
        field_key: str,
        value: Any,
        field_info: dict[str, Any],
        form_id: UUID,
        file_storage_map: dict[str, FileStorage],
    ) -> list[dict[str, Any]]:
        rules = field_info.get("validation_rules", {}) or {}
        is_multiple = field_info.get("allows_multiple", False)
        
        # Fallback for legacy snapshots where allows_multiple wasn't set correctly
        max_count = rules.get("max_file_count")
        if max_count is None or max_count > 1:
            is_multiple = True
            
        file_keys = _extract_file_keys(value)
        errors: list[dict[str, Any]] = []

        if not file_keys:
            errors.append(
                {
                    "field_key": field_key,
                    "message": "File uploads must reference uploaded file keys.",
                    "type": "invalid_file_reference",
                    "attempted_value": value,
                    "validation_rule": {"type": "file_key"},
                }
            )
            return errors

        if not is_multiple and len(file_keys) > 1:
            errors.append(
                {
                    "field_key": field_key,
                    "message": "This field accepts only one file.",
                    "type": "too_many_files",
                    "attempted_value": value,
                    "validation_rule": {"type": "max_file_count", "value": 1},
                }
            )

        if "min_file_count" in rules and rules["min_file_count"] is not None and len(file_keys) < rules["min_file_count"]:
            errors.append(
                {
                    "field_key": field_key,
                    "message": rules.get("min_count_message", f"Minimum {rules['min_file_count']} files required"),
                    "type": "too_few_files",
                    "attempted_value": value,
                    "validation_rule": {"type": "min_file_count", "value": rules["min_file_count"]},
                }
            )

        if "max_file_count" in rules and rules["max_file_count"] is not None and len(file_keys) > rules["max_file_count"]:
            errors.append(
                {
                    "field_key": field_key,
                    "message": rules.get("max_count_message", f"Maximum {rules['max_file_count']} files allowed"),
                    "type": "too_many_files",
                    "attempted_value": value,
                    "validation_rule": {"type": "max_file_count", "value": rules["max_file_count"]},
                }
            )

        if len(set(file_keys)) != len(file_keys):
            errors.append(
                {
                    "field_key": field_key,
                    "message": "Duplicate file keys are not allowed.",
                    "type": "duplicate_file_key",
                    "attempted_value": value,
                    "validation_rule": {"type": "duplicate_file_key"},
                }
            )

        allowed_types = [item.lower() for item in rules.get("allowed_file_types", []) or []]
        allowed_extensions = [item.lower().lstrip(".") for item in rules.get("allowed_extensions", []) or []]

        for file_key in file_keys:
            storage_file = file_storage_map.get(file_key)
            if storage_file is None:
                errors.append(
                    {
                        "field_key": field_key,
                        "message": f"Uploaded file '{file_key}' was not found.",
                        "type": "file_not_found",
                        "attempted_value": file_key,
                        "validation_rule": {"type": "file_key"},
                    }
                )
                continue
            if storage_file.is_deleted:
                errors.append(
                    {
                        "field_key": field_key,
                        "message": f"Uploaded file '{file_key}' is no longer available.",
                        "type": "file_deleted",
                        "attempted_value": file_key,
                        "validation_rule": {"type": "file_key"},
                    }
                )
                continue
            if storage_file.form_id is not None and storage_file.form_id != form_id:
                errors.append(
                    {
                        "field_key": field_key,
                        "message": "This file was uploaded for a different form.",
                        "type": "invalid_form_attachment",
                        "attempted_value": file_key,
                        "validation_rule": {"type": "form_id"},
                    }
                )
            if storage_file.field_id is not None and storage_file.field_id != field_info.get("id"):
                errors.append(
                    {
                        "field_key": field_key,
                        "message": "This file was uploaded for a different field.",
                        "type": "invalid_field_attachment",
                        "attempted_value": file_key,
                        "validation_rule": {"type": "field_id"},
                    }
                )

            if storage_file.size <= 0:
                errors.append(
                    {
                        "field_key": field_key,
                        "message": "Empty files are not allowed.",
                        "type": "empty_file",
                        "attempted_value": file_key,
                        "validation_rule": {"type": "empty_file"},
                    }
                )

            if "min_file_size_mb" in rules and rules["min_file_size_mb"] is not None:
                min_size_bytes = rules["min_file_size_mb"] * 1024 * 1024
                if storage_file.size < min_size_bytes:
                    errors.append(
                        {
                            "field_key": field_key,
                            "message": rules.get(
                                "min_size_message",
                                f"File size must be at least {rules['min_file_size_mb']}MB",
                            ),
                            "type": "file_too_small",
                            "attempted_value": file_key,
                            "validation_rule": {"type": "min_file_size", "value": rules["min_file_size_mb"]},
                        }
                    )

            if "max_file_size_mb" in rules and rules["max_file_size_mb"] is not None:
                max_size_bytes = rules["max_file_size_mb"] * 1024 * 1024
                if storage_file.size > max_size_bytes:
                    errors.append(
                        {
                            "field_key": field_key,
                            "message": rules.get(
                                "max_size_message",
                                f"File size must not exceed {rules['max_file_size_mb']}MB",
                            ),
                            "type": "file_too_large",
                            "attempted_value": file_key,
                            "validation_rule": {"type": "max_file_size", "value": rules["max_file_size_mb"]},
                        }
                    )

            if allowed_types:
                mime_type = (storage_file.content_type or "").lower()
                if mime_type and not any(
                    mime_type.startswith(mime[:-1]) if mime.endswith("/*") else mime_type == mime
                    for mime in allowed_types
                ):
                    errors.append(
                        {
                            "field_key": field_key,
                            "message": rules.get(
                                "file_type_message",
                                f"Only files of type {', '.join(rules.get('allowed_file_types', []))} are allowed",
                            ),
                            "type": "invalid_file_type",
                            "attempted_value": file_key,
                            "validation_rule": {"type": "allowed_file_types", "value": rules.get("allowed_file_types", [])},
                        }
                    )

            if allowed_extensions and (storage_file.extension or "").lower() not in allowed_extensions:
                errors.append(
                    {
                        "field_key": field_key,
                        "message": rules.get(
                            "extension_message",
                            f"Only {', '.join(rules.get('allowed_extensions', []))} files are allowed",
                        ),
                        "type": "invalid_extension",
                        "attempted_value": file_key,
                        "validation_rule": {"type": "allowed_extensions", "value": rules.get("allowed_extensions", [])},
                    }
                )

        return errors

    @staticmethod
    def submit_public_form(
        db: Session,
        token: str,
        answers: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        form, version, snapshot, conditional_logic_rules = SubmissionService.resolve_public_form_context(db, token)
        field_list, field_map = _build_snapshot_field_map(snapshot)

        engine = ConditionalLogicEngine()
        field_states = engine.get_field_state_map(field_list, conditional_logic_rules, answers)
        validation_errors = SubmissionService._validate_public_submission(db, form.id, answers, field_map, field_states)

        if validation_errors:
            raise ValueError(validation_errors)  # handled by the router

        normalized_answers = copy.deepcopy(answers)
        for field_key, field_info in field_map.items():
            if field_info.get("field_type") != "file":
                continue
            normalized_answers[field_key] = _extract_file_keys(answers.get(field_key))
            
            rules = field_info.get("validation_rules", {}) or {}
            is_multiple = field_info.get("allows_multiple", False)
            max_count = rules.get("max_file_count")
            if max_count is None or max_count > 1:
                is_multiple = True
                
            if not is_multiple and normalized_answers[field_key]:
                normalized_answers[field_key] = normalized_answers[field_key][0]

        submission = Response(
            id=uuid.uuid4(),
            form_id=form.id,
            form_version_id=version.id,
            status="submitted",
            submitted_at=utcnow(),
            completed_at=utcnow(),
            response_metadata=metadata or {},
        )
        db.add(submission)
        db.flush()

        for field_key, value in normalized_answers.items():
            field_info = field_map.get(field_key)
            if field_info is None or _is_empty_value(value):
                continue

            db.add(
                ResponseAnswer(
                    id=uuid.uuid4(),
                    response_id=submission.id,
                    field_id=field_info["id"],
                    answer_value=value,
                    answer_text=str(value) if isinstance(value, (str, int, float, bool)) else None,
                    answer_number=float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None,
                    answer_boolean=value if isinstance(value, bool) else None,
                    answer_metadata={},
                )
            )

        db.commit()
        db.refresh(submission)

        return {
            "success": True,
            "response_id": str(submission.id),
            "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        }

    @staticmethod
    def _format_answer_value(
        field_type: str,
        value: Any,
        file_storage_map: dict[str, FileStorage] | None = None,
    ) -> tuple[str | None, str | None, list[FileUploadItemResponse]]:
        if value is None:
            return None, None, []

        if field_type == "file":
            file_storage_map = file_storage_map or {}
            file_keys = _extract_file_keys(value)
            if file_keys:
                filenames: list[str] = []
                urls: list[str] = []
                file_items: list[FileUploadItemResponse] = []
                for file_key in file_keys:
                    storage_file = file_storage_map.get(file_key)
                    if storage_file is None:
                        filenames.append(file_key)
                        continue
                    filenames.append(storage_file.original_name)
                    try:
                        file_item = FileStorageService.build_file_upload_item_response(storage_file)
                    except Exception:
                        file_item = None
                    if file_item:
                        if file_item.signed_download_url:
                            urls.append(file_item.signed_download_url)
                        file_items.append(file_item)
                return ", ".join(filenames) if filenames else None, urls[0] if urls else None, file_items
            if isinstance(value, dict):
                display = value.get("filename") or value.get("name") or "File"
                return display, value.get("public_url") or value.get("download_url"), []
            if isinstance(value, list):
                filenames = []
                urls = []
                file_items = []
                for item in value:
                    if isinstance(item, dict):
                        filenames.append(str(item.get("filename") or item.get("name") or "File"))
                        if item.get("public_url") or item.get("download_url"):
                            urls.append(item.get("public_url") or item.get("download_url"))
                return ", ".join(filenames) if filenames else None, urls[0] if urls else None, file_items

        if isinstance(value, list):
            return ", ".join(str(item) for item in value), None, []
        if isinstance(value, dict):
            return str(value), value.get("public_url") or value.get("download_url"), []
        return str(value), None, []

    @staticmethod
    def _export_answer_value(
        field_type: str,
        value: Any,
        file_storage_map: dict[str, FileStorage] | None = None,
    ) -> Any:
        if field_type != "file":
            return value

        file_storage_map = file_storage_map or {}
        file_keys = _extract_file_keys(value)
        if not file_keys:
            return ""

        exported_urls: list[str] = []
        for file_key in file_keys:
            storage_file = file_storage_map.get(file_key)
            if storage_file is None:
                continue
            try:
                exported_urls.append(FileStorageService.create_signed_download_url(storage_file))
            except Exception:
                continue

        if not exported_urls:
            return ""
        if len(exported_urls) == 1:
            return exported_urls[0]
        return exported_urls

    @staticmethod
    def list_form_responses(
        db: Session,
        form_id: UUID,
        admin_id: int,
        form_version_id: UUID | None = None,
        field_id: str | None = None,
        field_value: str | None = None,
    ) -> dict[str, Any]:
        form = db.scalars(
            select(Form)
            .where(Form.id == form_id)
            .where(Form.owner_admin_id == admin_id)
            .options(
                selectinload(Form.sections).selectinload(Section.fields),
                selectinload(Form.fields),
            )
        ).first()
        if form is None:
            raise LookupError("Form not found")

        version_query = select(FormVersion).where(FormVersion.form_id == form.id)
        if form_version_id is not None:
            version_query = version_query.where(FormVersion.id == form_version_id)
        else:
            version_query = version_query.where(FormVersion.status == "published").order_by(
                FormVersion.version_number.desc(),
                FormVersion.published_at.desc().nullslast(),
            )

        version = db.scalars(version_query).first()
        if version is None:
            return {
                "total_responses": 0,
                "latest_submission": None,
                "responses": [],
            }

        responses = list(
            db.scalars(
                select(Response)
                .where(Response.form_version_id == version.id)
                .options(
                    selectinload(Response.form_version),
                    selectinload(Response.answers),
                )
                .order_by(Response.submitted_at.desc().nullslast(), Response.created_at.desc())
            ).unique().all()
        )
        
        snapshot = copy.deepcopy(version.snapshot or {})
        _, field_map_raw = _build_snapshot_field_map(snapshot)
        # convert uuid keys to string for easier matching
        field_map = {str(info["id"]): info for info in field_map_raw.values()}

        if field_id and field_value:
            if field_id not in field_map:
                raise ValueError("Invalid field_id: Field does not exist in the selected form version.")
            field_info = field_map[field_id]
            if field_info.get("field_type") not in ["dropdown", "radio", "checkbox", "rating"]:
                raise ValueError("Invalid field_id: Field is not a filterable choice field.")

            options = field_info.get("options", [])
            if field_info.get("field_type") == "rating":
                max_stars = int((field_info.get("config") or {}).get("max_stars") or 5)
                valid_option_values = {str(star) for star in range(1, max_stars + 1)}
            else:
                valid_option_values = {str(opt.get("option_value", "")) for opt in options}

            if field_value not in valid_option_values:
                raise ValueError("Invalid field_value: Value does not exist in the field's configured options.")

            filtered_responses = []
            for response in responses:
                for answer in response.answers:
                    if str(answer.field_id) == str(field_id):
                        val = answer.answer_value
                        if isinstance(val, list):
                            if field_value in [str(v) for v in val]:
                                filtered_responses.append(response)
                                break
                        elif str(val) == str(field_value):
                            filtered_responses.append(response)
                            break
            responses = filtered_responses
        
        file_storage_map = _build_file_storage_map_from_responses(db, responses)

        grouped_responses: list[dict[str, Any]] = []
        latest_submission: datetime | None = None

        for response in responses:
            submitted_at = response.submitted_at or response.created_at
            if latest_submission is None or submitted_at > latest_submission:
                latest_submission = submitted_at

            ordered_answers = sorted(
                response.answers,
                key=lambda answer: (
                    field_map.get(str(answer.field_id), {}).get("section_order", 0),
                    field_map.get(str(answer.field_id), {}).get("sort_order", 0),
                    answer.created_at,
                ),
            )
            grouped_responses.append(
                {
                    "response_id": response.id,
                    "submitted_at": submitted_at,
                    "answers": [
                        {
                            "field_id": answer.field_id,
                            "field_key": field_map.get(str(answer.field_id), {}).get("field_key", str(answer.field_id)),
                            "field_label": field_map.get(str(answer.field_id), {}).get("label", str(answer.field_id)),
                            "field_type": field_map.get(str(answer.field_id), {}).get("field_type", "short_text"),
                            "value": answer.answer_value,
                            "display_value": formatted_value[0],
                            "download_url": formatted_value[1],
                            "files": formatted_value[2],
                        }
                        for answer in ordered_answers
                        for formatted_value in [
                            SubmissionService._format_answer_value(
                                field_map.get(str(answer.field_id), {}).get("field_type", "short_text"),
                                answer.answer_value,
                                file_storage_map,
                            )
                        ]
                    ],
                }
            )

        return {
            "total_responses": len(grouped_responses),
            "latest_submission": latest_submission,
            "responses": grouped_responses,
        }

    @staticmethod
    def export_form_responses(
        db: Session,
        form_id: UUID,
        admin_id: int,
        export_format: str,
        form_version_id: UUID | None = None,
    ) -> dict[str, Any]:
        form = db.scalars(
            select(Form)
            .where(Form.id == form_id)
            .where(Form.owner_admin_id == admin_id)
            .options(
                selectinload(Form.sections).selectinload(Section.fields),
                selectinload(Form.fields),
            )
        ).first()
        if form is None:
            raise LookupError("Form not found")

        version_query = select(FormVersion).where(FormVersion.form_id == form.id)
        if form_version_id is not None:
            version_query = version_query.where(FormVersion.id == form_version_id)
        else:
            version_query = version_query.where(FormVersion.status == "published").order_by(
                FormVersion.version_number.desc(),
                FormVersion.published_at.desc().nullslast(),
            )

        version = db.scalars(version_query).first()
        if version is None:
            raise LookupError("No published version found for this form")

        responses = list(
            db.scalars(
                select(Response)
                .where(Response.form_version_id == version.id)
                .options(
                    selectinload(Response.form_version),
                    selectinload(Response.answers),
                )
                .order_by(Response.submitted_at.desc().nullslast(), Response.created_at.desc())
            ).unique().all()
        )

        if not responses:
            raise LookupError("No responses available to export.")

        snapshot = copy.deepcopy(version.snapshot or {})
        ordered_fields, _ = _build_snapshot_field_map(snapshot)
        file_storage_map = _build_file_storage_map_from_responses(db, responses)

        if export_format == "csv":
            def generate_csv() -> Any:
                buffer = io.StringIO()
                writer = csv.writer(buffer)
                writer.writerow([field["label"] for field in ordered_fields])
                yield buffer.getvalue()
                buffer.seek(0)
                buffer.truncate(0)

                for response in responses:
                    answer_map = {
                        str(answer.field_id): answer
                        for answer in response.answers
                    }
                    row: list[Any] = []
                    for field in ordered_fields:
                        answer = answer_map.get(str(field["id"]))
                        if answer is None:
                            row.append("")
                            continue
                        field_type = field.get("field_type", "short_text")
                        export_value = SubmissionService._export_answer_value(
                            field_type,
                            answer.answer_value,
                            file_storage_map,
                        )
                        if field_type == "file":
                            if isinstance(export_value, list):
                                row.append(", ".join(export_value))
                            else:
                                row.append(export_value or "")
                            continue
                        formatted_value = SubmissionService._format_answer_value(
                            field_type,
                            export_value,
                            file_storage_map,
                        )
                        row.append(formatted_value[0] or "")
                    writer.writerow(row)
                    yield buffer.getvalue()
                    buffer.seek(0)
                    buffer.truncate(0)

            filename = f"{_sanitize_export_base_name(form.title)}-responses.csv"
            return {
                "content": generate_csv(),
                "media_type": "text/csv",
                "headers": {
                    "Content-Disposition": _build_content_disposition(filename),
                },
            }

        if export_format == "json":
            def generate_json() -> Any:
                yield "["
                for index, response in enumerate(responses):
                    answer_map = {
                        str(answer.field_id): answer
                        for answer in response.answers
                    }
                    payload = {
                        "responseId": str(response.id),
                        "submittedAt": (response.submitted_at or response.created_at).isoformat(),
                        "answers": {},
                    }
                    answers_payload: dict[str, Any] = {}
                    for field in ordered_fields:
                        answer = answer_map.get(str(field["id"]))
                        if answer is None:
                            answers_payload[field["label"]] = None
                            continue
                        field_type = field.get("field_type", "short_text")
                        export_value = SubmissionService._export_answer_value(
                            field_type,
                            answer.answer_value,
                            file_storage_map,
                        )
                        answers_payload[field["label"]] = export_value if field_type == "file" else answer.answer_value
                    payload["answers"] = answers_payload
                    if index > 0:
                        yield ","
                    yield json.dumps(payload, ensure_ascii=False, default=str)
                yield "]"

            filename = f"{_sanitize_export_base_name(form.title)}-responses.json"
            return {
                "content": generate_json(),
                "media_type": "application/json",
                "headers": {
                    "Content-Disposition": _build_content_disposition(filename),
                },
            }

        raise ValueError("Unsupported export format")

    @staticmethod
    def get_form_analytics(
        db: Session,
        form_id: UUID,
        admin_id: int,
        version_id: UUID | None = None,
    ) -> dict[str, Any]:
        from collections import defaultdict
        from sqlalchemy import func

        form = db.scalars(
            select(Form)
            .where(Form.id == form_id)
            .where(Form.owner_admin_id == admin_id)
            .options(
                selectinload(Form.fields).selectinload(Field.options),
            )
        ).first()
        if form is None:
            raise LookupError("Form not found")

        supported_types = {"dropdown", "radio", "rating", "checkbox"}
        
        # If a specific version is requested, load fields from that version's snapshot
        # instead of the current form (which may have been modified since publication)
        if version_id is not None:
            version = db.scalars(
                select(FormVersion)
                .where(FormVersion.id == version_id)
                .where(FormVersion.form_id == form_id)
            ).first()
            if version is None:
                raise LookupError("Form version not found")
            
            # Extract fields from version snapshot using existing helper
            snapshot = version.snapshot or {}
            _, field_map_from_snapshot = _build_snapshot_field_map(snapshot)
            
            # Filter to supported analytics types
            analytic_fields = [
                f for f in field_map_from_snapshot.values() 
                if f.get("field_type") in supported_types
            ]
        else:
            # Use current form fields if no specific version requested
            analytic_fields = [f for f in form.fields if f.field_type in supported_types]

        response_filters = [
            Response.form_id == form_id,
            Response.status == "submitted"
        ]
        if version_id is not None:
            response_filters.append(Response.form_version_id == version_id)

        total_responses = db.scalar(
            select(func.count(Response.id))
            .where(*response_filters)
        ) or 0

        field_ids = [
            f.id if hasattr(f, 'id') else f["id"] 
            for f in analytic_fields
        ]
        answers = []
        if field_ids:
            answers = list(
                db.scalars(
                    select(ResponseAnswer)
                    .join(Response, ResponseAnswer.response_id == Response.id)
                    .where(*response_filters)
                    .where(ResponseAnswer.field_id.in_(field_ids))
                ).all()
            )

        answers_by_field = defaultdict(list)
        for ans in answers:
            answers_by_field[ans.field_id].append(ans)

        field_analytics_list = []
        for field in analytic_fields:
            # Handle both ORM Field objects and dict-based snapshot fields
            if hasattr(field, 'id'):
                # ORM Field object
                field_id = field.id
                field_label = field.label
                field_type = field.field_type
                field_config = field.config if hasattr(field, 'config') else {}
                options_list = field.options  # ORM FieldOption objects
            else:
                # Snapshot field dict (from _build_snapshot_field_map)
                field_id = field["id"]
                field_label = field["label"]
                field_type = field["field_type"]
                field_config = {}  # snapshots don't have separate config field
                options_list = field.get("options", [])  # List of dicts
            
            field_answers = answers_by_field[field_id]
            
            valid_answers = []
            for ans in field_answers:
                val = ans.answer_value
                if val is None or val == "":
                    continue
                if isinstance(val, list) and not val:
                    continue
                valid_answers.append(ans)

            total_valid = len(valid_answers)
            counts = defaultdict(int)

            if field_type in {"dropdown", "radio", "checkbox"}:
                # Build option map handling both ORM and dict formats
                option_map = {}
                if options_list and hasattr(options_list[0], 'option_value'):
                    # ORM FieldOption objects
                    option_map = {opt.option_value: opt.label for opt in options_list}
                else:
                    # Dict options from snapshot
                    for opt in options_list:
                        opt_val = opt.get("option_value") or opt.get("value")
                        opt_label = opt.get("label")
                        if opt_val is not None:
                            option_map[opt_val] = opt_label

                for ans in valid_answers:
                    val = ans.answer_value
                    if field_type == "checkbox":
                        if isinstance(val, list):
                            for v in val:
                                if v is not None and str(v) in option_map:
                                    counts[str(v)] += 1
                        else:
                            if val is not None and str(val) in option_map:
                                counts[str(val)] += 1
                    else:
                        if val is not None and str(val) in option_map:
                            counts[str(val)] += 1

                distribution = []
                for opt in options_list:
                    # Handle both ORM FieldOption objects and dict options
                    if hasattr(opt, 'option_value'):
                        opt_val = opt.option_value
                        opt_label = opt.label
                    else:
                        opt_val = opt.get("option_value") or opt.get("value")
                        opt_label = opt.get("label")
                    
                    count = counts[opt_val]
                    percentage = round((count / total_valid * 100), 2) if total_valid > 0 else 0.0
                    distribution.append({
                        "optionValue": opt_val,
                        "option": opt_label,
                        "count": count,
                        "percentage": percentage
                    })

            elif field_type == "rating":
                max_stars = field_config.get("max_stars") or 5
                
                for ans in valid_answers:
                    val = ans.answer_value
                    try:
                        rating_val = int(float(val))
                        counts[rating_val] += 1
                    except (ValueError, TypeError):
                        pass

                distribution = []
                for star in range(1, max_stars + 1):
                    count = counts[star]
                    percentage = round((count / total_valid * 100), 2) if total_valid > 0 else 0.0
                    distribution.append({
                        "option": str(star),
                        "count": count,
                        "percentage": percentage
                    })
            else:
                distribution = []

            field_analytics_list.append({
                "fieldId": field_id,
                "fieldLabel": field_label,
                "fieldType": field_type,
                "totalValidResponses": total_valid,
                "distribution": distribution
            })

        return {
            "formId": form_id,
            "totalResponses": total_responses,
            "fields": field_analytics_list
        }

    @staticmethod
    def delete_response(db: Session, form_id: UUID, response_id: UUID, admin_id: int) -> None:
        form = db.scalars(select(Form).where(Form.id == form_id)).first()
        if not form:
            raise LookupError("Form not found")

        if form.owner_admin_id != admin_id:
            raise PermissionError("Not authorized to delete responses for this form")

        response = db.scalars(
            select(Response).where(Response.id == response_id, Response.form_id == form_id)
        ).first()

        if not response:
            raise LookupError("Response not found")

        db.delete(response)
        db.commit()
        from app.services.audit_log_service import AuditLogService
        AuditLogService.create_audit_log(
            db=db,
            user_id=admin_id,
            action="DELETE_RESPONSE",
            form_id=form_id,
            resource_type="response",
            resource_id=str(response_id),
            details={"response_id": str(response_id)}
        )

    @staticmethod
    def delete_responses_bulk(db: Session, form_id: UUID, response_ids: list[UUID], admin_id: int) -> int:
        form = db.scalars(select(Form).where(Form.id == form_id)).first()
        if not form:
            raise LookupError("Form not found")

        if form.owner_admin_id != admin_id:
            raise PermissionError("Not authorized to delete responses for this form")

        stmt = select(Response).where(
            Response.form_id == form_id,
            Response.id.in_(response_ids)
        )
        responses = list(db.scalars(stmt).all())

        deleted_count = 0
        for response in responses:
            db.delete(response)
            deleted_count += 1

        db.commit()
        from app.services.audit_log_service import AuditLogService
        AuditLogService.create_audit_log(
            db=db,
            user_id=admin_id,
            action="BULK_DELETE_RESPONSES",
            form_id=form_id,
            resource_type="response",
            resource_id=None,
            details={
                "deleted_count": deleted_count,
                "response_ids": [str(rid) for rid in response_ids]
            }
        )
        return deleted_count

