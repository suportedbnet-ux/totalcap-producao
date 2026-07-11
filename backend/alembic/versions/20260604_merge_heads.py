"""Merge heads: 20260604_add_diafat_to_contato and 79ffb3146ceb"""
from alembic import op

revision = '20260604_merge_heads'
down_revision = ('20260604_add_diafat_to_contato', '79ffb3146ceb')
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge migration; no schema changes are required.
    pass


def downgrade():
    # Downgrade path for a merge migration is typically not performed in one step.
    pass
