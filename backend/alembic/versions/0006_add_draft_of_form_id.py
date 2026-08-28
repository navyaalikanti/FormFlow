"""Add draft_of_form_id to forms for Edit-as-New-Draft workflow

Revision ID: 0006_add_draft_of_form_id
Revises: 0005_add_form_version_link_token
Create Date: 2026-07-20

When "Edit as New Draft" is clicked on a published form, a brand-new Form
record is created as a true draft copy. The new form's draft_of_form_id
points back to the original published form so that:
- Both forms are visible in the list (published + draft).
- Publishing the draft copies its content back to the original form,
  keeping the same public share_token / URL, then deletes the draft.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


revision = "0006_add_draft_of_form_id"
down_revision = "0005_add_form_version_link_token"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "forms",
        sa.Column(
            "draft_of_form_id",
            PG_UUID(as_uuid=True),
            sa.ForeignKey("forms.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_forms_draft_of_form_id",
        "forms",
        ["draft_of_form_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_forms_draft_of_form_id", table_name="forms")
    op.drop_column("forms", "draft_of_form_id")
