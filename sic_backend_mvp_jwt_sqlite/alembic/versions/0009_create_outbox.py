"""
create outbox table

Revision ID: 0009_create_outbox
Revises: 0008_outbox_table
Create Date: 2025-09-10 00:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '0009_create_outbox'
down_revision: Union[str, None] = '0008_outbox_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent creation to support environments where the table may preexist
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS outbox (
                id SERIAL PRIMARY KEY,
                topic VARCHAR(64) NOT NULL,
                payload JSONB NOT NULL,
                status VARCHAR(16) NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                next_attempt_at TIMESTAMPTZ NULL,
                dispatched_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            )
            """
        )
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_outbox_topic ON outbox(topic)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_outbox_status ON outbox(status)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_outbox_status")
    op.execute("DROP INDEX IF EXISTS ix_outbox_topic")
    op.execute("DROP TABLE IF EXISTS outbox")
