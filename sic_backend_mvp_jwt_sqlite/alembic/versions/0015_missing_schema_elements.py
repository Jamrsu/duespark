"""
Add missing schema elements for live deployment

Revision ID: 0015_missing_schema_elements
Revises: 0014_performance_indexes
Create Date: 2025-09-19
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0015_missing_schema_elements'
down_revision = '0014_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create missing enums
    op.execute("CREATE TYPE IF NOT EXISTS templatetone AS ENUM ('friendly', 'neutral', 'firm')")
    op.execute("CREATE TYPE IF NOT EXISTS userrole AS ENUM ('owner', 'member', 'admin')")
    op.execute("CREATE TYPE IF NOT EXISTS onboardingstatus AS ENUM ('not_started', 'account_created', 'email_verified', 'payment_configured', 'pending', 'completed')")
    op.execute("CREATE TYPE IF NOT EXISTS invoicesource AS ENUM ('manual', 'stripe', 'paypal', 'xero')")
    op.execute("CREATE TYPE IF NOT EXISTS subscriptiontier AS ENUM ('freemium', 'basic', 'professional', 'agency')")
    op.execute("CREATE TYPE IF NOT EXISTS subscriptionstatus AS ENUM ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused')")

    # Create templates table
    op.create_table(
        'templates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('tone', sa.Enum('friendly', 'neutral', 'firm', name='templatetone'), nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('body_markdown', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Add missing columns to existing tables

    # Add missing columns to users table
    try:
        op.add_column('users', sa.Column('role', sa.Enum('owner', 'member', 'admin', name='userrole'), server_default='owner', nullable=False))
    except:
        pass  # Column might already exist

    try:
        op.add_column('users', sa.Column('referral_code', sa.String(16), nullable=True, index=True))
    except:
        pass

    try:
        op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))
    except:
        pass

    try:
        op.add_column('users', sa.Column('email_verification_token', sa.String(255), nullable=True))
    except:
        pass

    try:
        op.add_column('users', sa.Column('onboarding_status', sa.Enum('not_started', 'account_created', 'email_verified', 'payment_configured', 'pending', 'completed', name='onboardingstatus'), server_default='not_started', nullable=False))
    except:
        pass

    try:
        op.add_column('users', sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))
    except:
        pass

    try:
        op.add_column('users', sa.Column('stripe_account_id', sa.String(255), nullable=True))
    except:
        pass

    try:
        op.add_column('users', sa.Column('payment_method', sa.String(50), nullable=True))
    except:
        pass

    try:
        op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    except:
        pass

    # Add missing columns to clients table
    try:
        op.add_column('clients', sa.Column('contact_name', sa.String(255), nullable=True))
    except:
        pass

    try:
        op.add_column('clients', sa.Column('contact_phone', sa.String(20), nullable=True))
    except:
        pass

    try:
        op.add_column('clients', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    except:
        pass

    # Add missing columns to invoices table
    try:
        op.add_column('invoices', sa.Column('payment_link_url', sa.String(512), nullable=True))
    except:
        pass

    try:
        op.add_column('invoices', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    except:
        pass

    # Add template_id to reminders table
    try:
        op.add_column('reminders', sa.Column('template_id', sa.Integer(), sa.ForeignKey('templates.id', ondelete='SET NULL'), nullable=True, index=True))
    except:
        pass

    try:
        op.add_column('reminders', sa.Column('meta', sa.JSON(), nullable=True))
    except:
        pass

    try:
        op.add_column('reminders', sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True))
    except:
        pass

    try:
        op.add_column('reminders', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()))
    except:
        pass

    try:
        op.add_column('reminders', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    except:
        pass

    # Add missing index to reminders.status
    try:
        op.create_index('ix_reminders_status', 'reminders', ['status'])
    except:
        pass

    # Create dead_letters table
    op.create_table(
        'dead_letters',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('kind', sa.String(64), nullable=True, index=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('error', sa.Text(), nullable=False),
        sa.Column('retries', sa.Integer(), default=0),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create outbox table
    op.create_table(
        'outbox',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('topic', sa.String(64), nullable=True, index=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(16), default='pending', index=True),
        sa.Column('attempts', sa.Integer(), default=0),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('payment_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('external_id', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create events table
    op.create_table(
        'events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('entity_type', sa.String(32), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(32), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create stripe_accounts table
    op.create_table(
        'stripe_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('stripe_account_id', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('access_token', sa.String(255), nullable=False),
        sa.Column('refresh_token', sa.String(255), nullable=True),
        sa.Column('scope', sa.String(64), nullable=True),
        sa.Column('livemode', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True, unique=True, index=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True, index=True),
        sa.Column('stripe_price_id', sa.String(255), nullable=True),
        sa.Column('tier', sa.Enum('freemium', 'basic', 'professional', 'agency', name='subscriptiontier'), default='freemium', nullable=False),
        sa.Column('status', sa.Enum('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused', name='subscriptionstatus'), default='active', nullable=False),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paused', sa.Boolean(), default=False, nullable=False),
        sa.Column('coupon_id', sa.String(255), nullable=True),
        sa.Column('first_payment_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reminders_sent_this_period', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Create usage_limits table
    op.create_table(
        'usage_limits',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tier', sa.Enum('freemium', 'basic', 'professional', 'agency', name='subscriptiontier'), nullable=False, unique=True),
        sa.Column('reminders_per_month', sa.Integer(), nullable=False),
        sa.Column('clients_limit', sa.Integer(), nullable=True),
        sa.Column('invoices_limit', sa.Integer(), nullable=True),
        sa.Column('templates_limit', sa.Integer(), nullable=True),
        sa.Column('analytics_retention_days', sa.Integer(), nullable=True),
        sa.Column('api_requests_per_hour', sa.Integer(), nullable=False, default=100),
        sa.Column('bulk_operations', sa.Boolean(), default=False, nullable=False),
        sa.Column('premium_templates', sa.Boolean(), default=False, nullable=False),
        sa.Column('white_label', sa.Boolean(), default=False, nullable=False),
        sa.Column('custom_branding', sa.Boolean(), default=False, nullable=False),
        sa.Column('priority_support', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create billing_events table
    op.create_table(
        'billing_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('event_type', sa.String(64), nullable=False),
        sa.Column('stripe_event_id', sa.String(255), nullable=True, unique=True, index=True),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('processed', sa.Boolean(), default=False, nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create referrals table
    op.create_table(
        'referrals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referrer_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('referred_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('referral_code_used', sa.String(16), nullable=False, index=True),
        sa.Column('reward_granted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('reward_months', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('rewarded_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Create subscription_credits table
    op.create_table(
        'subscription_credits',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('credit_months', sa.Integer(), nullable=False),
        sa.Column('remaining_months', sa.Integer(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False, default=0),
        sa.Column('currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('remaining_amount_cents', sa.Integer(), nullable=False, default=0),
        sa.Column('source', sa.String(32), nullable=False, index=True),
        sa.Column('source_id', sa.String(64), nullable=True),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    print("✅ Migration 0015: Added all missing schema elements for live deployment")


def downgrade() -> None:
    # Drop tables in reverse order of creation
    op.drop_table('subscription_credits')
    op.drop_table('referrals')
    op.drop_table('billing_events')
    op.drop_table('usage_limits')
    op.drop_table('subscriptions')
    op.drop_table('stripe_accounts')
    op.drop_table('events')
    op.drop_table('payments')
    op.drop_table('outbox')
    op.drop_table('dead_letters')
    op.drop_table('templates')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS subscriptionstatus')
    op.execute('DROP TYPE IF EXISTS subscriptiontier')
    op.execute('DROP TYPE IF EXISTS invoicesource')
    op.execute('DROP TYPE IF EXISTS onboardingstatus')
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS templatetone')