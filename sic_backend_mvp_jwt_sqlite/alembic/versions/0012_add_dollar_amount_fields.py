"""add_dollar_amount_fields_to_subscription_credits

Revision ID: 0011
Revises: 0010
Create Date: 2025-09-14

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0012'
down_revision = '0011_referral_system'
branch_labels = None
depends_on = None


def upgrade():
    """Add dollar amount fields to subscription_credits table."""
    # Add new columns for dollar-based credits
    op.add_column('subscription_credits', sa.Column('amount_cents', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('subscription_credits', sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'))
    op.add_column('subscription_credits', sa.Column('remaining_amount_cents', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    """Remove dollar amount fields from subscription_credits table."""
    op.drop_column('subscription_credits', 'remaining_amount_cents')
    op.drop_column('subscription_credits', 'currency')
    op.drop_column('subscription_credits', 'amount_cents')