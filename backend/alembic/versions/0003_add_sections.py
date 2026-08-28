"""add sections and section-backed fields

Revision ID: 0003_add_sections
Revises: 0002_create_formflow_platform
Create Date: 2026-07-03
"""

from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0003_add_sections"
down_revision = "0002_create_formflow_platform"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("forms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("section_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_collapsible", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_sections_form_id", "sections", ["form_id"])
    op.create_index("ix_sections_form_id_section_order", "sections", ["form_id", "section_order"])

    op.add_column("fields", sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_fields_section_id", "fields", ["section_id"])
    op.create_index("ix_fields_section_id_sort_order", "fields", ["section_id", "sort_order"])
    op.create_foreign_key(
        "fk_fields_section_id_sections",
        "fields",
        "sections",
        ["section_id"],
        ["id"],
        ondelete="CASCADE",
    )

    bind = op.get_bind()
    form_ids = bind.execute(sa.text("SELECT id FROM forms ORDER BY created_at, id")).scalars().all()

    section_table = sa.table(
        "sections",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("form_id", postgresql.UUID(as_uuid=True)),
        sa.column("title", sa.String(length=255)),
        sa.column("description", sa.Text()),
        sa.column("section_order", sa.Integer()),
        sa.column("is_collapsible", sa.Boolean()),
    )

    default_section_by_form_id: dict[uuid.UUID, uuid.UUID] = {}
    section_rows = []
    for form_id in form_ids:
        section_id = uuid.uuid4()
        default_section_by_form_id[form_id] = section_id
        section_rows.append(
            {
                "id": section_id,
                "form_id": form_id,
                "title": "Section 1",
                "description": None,
                "section_order": 0,
                "is_collapsible": False,
            }
        )

    if section_rows:
        op.bulk_insert(section_table, section_rows)

    for form_id, section_id in default_section_by_form_id.items():
        bind.execute(
            sa.text(
                "UPDATE fields "
                "SET section_id = :section_id "
                "WHERE form_id = :form_id AND section_id IS NULL"
            ),
            {"section_id": section_id, "form_id": form_id},
        )

    op.alter_column("fields", "section_id", nullable=False)


def downgrade() -> None:
    op.drop_constraint("fk_fields_section_id_sections", "fields", type_="foreignkey")
    op.drop_index("ix_fields_section_id_sort_order", table_name="fields")
    op.drop_index("ix_fields_section_id", table_name="fields")
    op.drop_column("fields", "section_id")
    op.drop_index("ix_sections_form_id_section_order", table_name="sections")
    op.drop_index("ix_sections_form_id", table_name="sections")
    op.drop_table("sections")
