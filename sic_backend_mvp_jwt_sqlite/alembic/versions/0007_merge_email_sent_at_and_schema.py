"""
Merge heads: email sent_at branch and schema branch

Revision ID: 0007_merge_email_schema
Revises: 0006_schema_env_idempotency, 0005_add_reminders_sent_at
Create Date: 2025-09-09
"""

from alembic import op
import sqlalchemy as sa


revision = '0007_merge_email_schema'
down_revision = ('0006_schema_env_idempotency', '0005_add_reminders_sent_at')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration; no schema changes required.
    pass


def downgrade() -> None:
    # This is a merge migration; no schema changes required.
    pass
