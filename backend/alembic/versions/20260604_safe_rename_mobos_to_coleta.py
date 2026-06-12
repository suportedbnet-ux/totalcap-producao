"""Safely rename mobos to coleta if table exists"""
from alembic import op
from sqlalchemy import inspect

revision = '20260604_safe_rename_mobos_to_coleta'
down_revision = '20260603_rename_mobos_to_coleta'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'mobos' in inspector.get_table_names():
        op.rename_table('mobos', 'coleta')


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'coleta' in inspector.get_table_names():
        op.rename_table('coleta', 'mobos')

