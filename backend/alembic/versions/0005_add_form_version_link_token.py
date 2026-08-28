"""Add link_token to form_versions for version-specific public links

Revision ID: 0005_add_form_version_link_token
Revises: 0004_add_validation_and_conditional_logic
Create Date: 2026-07-14
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_add_form_version_link_token"
down_revision = "0004_add_validation_and_conditional_logic"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add link_token column to form_versions table for version-specific public links
    op.add_column(
        "form_versions",
        sa.Column("link_token", sa.String(length=128), nullable=True, unique=True),
    )
    op.create_index(
        "ix_form_versions_link_token",
        "form_versions",
        ["link_token"],
    )


def downgrade() -> None:
    op.drop_index("ix_form_versions_link_token", table_name="form_versions")
    op.drop_column("form_versions", "link_token")
