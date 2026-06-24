"""
Migration: Rename mobos -> coleta and mobpneu -> coleta_pneu
This is a structural DB rename to reflect the new domain entities Coleta/ColetaPneu.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260603_rename_mobos_to_coleta'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Rename primary tables
    op.rename_table('mobos', 'coleta')
    op.rename_table('mobpneu', 'coleta_pneu')


def downgrade():
    # Revert renamed tables
    op.rename_table('coleta', 'mobos')
    op.rename_table('coleta_pneu', 'mobpneu')

