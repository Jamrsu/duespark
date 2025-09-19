"""Phase 4: Enterprise multi-tenancy, AI intelligence, and advanced analytics

Revision ID: 0013
Revises: 0012
Create Date: 2024-09-14 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0013'
down_revision: Union[str, None] = '0012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create organizations table
    op.create_table('organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('tier', sa.Enum('starter', 'business', 'enterprise', 'white_label', name='organizationtier'), nullable=True),
        sa.Column('status', sa.Enum('active', 'suspended', 'trial', 'expired', name='organizationstatus'), nullable=True),
        sa.Column('custom_domain', sa.String(), nullable=True),
        sa.Column('white_label_config', sa.JSON(), nullable=True),
        sa.Column('security_config', sa.JSON(), nullable=True),
        sa.Column('billing_config', sa.JSON(), nullable=True),
        sa.Column('user_limit', sa.Integer(), nullable=True),
        sa.Column('client_limit', sa.Integer(), nullable=True),
        sa.Column('invoice_limit_per_month', sa.Integer(), nullable=True),
        sa.Column('api_calls_limit_per_month', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=False)
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    # Create departments table
    op.create_table('departments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('parent_department_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('budget_allocation', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('cost_center', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['parent_department_id'], ['departments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create teams table
    op.create_table('teams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('client_access_rules', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create projects table
    op.create_table('projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('team_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_payment_terms', sa.Integer(), nullable=True),
        sa.Column('default_currency', sa.String(3), nullable=True),
        sa.Column('project_rate', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.Enum('user_login', 'user_logout', 'data_access', 'data_modification', 'permission_change', 'export_data', 'import_data', 'system_configuration', 'security_event', name='auditeventtype'), nullable=True),
        sa.Column('resource_type', sa.String(), nullable=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_metadata', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('risk_score', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create team_members table
    op.create_table('team_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('role', sa.Enum('owner', 'admin', 'manager', 'accountant', 'collector', 'viewer', 'api_user', name='teamrole'), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('client_access_level', sa.Enum('none', 'read', 'write', 'admin', name='permissionlevel'), nullable=True),
        sa.Column('invoice_access_level', sa.Enum('none', 'read', 'write', 'admin', name='permissionlevel'), nullable=True),
        sa.Column('reporting_access_level', sa.Enum('none', 'read', 'write', 'admin', name='permissionlevel'), nullable=True),
        sa.Column('admin_access_level', sa.Enum('none', 'read', 'write', 'admin', name='permissionlevel'), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.Column('last_active_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create sso_configurations table
    op.create_table('sso_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('provider', sa.String(), nullable=True),
        sa.Column('provider_name', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('metadata_url', sa.String(), nullable=True),
        sa.Column('certificate', sa.Text(), nullable=True),
        sa.Column('auto_provision_users', sa.Boolean(), nullable=True),
        sa.Column('default_role', sa.Enum('owner', 'admin', 'manager', 'accountant', 'collector', 'viewer', 'api_user', name='teamrole'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create compliance_profiles table
    op.create_table('compliance_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('gdpr_enabled', sa.Boolean(), nullable=True),
        sa.Column('sox_enabled', sa.Boolean(), nullable=True),
        sa.Column('hipaa_enabled', sa.Boolean(), nullable=True),
        sa.Column('pci_enabled', sa.Boolean(), nullable=True),
        sa.Column('data_retention_days', sa.Integer(), nullable=True),
        sa.Column('auto_delete_enabled', sa.Boolean(), nullable=True),
        sa.Column('encryption_at_rest', sa.Boolean(), nullable=True),
        sa.Column('encryption_in_transit', sa.Boolean(), nullable=True),
        sa.Column('mfa_required', sa.Boolean(), nullable=True),
        sa.Column('password_policy', sa.JSON(), nullable=True),
        sa.Column('session_timeout_minutes', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create data_exports table
    op.create_table('data_exports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('export_type', sa.String(), nullable=True),
        sa.Column('format', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('filename', sa.String(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('download_url', sa.String(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('encryption_key', sa.String(), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create payments table
    op.create_table('payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=True),
        sa.Column('payment_date', sa.DateTime(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('external_id', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_invoice_id'), 'payments', ['invoice_id'], unique=False)

    # Add enterprise columns to users table
    op.add_column('users', sa.Column('organization_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('department_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)
    op.create_index(op.f('ix_users_department_id'), 'users', ['department_id'], unique=False)
    op.create_foreign_key(None, 'users', 'organizations', ['organization_id'], ['id'])
    op.create_foreign_key(None, 'users', 'departments', ['department_id'], ['id'])


def downgrade() -> None:
    # Remove foreign keys and indexes from users table
    op.drop_constraint(None, 'users', type_='foreignkey')  # organization_id FK
    op.drop_constraint(None, 'users', type_='foreignkey')  # department_id FK
    op.drop_index(op.f('ix_users_department_id'), table_name='users')
    op.drop_index(op.f('ix_users_organization_id'), table_name='users')
    op.drop_column('users', 'department_id')
    op.drop_column('users', 'organization_id')

    # Drop all Phase 4 tables
    op.drop_index(op.f('ix_payments_invoice_id'), table_name='payments')
    op.drop_table('payments')
    op.drop_table('data_exports')
    op.drop_table('compliance_profiles')
    op.drop_table('sso_configurations')
    op.drop_table('team_members')
    op.drop_table('audit_logs')
    op.drop_table('projects')
    op.drop_table('teams')
    op.drop_table('departments')
    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_name'), table_name='organizations')
    op.drop_table('organizations')