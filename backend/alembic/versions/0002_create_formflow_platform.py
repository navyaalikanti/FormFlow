"""create formflow platform schema

Revision ID: 0002_create_formflow_platform
Revises: 0001_create_admins
Create Date: 2026-07-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_create_formflow_platform"
down_revision = "0001_create_admins"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "forms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("owner_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("public_slug", sa.String(length=160), nullable=False),
        sa.Column("share_token", sa.String(length=128), nullable=False),
        sa.Column("published_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("settings", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("theme_config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("analytics_config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ai_config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("public_slug", name="uq_forms_public_slug"),
        sa.UniqueConstraint("share_token", name="uq_forms_share_token"),
    )
    op.create_index("ix_forms_owner_admin_id", "forms", ["owner_admin_id"])
    op.create_index("ix_forms_published_version_id", "forms", ["published_version_id"])
    op.create_index("ix_forms_status", "forms", ["status"])
    op.create_index("ix_forms_owner_admin_status", "forms", ["owner_admin_id", "status"])
    op.create_index("ix_forms_status_published_at", "forms", ["status", "published_at"])

    op.create_table(
        "form_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("version_label", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("version_hash", sa.String(length=128), nullable=True),
        sa.Column("created_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("published_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("form_id", "version_number", name="uq_form_versions_form_id_version_number"),
    )
    op.create_index("ix_form_versions_form_id", "form_versions", ["form_id"])
    op.create_index("ix_form_versions_created_by_admin_id", "form_versions", ["created_by_admin_id"])
    op.create_index("ix_form_versions_published_by_admin_id", "form_versions", ["published_by_admin_id"])
    op.create_index("ix_form_versions_form_id_status", "form_versions", ["form_id", "status"])

    op.create_foreign_key(
        "fk_forms_published_version_id_form_versions",
        "forms",
        "form_versions",
        ["published_version_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_key", sa.String(length=160), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("field_type", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("placeholder", sa.String(length=255), nullable=True),
        sa.Column("helper_text", sa.Text(), nullable=True),
        sa.Column("default_value", postgresql.JSONB(), nullable=True),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("validation_rules", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ai_config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_read_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("allows_multiple", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("form_id", "field_key", name="uq_fields_form_id_field_key"),
    )
    op.create_index("ix_fields_form_id", "fields", ["form_id"])
    op.create_index("ix_fields_form_id_sort_order", "fields", ["form_id", "sort_order"])
    op.create_index("ix_fields_form_id_field_type", "fields", ["form_id", "field_type"])

    op.create_table(
        "field_options",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fields.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("option_value", sa.String(length=255), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("option_config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("field_id", "option_value", name="uq_field_options_field_id_option_value"),
    )
    op.create_index("ix_field_options_field_id", "field_options", ["field_id"])
    op.create_index("ix_field_options_field_id_sort_order", "field_options", ["field_id", "sort_order"])

    op.create_table(
        "conditional_logic",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fields.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fields.id", ondelete="CASCADE"), nullable=True),
        sa.Column("trigger_event", sa.String(length=64), nullable=False),
        sa.Column("operator", sa.String(length=64), nullable=False),
        sa.Column("comparison_value", postgresql.JSONB(), nullable=True),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("action_config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_conditional_logic_form_id", "conditional_logic", ["form_id"])
    op.create_index("ix_conditional_logic_source_field_id", "conditional_logic", ["source_field_id"])
    op.create_index("ix_conditional_logic_target_field_id", "conditional_logic", ["target_field_id"])
    op.create_index("ix_conditional_logic_form_source_priority", "conditional_logic", ["form_id", "source_field_id", "priority"])
    op.create_index("ix_conditional_logic_form_target_priority", "conditional_logic", ["form_id", "target_field_id", "priority"])

    op.create_table(
        "responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("form_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("form_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("submitted_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'in_progress'")),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("respondent_identifier", sa.String(length=255), nullable=True),
        sa.Column("respondent_email", sa.String(length=255), nullable=True),
        sa.Column("respondent_ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("referrer", sa.Text(), nullable=True),
        sa.Column("locale", sa.String(length=32), nullable=True),
        sa.Column("response_metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_responses_form_id", "responses", ["form_id"])
    op.create_index("ix_responses_form_version_id", "responses", ["form_version_id"])
    op.create_index("ix_responses_submitted_by_admin_id", "responses", ["submitted_by_admin_id"])
    op.create_index("ix_responses_form_id_status", "responses", ["form_id", "status"])
    op.create_index("ix_responses_form_version_id_submitted_at", "responses", ["form_version_id", "submitted_at"])

    op.create_table(
        "response_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("responses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fields.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("field_option_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("field_options.id", ondelete="SET NULL"), nullable=True),
        sa.Column("answer_value", postgresql.JSONB(), nullable=True),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("answer_number", sa.Numeric(18, 6), nullable=True),
        sa.Column("answer_boolean", sa.Boolean(), nullable=True),
        sa.Column("answer_metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("response_id", "field_id", name="uq_response_answers_response_id_field_id"),
    )
    op.create_index("ix_response_answers_response_id", "response_answers", ["response_id"])
    op.create_index("ix_response_answers_field_id", "response_answers", ["field_id"])
    op.create_index("ix_response_answers_field_option_id", "response_answers", ["field_option_id"])

    op.create_table(
        "file_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("responses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("response_answer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("response_answers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fields.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storage_provider", sa.String(length=64), nullable=False, server_default=sa.text("'neon'")),
        sa.Column("storage_bucket", sa.String(length=255), nullable=True),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("mime_type", sa.String(length=255), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column("upload_status", sa.String(length=32), nullable=False, server_default=sa.text("'uploaded'")),
        sa.Column("public_url", sa.Text(), nullable=True),
        sa.Column("upload_metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("storage_key", name="uq_file_uploads_storage_key"),
    )
    op.create_index("ix_file_uploads_response_id", "file_uploads", ["response_id"])
    op.create_index("ix_file_uploads_response_answer_id", "file_uploads", ["response_answer_id"])
    op.create_index("ix_file_uploads_field_id", "file_uploads", ["field_id"])
    op.create_index("ix_file_uploads_response_id_field_id", "file_uploads", ["response_id", "field_id"])

    op.create_table(
        "activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("form_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("form_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=False),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("event_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("before_state", postgresql.JSONB(), nullable=True),
        sa.Column("after_state", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_activity_logs_admin_id", "activity_logs", ["admin_id"])
    op.create_index("ix_activity_logs_form_id", "activity_logs", ["form_id"])
    op.create_index("ix_activity_logs_form_version_id", "activity_logs", ["form_version_id"])
    op.create_index("ix_activity_logs_form_id_created_at", "activity_logs", ["form_id", "created_at"])
    op.create_index("ix_activity_logs_admin_id_created_at", "activity_logs", ["admin_id", "created_at"])
    op.create_index("ix_activity_logs_entity_type_entity_id", "activity_logs", ["entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_table("activity_logs")
    op.drop_table("file_uploads")
    op.drop_table("response_answers")
    op.drop_table("responses")
    op.drop_table("conditional_logic")
    op.drop_table("field_options")
    op.drop_table("fields")
    op.drop_constraint("fk_forms_published_version_id_form_versions", "forms", type_="foreignkey")
    op.drop_table("form_versions")
    op.drop_table("forms")
