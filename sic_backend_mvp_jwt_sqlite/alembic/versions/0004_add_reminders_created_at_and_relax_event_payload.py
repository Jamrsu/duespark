"""
Add reminders.created_at and relax events.payload nullability

Revision ID: 0004_add_reminders_created_at
Revises: 0003_ac_alignment
Create Date: 2025-09-09
"""

from alembic import op
import sqlalchemy as sa


revision = '0004_add_reminders_created_at'
down_revision = '0003_ac_alignment'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # Add created_at to reminders if missing
    try:
        cols = [c.get('name') for c in insp.get_columns('reminders')]
        if 'created_at' not in cols:
            op.add_column('reminders', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')))
    except Exception:
        pass

    # Relax events.payload to be nullable
    try:
        op.alter_column('events', 'payload', existing_type=sa.dialects.postgresql.JSONB, nullable=True)
    except Exception:
        pass


def downgrade() -> None:
    # Make events.payload NOT NULL again
    try:
        op.alter_column('events', 'payload', existing_type=sa.dialects.postgresql.JSONB, nullable=False)
    except Exception:
        pass

    # Drop reminders.created_at
    try:
        op.drop_column('reminders', 'created_at')
    except Exception:
        pass

