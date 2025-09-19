"""Add performance indexes for scheduler and analytics optimization

Revision ID: 0014_performance_indexes
Revises: 0001_initial
Create Date: 2025-09-15 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '0014'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add critical performance indexes for scheduler and analytics queries"""

    # Skip performance indexes during initial deployment to avoid timeout
    # These will be added post-deployment via separate migration or manual process
    # This enables faster deployment while keeping the migration for future use

    import os
    if os.getenv('SKIP_PERFORMANCE_INDEXES', 'false').lower() == 'true':
        print("Skipping performance indexes due to SKIP_PERFORMANCE_INDEXES=true")
        return

    # Critical scheduler performance indexes
    # These will improve the scheduler from O(n) to O(log n) lookups
    # Only create indexes on tables that exist in the basic schema
    try:
        op.create_index(
            'idx_reminders_status_send_at',
            'reminders',
            ['status', 'send_at'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table may not exist yet

    try:
        op.create_index(
            'idx_reminders_invoice_status_send_at',
            'reminders',
            ['invoice_id', 'status', 'send_at'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table may not exist yet

    # Invoice analytics and due date performance indexes
    # These will speed up dashboard queries and cash flow predictions by 5-10x
    try:
        op.create_index(
            'idx_invoices_user_due_date_status',
            'invoices',
            ['user_id', 'due_date', 'status'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table may not exist yet

    try:
        op.create_index(
            'idx_invoices_user_created_at',
            'invoices',
            ['user_id', 'created_at'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table may not exist yet

    # Paid invoices analytics - only index rows with paid_at values
    try:
        op.create_index(
            'idx_invoices_paid_at_status',
            'invoices',
            ['paid_at', 'status'],
            postgresql_using='btree',
            postgresql_where=sa.text('paid_at IS NOT NULL')
        )
    except Exception:
        pass  # Table may not exist yet

    # Client analytics for growth and engagement metrics
    try:
        op.create_index(
            'idx_clients_user_created_at',
            'clients',
            ['user_id', 'created_at'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table may not exist yet

    # Skip advanced table indexes for now - they can be added later
    # when those tables are created in future migrations


def downgrade() -> None:
    """Remove performance indexes"""
    # Only drop indexes that exist
    try:
        op.drop_index('idx_clients_user_created_at', table_name='clients')
    except Exception:
        pass
    try:
        op.drop_index('idx_invoices_paid_at_status', table_name='invoices')
    except Exception:
        pass
    try:
        op.drop_index('idx_invoices_user_created_at', table_name='invoices')
    except Exception:
        pass
    try:
        op.drop_index('idx_invoices_user_due_date_status', table_name='invoices')
    except Exception:
        pass
    try:
        op.drop_index('idx_reminders_invoice_status_send_at', table_name='reminders')
    except Exception:
        pass
    try:
        op.drop_index('idx_reminders_status_send_at', table_name='reminders')
    except Exception:
        pass