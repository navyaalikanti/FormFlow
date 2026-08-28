"""add validation rules and conditional logic tables

Revision ID: 0004_add_validation_and_conditional_logic
Revises: 0003_add_sections
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004_add_validation_and_conditional_logic"
down_revision = "0003_add_sections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Alter alembic_version version_num column size to 255 to fit longer revision names
    op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)")

    # validation_rules column already exists in fields table from 0002_create_formflow_platform
    # but we need to ensure it's properly initialized for new functionality
    
    # Create validation_rule_templates table for reusable validation templates
    op.create_table(
        "validation_rule_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("field_type", sa.String(length=64), nullable=False),
        sa.Column("rules", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_validation_rule_templates_form_id", "validation_rule_templates", ["form_id"])
    op.create_index("ix_validation_rule_templates_form_id_field_type", "validation_rule_templates", ["form_id", "field_type"])

    # Ensure conditional_logic table has all necessary columns and indexes
    # Check if table exists first by trying to inspect it
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Verify conditional_logic table exists and has proper structure
    if "conditional_logic" in inspector.get_table_names():
        # Table exists, add any missing indexes
        existing_indexes = {idx['name'] for idx in inspector.get_indexes("conditional_logic")}
        
        if "ix_conditional_logic_form_source_priority" not in existing_indexes:
            op.create_index(
                "ix_conditional_logic_form_source_priority",
                "conditional_logic",
                ["form_id", "source_field_id", "priority"],
            )
        
        if "ix_conditional_logic_form_target_priority" not in existing_indexes:
            op.create_index(
                "ix_conditional_logic_form_target_priority",
                "conditional_logic",
                ["form_id", "target_field_id", "priority"],
            )
    
    # Create validation_errors table for logging validation failures
    op.create_table(
        "validation_errors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("responses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fields.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("error_type", sa.String(length=64), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=False),
        sa.Column("attempted_value", postgresql.JSONB(), nullable=True),
        sa.Column("validation_rule", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_validation_errors_response_id", "validation_errors", ["response_id"])
    op.create_index("ix_validation_errors_field_id", "validation_errors", ["field_id"])
    op.create_index("ix_validation_errors_response_id_field_id", "validation_errors", ["response_id", "field_id"])


def downgrade() -> None:
    op.drop_index("ix_validation_errors_response_id_field_id", table_name="validation_errors")
    op.drop_index("ix_validation_errors_field_id", table_name="validation_errors")
    op.drop_index("ix_validation_errors_response_id", table_name="validation_errors")
    op.drop_table("validation_errors")
    
    op.drop_index("ix_validation_rule_templates_form_id_field_type", table_name="validation_rule_templates")
    op.drop_index("ix_validation_rule_templates_form_id", table_name="validation_rule_templates")
    op.drop_table("validation_rule_templates")
