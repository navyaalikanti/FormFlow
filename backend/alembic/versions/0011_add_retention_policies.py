"""add retention_policies table

Revision ID: 0011_add_retention_policies
Revises: f61b9ec83310
Create Date: 2026-08-11 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0011_add_retention_policies"
down_revision = "f61b9ec83310"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "retention_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "form_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("forms.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("retention_days", sa.Integer(), nullable=False, server_default=sa.text("90")),
        sa.Column("action", sa.String(length=32), nullable=False, server_default=sa.text("'archive'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_retention_policies_form_id", "retention_policies", ["form_id"])


def downgrade() -> None:
    op.drop_index("ix_retention_policies_form_id", table_name="retention_policies")
    op.drop_table("retention_policies")
