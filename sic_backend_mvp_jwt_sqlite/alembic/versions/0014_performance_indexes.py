"""Add performance indexes for scheduler and analytics optimization

Revision ID: 0014_performance_indexes
Revises: 0013_phase4_enterprise
Create Date: 2025-09-15 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add critical performance indexes for scheduler and analytics queries"""

    # Critical scheduler performance indexes
    # These will improve the scheduler from O(n) to O(log n) lookups
    op.create_index(
        'idx_reminders_status_send_at',
        'reminders',
        ['status', 'send_at'],
        postgresql_using='btree'
    )

    op.create_index(
        'idx_reminders_invoice_status_send_at',
        'reminders',
        ['invoice_id', 'status', 'send_at'],
        postgresql_using='btree'
    )

    # Invoice analytics and due date performance indexes
    # These will speed up dashboard queries and cash flow predictions by 5-10x
    op.create_index(
        'idx_invoices_user_due_date_status',
        'invoices',
        ['user_id', 'due_date', 'status'],
        postgresql_using='btree'
    )

    op.create_index(
        'idx_invoices_user_created_at',
        'invoices',
        ['user_id', 'created_at'],
        postgresql_using='btree'
    )

    # Paid invoices analytics - only index rows with paid_at values
    op.create_index(
        'idx_invoices_paid_at_status',
        'invoices',
        ['paid_at', 'status'],
        postgresql_using='btree',
        postgresql_where=sa.text('paid_at IS NOT NULL')
    )

    # Client analytics for growth and engagement metrics
    op.create_index(
        'idx_clients_user_created_at',
        'clients',
        ['user_id', 'created_at'],
        postgresql_using='btree'
    )

    # Events analytics for onboarding and user behavior tracking
    op.create_index(
        'idx_events_user_entity_created_at',
        'events',
        ['user_id', 'entity_type', 'created_at'],
        postgresql_using='btree'
    )

    # Subscription analytics for revenue metrics
    op.create_index(
        'idx_subscriptions_status_created_at',
        'subscriptions',
        ['status', 'created_at'],
        postgresql_using='btree'
    )


def downgrade() -> None:
    """Remove performance indexes"""
    op.drop_index('idx_subscriptions_status_created_at', table_name='subscriptions')
    op.drop_index('idx_events_user_entity_created_at', table_name='events')
    op.drop_index('idx_clients_user_created_at', table_name='clients')
    op.drop_index('idx_invoices_paid_at_status', table_name='invoices')
    op.drop_index('idx_invoices_user_created_at', table_name='invoices')
    op.drop_index('idx_invoices_user_due_date_status', table_name='invoices')
    op.drop_index('idx_reminders_invoice_status_send_at', table_name='reminders')
    op.drop_index('idx_reminders_status_send_at', table_name='reminders')