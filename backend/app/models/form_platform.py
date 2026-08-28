from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Form(Base, TimestampMixin):
    __tablename__ = "forms"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # title/description remain on Form as the "working copy" for the current draft.
    # Published versions store authoritative title/description in their snapshot.
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Aggregate status: 'draft' = active draft version exists; 'published' = no active draft; 'archived'
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    public_slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    share_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    published_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("form_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    theme_config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    analytics_config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    ai_config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Response collection limits (set at publish time)
    limit_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_responses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deadline_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deadline_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner_admin = relationship("Admin")
    published_version = relationship(
        "FormVersion",
        foreign_keys=lambda: [Form.published_version_id],
        post_update=True,
        uselist=False,
    )
    versions = relationship(
        "FormVersion",
        back_populates="form",
        foreign_keys=lambda: [FormVersion.form_id],
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    sections = relationship(
        "Section",
        back_populates="form",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="[Section.section_order, Section.id]",
    )
    fields = relationship(
        "Field",
        back_populates="form",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="[Field.sort_order, Field.id]",
    )
    responses = relationship(
        "Response",
        back_populates="form",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    retention_policy = relationship(
        "RetentionPolicy",
        back_populates="form",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    logs = relationship("ActivityLog", back_populates="form")

    @property
    def published_version_link_token(self) -> str | None:
        return self.published_version.link_token if self.published_version is not None else None

    __table_args__ = (
        Index("ix_forms_owner_admin_status", "owner_admin_id", "status"),
        Index("ix_forms_status_published_at", "status", "published_at"),
    )


class Section(Base, TimestampMixin):
    __tablename__ = "sections"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    section_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_collapsible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    form = relationship("Form", back_populates="sections")
    fields = relationship(
        "Field",
        back_populates="section",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="[Field.sort_order, Field.id]",
    )

    __table_args__ = (
        Index("ix_sections_form_id_section_order", "form_id", "section_order"),
    )


class FormVersion(Base, TimestampMixin):
    __tablename__ = "form_versions"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    version_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Per-version title and description (authoritative for published versions)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    version_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    published_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    link_token: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True, index=True)

    form = relationship("Form", back_populates="versions", foreign_keys=[form_id])
    created_by_admin = relationship("Admin", foreign_keys=[created_by_admin_id])
    published_by_admin = relationship("Admin", foreign_keys=[published_by_admin_id])
    responses = relationship("Response", back_populates="form_version")
    logs = relationship("ActivityLog", back_populates="form_version")

    __table_args__ = (
        UniqueConstraint("form_id", "version_number", name="uq_form_versions_form_id_version_number"),
        Index("ix_form_versions_form_id_status", "form_id", "status"),
    )


class Field(Base, TimestampMixin):
    __tablename__ = "fields"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_key: Mapped[str] = mapped_column(String(160), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    placeholder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    helper_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_value: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    validation_rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    ai_config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_read_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    allows_multiple: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    form = relationship("Form", back_populates="fields")
    section = relationship("Section", back_populates="fields")
    options = relationship(
        "FieldOption",
        back_populates="field",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    source_logic_rules = relationship(
        "ConditionalLogic",
        foreign_keys=lambda: [ConditionalLogic.source_field_id],
        back_populates="source_field",
        passive_deletes=True,
    )
    target_logic_rules = relationship(
        "ConditionalLogic",
        foreign_keys=lambda: [ConditionalLogic.target_field_id],
        back_populates="target_field",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("form_id", "field_key", name="uq_fields_form_id_field_key"),
        Index("ix_fields_form_id_sort_order", "form_id", "sort_order"),
        Index("ix_fields_form_id_field_type", "form_id", "field_type"),
        Index("ix_fields_section_id", "section_id"),
        Index("ix_fields_section_id_sort_order", "section_id", "sort_order"),
    )


class FieldOption(Base, TimestampMixin):
    __tablename__ = "field_options"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    option_value: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    option_config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    field = relationship("Field", back_populates="options")

    __table_args__ = (
        UniqueConstraint("field_id", "option_value", name="uq_field_options_field_id_option_value"),
        Index("ix_field_options_field_id_sort_order", "field_id", "sort_order"),
    )


class ConditionalLogic(Base, TimestampMixin):
    __tablename__ = "conditional_logic"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_field_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_field_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    trigger_event: Mapped[str] = mapped_column(String(64), nullable=False)
    operator: Mapped[str] = mapped_column(String(64), nullable=False)
    comparison_value: Mapped[dict[str, Any] | list[Any] | str | int | float | bool | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    action_config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    form = relationship("Form")
    source_field = relationship(
        "Field",
        foreign_keys=[source_field_id],
        back_populates="source_logic_rules",
    )
    target_field = relationship(
        "Field",
        foreign_keys=[target_field_id],
        back_populates="target_logic_rules",
    )

    __table_args__ = (
        Index("ix_conditional_logic_form_source_priority", "form_id", "source_field_id", "priority"),
        Index("ix_conditional_logic_form_target_priority", "form_id", "target_field_id", "priority"),
    )


class Response(Base, TimestampMixin):
    __tablename__ = "responses"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    form_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("form_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    submitted_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    respondent_identifier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    respondent_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    respondent_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    locale: Mapped[str | None] = mapped_column(String(32), nullable=True)
    response_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    form = relationship("Form", back_populates="responses")
    form_version = relationship("FormVersion", back_populates="responses")
    submitted_by_admin = relationship("Admin")
    answers = relationship(
        "ResponseAnswer",
        back_populates="response",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    uploads = relationship("FileUpload", back_populates="response", passive_deletes=True)

    __table_args__ = (
        Index("ix_responses_form_id_status", "form_id", "status"),
        Index("ix_responses_form_version_id_submitted_at", "form_version_id", "submitted_at"),
        Index("ix_responses_submitted_by_admin_id", "submitted_by_admin_id"),
    )


class ResponseAnswer(Base, TimestampMixin):
    __tablename__ = "response_answers"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    field_option_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    answer_value: Mapped[dict[str, Any] | list[Any] | str | int | float | bool | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_number: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    answer_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answer_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    response = relationship("Response", back_populates="answers")
    file_uploads = relationship(
        "FileUpload",
        back_populates="response_answer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("response_id", "field_id", name="uq_response_answers_response_id_field_id"),
        Index("ix_response_answers_field_id", "field_id"),
        Index("ix_response_answers_field_option_id", "field_option_id"),
    )


class FileUpload(Base, TimestampMixin):
    __tablename__ = "file_uploads"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    response_answer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("response_answers.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    field_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    storage_provider: Mapped[str] = mapped_column(String(64), nullable=False, default="neon")
    storage_bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    upload_status: Mapped[str] = mapped_column(String(32), nullable=False, default="uploaded")
    public_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    upload_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    response = relationship("Response", back_populates="uploads")
    response_answer = relationship("ResponseAnswer", back_populates="file_uploads")

    __table_args__ = (
        Index("ix_file_uploads_response_id_field_id", "response_id", "field_id"),
        Index("ix_file_uploads_response_answer_id", "response_answer_id"),
    )


class ValidationRuleTemplate(Base, TimestampMixin):
    __tablename__ = "validation_rule_templates"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[str] = mapped_column(String(64), nullable=False)
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    form = relationship("Form")

    __table_args__ = (
        Index("ix_validation_rule_templates_form_id", "form_id"),
        Index("ix_validation_rule_templates_form_id_field_type", "form_id", "field_type"),
    )


class ValidationError(Base, TimestampMixin):
    __tablename__ = "validation_errors"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    error_type: Mapped[str] = mapped_column(String(64), nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    attempted_value: Mapped[dict[str, Any] | list[Any] | str | int | float | bool | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    validation_rule: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    response = relationship("Response")

    __table_args__ = (
        Index("ix_validation_errors_response_id", "response_id"),
        Index("ix_validation_errors_field_id", "field_id"),
        Index("ix_validation_errors_response_id_field_id", "response_id", "field_id"),
    )


class ActivityLog(Base, TimestampMixin):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    form_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("forms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    form_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("form_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(128), nullable=False)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    event_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    actor_admin = relationship("Admin")
    form = relationship("Form", back_populates="logs")
    form_version = relationship("FormVersion", back_populates="logs")

    __table_args__ = (
        Index("ix_activity_logs_form_id_created_at", "form_id", "created_at"),
        Index("ix_activity_logs_admin_id_created_at", "admin_id", "created_at"),
        Index("ix_activity_logs_entity_type_entity_id", "entity_type", "entity_id"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    form_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("forms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    user = relationship("Admin")
    form = relationship("Form")

    @property
    def user_name(self) -> str | None:
        return self.user.name if self.user is not None else None

    @property
    def user_email(self) -> str | None:
        return self.user.email if self.user is not None else None

    @property
    def form_title(self) -> str | None:
        return self.form.title if self.form is not None else None

