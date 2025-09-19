"""
Initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2025-09-09
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enums
    invoicestatus = sa.Enum('draft','pending','paid','overdue','cancelled', name='invoicestatus')
    reminderstatus = sa.Enum('scheduled','sent','failed','cancelled', name='reminderstatus')
    channel = sa.Enum('email','sms','whatsapp', name='channel')

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'clients',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('timezone', sa.String(length=64), server_default='UTC'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('payment_behavior_score', sa.Numeric(4,2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.id'), nullable=False, index=True),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=8), server_default='USD'),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('status', invoicestatus, index=True, server_default='pending', nullable=False),
        sa.Column('external_id', sa.String(length=255), nullable=True),
        sa.Column('source', sa.String(length=32), server_default='manual'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        'reminders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id'), nullable=False, index=True),
        sa.Column('send_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('channel', channel, server_default='email', nullable=False),
        sa.Column('status', reminderstatus, server_default='scheduled', nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('reminders')
    op.drop_table('invoices')
    op.drop_table('clients')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS invoicestatus')
    op.execute('DROP TYPE IF EXISTS reminderstatus')
    op.execute('DROP TYPE IF EXISTS channel')

