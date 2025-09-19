"""
AC alignment: enums, ON DELETE, constraints, triggers, meta, indexes

Revision ID: 0003_ac_alignment
Revises: 0002_roles_templates_events
Create Date: 2025-09-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0003_ac_alignment'
down_revision = '0002_roles_templates_events'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1) users.role: enum -> owner|member|admin
    # Create new enum type and swap
    op.execute("CREATE TYPE userrole_new AS ENUM ('owner','member','admin')")
    # Drop default to allow type change
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    # Map existing values: 'admin' -> 'admin', others -> 'owner'
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role TYPE userrole_new USING (
          CASE role
            WHEN 'admin' THEN 'admin'::userrole_new
            ELSE 'owner'::userrole_new
          END
        )
        """
    )
    # Drop old type and rename new to old name
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("ALTER TYPE userrole_new RENAME TO userrole")

    # Ensure default
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'owner'")

    # 2) invoices.source: string -> enum invoicesource(manual|stripe|paypal|xero)
    op.execute("CREATE TYPE invoicesource AS ENUM ('manual','stripe','paypal','xero')")
    # Drop default to allow type change
    op.execute("ALTER TABLE invoices ALTER COLUMN source DROP DEFAULT")
    op.execute(
        """
        ALTER TABLE invoices
        ALTER COLUMN source TYPE invoicesource USING (
          CASE lower(source)
            WHEN 'stripe' THEN 'stripe'::invoicesource
            WHEN 'paypal' THEN 'paypal'::invoicesource
            WHEN 'xero' THEN 'xero'::invoicesource
            ELSE 'manual'::invoicesource
          END
        )
        """
    )
    op.execute("ALTER TABLE invoices ALTER COLUMN source SET DEFAULT 'manual'")

    # 3) reminders.meta JSONB nullable
    if not any(c.get('name') == 'meta' for c in insp.get_columns('reminders')):
        op.add_column('reminders', sa.Column('meta', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # 4) currency length check
    try:
        op.create_check_constraint('ck_invoices_currency_len', 'invoices', 'char_length(currency) = 3')
    except Exception:
        pass

    # 5) Conditional due_date and paid_at trigger
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION enforce_invoice_constraints() RETURNS trigger AS $$
            DECLARE
                eff_created date := COALESCE(CAST(NEW.created_at AS date), CURRENT_DATE);
            BEGIN
                IF NEW.status IN ('draft','pending') AND NEW.due_date < eff_created THEN
                    RAISE EXCEPTION 'due_date must be on/after created_at for draft/pending invoices';
                END IF;
                IF NEW.status = 'paid' AND NEW.paid_at IS NULL THEN
                    NEW.paid_at := now();
                ELSIF NEW.status <> 'paid' AND NEW.paid_at IS NOT NULL THEN
                    NEW.paid_at := NULL;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )
    )
    op.execute(sa.text("DROP TRIGGER IF EXISTS enforce_invoice_constraints_trg ON invoices"))
    op.execute(sa.text("CREATE TRIGGER enforce_invoice_constraints_trg BEFORE INSERT OR UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION enforce_invoice_constraints()"))

    # 6) ON DELETE rules: drop and recreate FKs
    # helpers
    def drop_fk(table: str, fkname: str):
        op.execute(sa.text(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {fkname}"))

    def add_fk(table: str, fkname: str, column: str, target: str, ondelete: str):
        op.execute(sa.text(f"ALTER TABLE {table} ADD CONSTRAINT {fkname} FOREIGN KEY ({column}) REFERENCES {target} ON DELETE {ondelete}"))

    drop_fk('clients', 'clients_user_id_fkey')
    add_fk('clients', 'clients_user_id_fkey', 'user_id', 'users(id)', 'CASCADE')

    drop_fk('invoices', 'invoices_user_id_fkey')
    add_fk('invoices', 'invoices_user_id_fkey', 'user_id', 'users(id)', 'CASCADE')

    drop_fk('invoices', 'invoices_client_id_fkey')
    add_fk('invoices', 'invoices_client_id_fkey', 'client_id', 'clients(id)', 'CASCADE')

    drop_fk('reminders', 'reminders_invoice_id_fkey')
    add_fk('reminders', 'reminders_invoice_id_fkey', 'invoice_id', 'invoices(id)', 'CASCADE')

    drop_fk('reminders', 'reminders_template_id_fkey')
    add_fk('reminders', 'reminders_template_id_fkey', 'template_id', 'templates(id)', 'SET NULL')

    drop_fk('templates', 'templates_user_id_fkey')
    add_fk('templates', 'templates_user_id_fkey', 'user_id', 'users(id)', 'CASCADE')

    drop_fk('events', 'events_user_id_fkey')
    add_fk('events', 'events_user_id_fkey', 'user_id', 'users(id)', 'CASCADE')

    # 7) Composite indexes
    try:
        op.create_index('ix_invoices_user_status', 'invoices', ['user_id','status'], unique=False)
    except Exception:
        pass
    try:
        op.create_index('ix_reminders_invoice_status', 'reminders', ['invoice_id','status'], unique=False)
    except Exception:
        pass


def downgrade() -> None:
    # 7) Drop composite indexes
    op.drop_index('ix_reminders_invoice_status', table_name='reminders')
    op.drop_index('ix_invoices_user_status', table_name='invoices')

    # 6) Revert FKs by dropping ON DELETE rules (add basic FKs)
    def drop_fk(table: str, fkname: str):
        op.execute(sa.text(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {fkname}"))
    def add_fk(table: str, fkname: str, column: str, target: str):
        op.execute(sa.text(f"ALTER TABLE {table} ADD CONSTRAINT {fkname} FOREIGN KEY ({column}) REFERENCES {target}"))
    drop_fk('events', 'events_user_id_fkey'); add_fk('events','events_user_id_fkey','user_id','users(id)')
    drop_fk('templates', 'templates_user_id_fkey'); add_fk('templates','templates_user_id_fkey','user_id','users(id)')
    drop_fk('reminders', 'reminders_template_id_fkey'); add_fk('reminders','reminders_template_id_fkey','template_id','templates(id)')
    drop_fk('reminders', 'reminders_invoice_id_fkey'); add_fk('reminders','reminders_invoice_id_fkey','invoice_id','invoices(id)')
    drop_fk('invoices', 'invoices_client_id_fkey'); add_fk('invoices','invoices_client_id_fkey','client_id','clients(id)')
    drop_fk('invoices', 'invoices_user_id_fkey'); add_fk('invoices','invoices_user_id_fkey','user_id','users(id)')
    drop_fk('clients', 'clients_user_id_fkey'); add_fk('clients','clients_user_id_fkey','user_id','users(id)')

    # 5) Drop invoice triggers
    op.execute(sa.text("DROP TRIGGER IF EXISTS enforce_invoice_constraints_trg ON invoices"))
    op.execute(sa.text("DROP FUNCTION IF EXISTS enforce_invoice_constraints"))

    # 4) Drop currencylen check
    try:
        op.drop_constraint('ck_invoices_currency_len', 'invoices', type_='check')
    except Exception:
        pass

    # 3) Remove reminders.meta
    try:
        op.drop_column('reminders', 'meta')
    except Exception:
        pass

    # 2) invoices.source back to text
    op.execute("ALTER TABLE invoices ALTER COLUMN source TYPE varchar(32) USING source::text")
    op.execute("DROP TYPE IF EXISTS invoicesource")

    # 1) users.role: back to 'user'|'admin'
    op.execute("CREATE TYPE userrole_old AS ENUM ('user','admin')")
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role TYPE userrole_old USING (
          CASE role
            WHEN 'admin' THEN 'admin'::userrole_old
            ELSE 'user'::userrole_old
          END
        )
        """
    )
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("ALTER TYPE userrole_old RENAME TO userrole")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'")
