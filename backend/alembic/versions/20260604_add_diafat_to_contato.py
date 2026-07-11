"""Add diafat column to contato table
This migration guards against already-existing column to be resilient in case migrations were partially applied."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '20260604_add_diafat_to_contato'
down_revision = '20260603_rename_mobos_to_coleta'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    exists = conn.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='contato' AND column_name='diafat'")).fetchone()
    if exists is None:
        op.add_column('contato', sa.Column('diafat', sa.Integer(), nullable=True))


def downgrade():
    conn = op.get_bind()
    exists = conn.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='contato' AND column_name='diafat'")).fetchone()
    if exists is not None:
        op.drop_column('contato', 'diafat')
