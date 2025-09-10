"""
Schema/env/idempotency alignment:
- Add revoked_at to stripe_accounts
- Add partial unique index on invoices.external_id (WHERE external_id IS NOT NULL)

Revision ID: 0006_schema_env_idempotency
Revises: 0005_stripe_integration_tables
Create Date: 2025-09-09
"""

from alembic import op
import sqlalchemy as sa


revision = '0006_schema_env_idempotency'
down_revision = '0005_stripe_integration_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # stripe_accounts.revoked_at
    try:
        cols = [c.get('name') for c in insp.get_columns('stripe_accounts')]
        if 'revoked_at' not in cols:
            op.add_column('stripe_accounts', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))
    except Exception:
        pass

    # invoices.external_id unique (non-null only)
    # Create a partial unique index to allow multiple NULLs
    try:
        op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_external_id_not_null ON invoices(external_id) WHERE external_id IS NOT NULL")
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.execute("DROP INDEX IF EXISTS ux_invoices_external_id_not_null")
    except Exception:
        pass
    try:
        op.drop_column('stripe_accounts', 'revoked_at')
    except Exception:
        pass

