"""Add referral system

Revision ID: 0011_referral_system
Revises: 0010_subscription_billing_models
Create Date: 2025-09-14 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0011_referral_system'
down_revision: Union[str, None] = '0010_subscription_billing_models'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add referral_code to users table
    op.add_column('users', sa.Column('referral_code', sa.String(length=16), nullable=True))
    op.create_index(op.f('ix_users_referral_code'), 'users', ['referral_code'], unique=True)

    # Create referrals table
    op.create_table('referrals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('referrer_user_id', sa.Integer(), nullable=False),
        sa.Column('referred_user_id', sa.Integer(), nullable=False),
        sa.Column('referral_code_used', sa.String(length=16), nullable=False),
        sa.Column('reward_granted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('reward_months', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('rewarded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['referrer_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['referred_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('referred_user_id', name='_one_referral_per_user')
    )
    op.create_index(op.f('ix_referrals_referrer_user_id'), 'referrals', ['referrer_user_id'], unique=False)
    op.create_index(op.f('ix_referrals_referred_user_id'), 'referrals', ['referred_user_id'], unique=False)
    op.create_index(op.f('ix_referrals_referral_code_used'), 'referrals', ['referral_code_used'], unique=False)

    # Create subscription_credits table
    op.create_table('subscription_credits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('credit_months', sa.Integer(), nullable=False),
        sa.Column('remaining_months', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=32), nullable=False),
        sa.Column('source_id', sa.String(length=64), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscription_credits_user_id'), 'subscription_credits', ['user_id'], unique=False)
    op.create_index(op.f('ix_subscription_credits_source'), 'subscription_credits', ['source'], unique=False)
    op.create_index(op.f('ix_subscription_credits_expires_at'), 'subscription_credits', ['expires_at'], unique=False)


def downgrade() -> None:
    # Drop tables and indexes in reverse order
    op.drop_index(op.f('ix_subscription_credits_expires_at'), table_name='subscription_credits')
    op.drop_index(op.f('ix_subscription_credits_source'), table_name='subscription_credits')
    op.drop_index(op.f('ix_subscription_credits_user_id'), table_name='subscription_credits')
    op.drop_table('subscription_credits')

    op.drop_index(op.f('ix_referrals_referral_code_used'), table_name='referrals')
    op.drop_index(op.f('ix_referrals_referred_user_id'), table_name='referrals')
    op.drop_index(op.f('ix_referrals_referrer_user_id'), table_name='referrals')
    op.drop_table('referrals')

    op.drop_index(op.f('ix_users_referral_code'), table_name='users')
    op.drop_column('users', 'referral_code')