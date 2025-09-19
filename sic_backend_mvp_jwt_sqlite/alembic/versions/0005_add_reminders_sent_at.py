from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0005_add_reminders_sent_at'
down_revision = '0004_add_reminders_created_at'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('reminders') as batch_op:
        batch_op.add_column(sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('reminders') as batch_op:
        batch_op.drop_column('sent_at')
