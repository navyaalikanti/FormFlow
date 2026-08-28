"""add form and field linkage to file storage

Revision ID: 0008_add_file_storage_form_linkage
Revises: 0007_add_file_storage
Create Date: 2026-07-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0008_add_file_storage_form_linkage"
down_revision = "0007_add_file_storage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "file_storage",
        sa.Column(
            "form_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("forms.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "file_storage",
        sa.Column(
            "field_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("fields.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_file_storage_form_id", "file_storage", ["form_id"])
    op.create_index("ix_file_storage_field_id", "file_storage", ["field_id"])
    op.create_index("ix_file_storage_form_id_uploaded_at", "file_storage", ["form_id", "uploaded_at"])
    op.create_index("ix_file_storage_field_id_uploaded_at", "file_storage", ["field_id", "uploaded_at"])


def downgrade() -> None:
    op.drop_index("ix_file_storage_field_id_uploaded_at", table_name="file_storage")
    op.drop_index("ix_file_storage_form_id_uploaded_at", table_name="file_storage")
    op.drop_index("ix_file_storage_field_id", table_name="file_storage")
    op.drop_index("ix_file_storage_form_id", table_name="file_storage")
    op.drop_column("file_storage", "field_id")
    op.drop_column("file_storage", "form_id")
