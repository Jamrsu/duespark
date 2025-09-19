"""
add outbox table

Revision ID: 0008_outbox_table
Revises: 0007_merge_email_sent_at_and_schema
Create Date: 2025-09-10 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '0008_outbox_table'
down_revision = '0007_merge_email_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op placeholder; future revision can create the outbox table when enabled.
    pass


def downgrade() -> None:
    pass
