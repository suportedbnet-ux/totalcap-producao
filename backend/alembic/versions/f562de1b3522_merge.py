"""merge

Revision ID: f562de1b3522
Revises: 20260604_safe_rename_mobos_to_coleta, 20260608_add_intervalo_to_planopag
Create Date: 2026-06-17 10:16:43.339724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f562de1b3522'
down_revision: Union[str, Sequence[str], None] = ('20260604_safe_rename_mobos_to_coleta', '20260608_add_intervalo_to_planopag')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
