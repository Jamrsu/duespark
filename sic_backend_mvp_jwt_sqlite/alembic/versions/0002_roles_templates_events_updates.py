"""
Add roles, templates, events, updated_at, constraints and triggers

Revision ID: 0002_roles_templates_events
Revises: 0001_initial
Create Date: 2025-09-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0002_roles_templates_events'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    def col_exists(table: str, col: str) -> bool:
        try:
            return any(c.get('name') == col for c in insp.get_columns(table))
        except Exception:
            return False
    # Enums
    userrole = sa.Enum('user','admin', name='userrole')
    userrole.create(op.get_bind(), checkfirst=True)
    # templatetone will be created implicitly by the templates table column

    # users: role, updated_at
    if not col_exists('users', 'role'):
        op.add_column('users', sa.Column('role', sa.Enum('user','admin', name='userrole', create_type=False), server_default='user', nullable=False))
    if not col_exists('users', 'updated_at'):
        op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))

    # clients: updated_at
    if not col_exists('clients', 'updated_at'):
        op.add_column('clients', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))

    # invoices: updated_at; constraints & indexes
    if not col_exists('invoices', 'updated_at'):
        op.add_column('invoices', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    # Check amount > 0
    try:
        op.create_check_constraint('ck_invoices_amount_positive', 'invoices', 'amount_cents > 0')
    except Exception:
        pass
    # Check due_date in future or today
    try:
        op.create_check_constraint('ck_invoices_due_date_future', 'invoices', 'due_date >= CURRENT_DATE')
    except Exception:
        pass
    # Index on due_date (if not exists)
    try:
        op.create_index('ix_invoices_due_date', 'invoices', ['due_date'], unique=False)
    except Exception:
        pass

    # templates
    if not insp.has_table('templates'):
        op.create_table(
            'templates',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('tone', sa.Enum('friendly','neutral','firm', name='templatetone'), nullable=False),
            sa.Column('subject', sa.String(length=255), nullable=False),
            sa.Column('body_markdown', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )

    # reminders: template_id, updated_at, status index
    if not col_exists('reminders', 'template_id'):
        op.add_column('reminders', sa.Column('template_id', sa.Integer(), sa.ForeignKey('templates.id'), nullable=True))
    try:
        op.create_index('ix_reminders_template_id', 'reminders', ['template_id'], unique=False)
    except Exception:
        pass
    if not col_exists('reminders', 'updated_at'):
        op.add_column('reminders', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    try:
        op.create_index('ix_reminders_status', 'reminders', ['status'], unique=False)
    except Exception:
        pass

    # events
    if not insp.has_table('events'):
        op.create_table(
            'events',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('entity_type', sa.String(length=32), nullable=False),
            sa.Column('entity_id', sa.Integer(), nullable=False),
            sa.Column('event_type', sa.String(length=32), nullable=False),
            sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
    try:
        op.create_index('ix_events_user_entity', 'events', ['user_id','entity_type','entity_id'], unique=False)
    except Exception:
        pass

    # updated_at trigger function
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )
    )

    # Attach triggers to tables
    for table in ['users','clients','invoices','reminders','templates','events']:
        op.execute(sa.text(
            f"DROP TRIGGER IF EXISTS set_updated_at_{table} ON {table};"
        ))
        op.execute(sa.text(
            f"CREATE TRIGGER set_updated_at_{table} BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION set_updated_at();"
        ))


def downgrade() -> None:
    # Drop triggers
    for table in ['users','clients','invoices','reminders','templates','events']:
        op.execute(sa.text(
            f"DROP TRIGGER IF EXISTS set_updated_at_{table} ON {table};"
        ))
    op.execute(sa.text("DROP FUNCTION IF EXISTS set_updated_at();"))

    # Drop events
    op.drop_index('ix_events_user_entity', table_name='events')
    op.drop_index('ix_events_user_id', table_name='events')
    op.drop_table('events')

    # Drop reminders additions
    op.drop_index('ix_reminders_status', table_name='reminders')
    op.drop_column('reminders', 'updated_at')
    op.drop_index('ix_reminders_template_id', table_name='reminders')
    op.drop_column('reminders', 'template_id')

    # Drop templates
    op.drop_index('ix_templates_user_id', table_name='templates')
    op.drop_table('templates')
    op.execute("DROP TYPE IF EXISTS templatetone")

    # Invoices constraints/indexes
    op.drop_index('ix_invoices_due_date', table_name='invoices')
    op.drop_constraint('ck_invoices_due_date_future', 'invoices', type_='check')
    op.drop_constraint('ck_invoices_amount_positive', 'invoices', type_='check')
    op.drop_column('invoices', 'updated_at')

    # Clients
    op.drop_column('clients', 'updated_at')

    # Users
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'role')
    op.execute("DROP TYPE IF EXISTS userrole")
