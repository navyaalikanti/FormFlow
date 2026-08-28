"""add file storage table for supabase-backed uploads

Revision ID: 0007_add_file_storage
Revises: 0006_add_draft_of_form_id
Create Date: 2026-07-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0007_add_file_storage"
down_revision = "0006_add_draft_of_form_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "file_storage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("file_key", sa.String(length=255), nullable=False),
        sa.Column("original_name", sa.String(length=512), nullable=False),
        sa.Column("bucket_name", sa.String(length=255), nullable=False),
        sa.Column("object_path", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=True),
        sa.Column("extension", sa.String(length=32), nullable=True),
        sa.Column("size", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("file_key", name="uq_file_storage_file_key"),
        sa.UniqueConstraint("object_path", name="uq_file_storage_object_path"),
    )
    op.create_index("ix_file_storage_file_key", "file_storage", ["file_key"])
    op.create_index("ix_file_storage_bucket_name", "file_storage", ["bucket_name"])
    op.create_index("ix_file_storage_uploaded_by", "file_storage", ["uploaded_by"])
    op.create_index("ix_file_storage_uploaded_by_uploaded_at", "file_storage", ["uploaded_by", "uploaded_at"])
    op.create_index("ix_file_storage_bucket_name_uploaded_at", "file_storage", ["bucket_name", "uploaded_at"])
    op.create_index("ix_file_storage_is_deleted_deleted_at", "file_storage", ["is_deleted", "deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_file_storage_is_deleted_deleted_at", table_name="file_storage")
    op.drop_index("ix_file_storage_bucket_name_uploaded_at", table_name="file_storage")
    op.drop_index("ix_file_storage_uploaded_by_uploaded_at", table_name="file_storage")
    op.drop_index("ix_file_storage_uploaded_by", table_name="file_storage")
    op.drop_index("ix_file_storage_bucket_name", table_name="file_storage")
    op.drop_index("ix_file_storage_file_key", table_name="file_storage")
    op.drop_table("file_storage")
