"""Add subscription billing models

Revision ID: 0010_subscription_billing_models
Revises: 0009_create_outbox
Create Date: 2024-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers
revision = '0010_subscription_billing_models'
down_revision = '0009_create_outbox'
branch_labels = None
depends_on = None


def upgrade():
    # Create usage_limits table
    op.create_table('usage_limits',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tier', sa.Enum('free', 'basic', 'pro', 'agency', name='subscriptiontier'), nullable=False),
    sa.Column('reminders_per_month', sa.Integer(), nullable=False),
    sa.Column('clients_limit', sa.Integer(), nullable=True),
    sa.Column('invoices_limit', sa.Integer(), nullable=True),
    sa.Column('templates_limit', sa.Integer(), nullable=True),
    sa.Column('analytics_retention_days', sa.Integer(), nullable=True),
    sa.Column('api_requests_per_hour', sa.Integer(), nullable=True),
    sa.Column('bulk_operations', sa.Boolean(), nullable=False, default=False),
    sa.Column('premium_templates', sa.Boolean(), nullable=False, default=False),
    sa.Column('white_label', sa.Boolean(), nullable=False, default=False),
    sa.Column('custom_branding', sa.Boolean(), nullable=False, default=False),
    sa.Column('priority_support', sa.Boolean(), nullable=False, default=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tier')
    )

    # Create subscriptions table
    op.create_table('subscriptions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_price_id', sa.String(length=255), nullable=True),
    sa.Column('tier', sa.Enum('free', 'basic', 'pro', 'agency', name='subscriptiontier'), nullable=False),
    sa.Column('status', sa.Enum('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'trialing', 'paused', name='subscriptionstatus'), nullable=False),
    sa.Column('current_period_start', sa.DateTime(), nullable=True),
    sa.Column('current_period_end', sa.DateTime(), nullable=True),
    sa.Column('trial_start', sa.DateTime(), nullable=True),
    sa.Column('trial_end', sa.DateTime(), nullable=True),
    sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, default=False),
    sa.Column('canceled_at', sa.DateTime(), nullable=True),
    sa.Column('ended_at', sa.DateTime(), nullable=True),
    sa.Column('paused', sa.Boolean(), nullable=False, default=False),
    sa.Column('pause_collection_method', sa.String(length=50), nullable=True),
    sa.Column('pause_resumes_at', sa.DateTime(), nullable=True),
    sa.Column('coupon_id', sa.String(length=255), nullable=True),
    sa.Column('discount_end', sa.DateTime(), nullable=True),
    sa.Column('reminders_sent_this_period', sa.Integer(), nullable=False, default=0),
    sa.Column('api_requests_this_hour', sa.Integer(), nullable=False, default=0),
    sa.Column('last_api_reset', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('stripe_customer_id'),
    sa.UniqueConstraint('stripe_subscription_id'),
    sa.UniqueConstraint('user_id')
    )

    # Create billing_events table
    op.create_table('billing_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('stripe_event_id', sa.String(length=255), nullable=False),
    sa.Column('event_type', sa.String(length=100), nullable=False),
    sa.Column('subscription_id', sa.Integer(), nullable=True),
    sa.Column('processed', sa.Boolean(), nullable=False, default=False),
    sa.Column('processed_at', sa.DateTime(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('raw_data', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('stripe_event_id')
    )


def downgrade():
    op.drop_table('billing_events')
    op.drop_table('subscriptions')
    op.drop_table('usage_limits')