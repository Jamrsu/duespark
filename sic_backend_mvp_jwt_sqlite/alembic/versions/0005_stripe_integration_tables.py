"""
Stripe integration: stripe_accounts, dead_letters, invoice.payment_link_url

Revision ID: 0005_stripe_integration_tables
Revises: 0004_add_reminders_created_at
Create Date: 2025-09-09
"""

from alembic import op
import sqlalchemy as sa


revision = '0005_stripe_integration_tables'
down_revision = '0004_add_reminders_created_at'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # invoice.payment_link_url
    cols = [c.get('name') for c in insp.get_columns('invoices')]
    if 'payment_link_url' not in cols:
        op.add_column('invoices', sa.Column('payment_link_url', sa.String(length=512), nullable=True))

    # stripe_accounts
    if not insp.has_table('stripe_accounts'):
        op.create_table(
            'stripe_accounts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('stripe_account_id', sa.String(length=64), nullable=False),
            sa.Column('access_token', sa.String(length=255), nullable=False),
            sa.Column('refresh_token', sa.String(length=255), nullable=True),
            sa.Column('scope', sa.String(length=64), nullable=True),
            sa.Column('livemode', sa.Integer(), server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        # user_id index created implicitly via index=True above
        try:
            op.create_index('ix_stripe_accounts_stripe_account_id', 'stripe_accounts', ['stripe_account_id'], unique=True)
        except Exception:
            pass

    # dead_letters
    if not insp.has_table('dead_letters'):
        op.create_table(
            'dead_letters',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('kind', sa.String(length=64), index=True, nullable=False),
            sa.Column('payload', sa.dialects.postgresql.JSONB, nullable=False),
            sa.Column('error', sa.Text(), nullable=False),
            sa.Column('retries', sa.Integer(), server_default='0'),
            sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        # kind index created implicitly via index=True above


def downgrade() -> None:
    # drop dead_letters
    try:
        op.drop_index('ix_dead_letters_kind', table_name='dead_letters')
        op.drop_table('dead_letters')
    except Exception:
        pass
    # drop stripe_accounts
    try:
        op.drop_index('ix_stripe_accounts_stripe_account_id', table_name='stripe_accounts')
        op.drop_index('ix_stripe_accounts_user_id', table_name='stripe_accounts')
        op.drop_table('stripe_accounts')
    except Exception:
        pass
    # drop invoice.payment_link_url
    try:
        op.drop_column('invoices', 'payment_link_url')
    except Exception:
        pass
