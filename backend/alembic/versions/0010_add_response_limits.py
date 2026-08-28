"""add response collection limits to forms

Revision ID: 0010_add_response_limits
Revises: 253299321431
Create Date: 2026-08-07 09:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '0010_add_response_limits'
down_revision = '253299321431'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('forms', sa.Column('limit_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('forms', sa.Column('max_responses', sa.Integer(), nullable=True))
    op.add_column('forms', sa.Column('deadline_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('forms', sa.Column('deadline_datetime', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('forms', 'deadline_datetime')
    op.drop_column('forms', 'deadline_enabled')
    op.drop_column('forms', 'max_responses')
    op.drop_column('forms', 'limit_enabled')
