"""add intervalo to planopag

Adiciona a coluna 'intervalo' na tabela planopag para permitir
configurar o intervalo em dias entre parcelas (padrão 30 dias).
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260608_add_intervalo_to_planopag'
down_revision = '20260606_change_fatura_servico_id_servico_to_integer'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna intervalo com valor padrão 30 dias
    op.add_column('planopag', sa.Column('intervalo', sa.Integer(), nullable=True, server_default='30'))
    # Se a coluna já existir com valor NULL, atualiza para 30
    op.execute(
        """
        UPDATE planopag SET intervalo = 30 WHERE intervalo IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column('planopag', 'intervalo')
