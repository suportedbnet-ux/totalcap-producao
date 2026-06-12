"""change fatura_servico.id_servico to integer

Historicamente a coluna `fatura_servico.id_servico` estava como String no model.
Agora passa a ser Integer para refletir corretamente o `servico.id`.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260606_change_fatura_servico_id_servico_to_integer'
down_revision = '20260604_merge_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Convert only if the column is currently a string-like type.
    # Using NULLIF avoids casting '' to integer.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name='fatura_servico'
                  AND column_name='id_servico'
                  AND data_type IN ('character varying', 'character', 'text')
            ) THEN
                ALTER TABLE fatura_servico
                    ALTER COLUMN id_servico TYPE integer
                    USING NULLIF(id_servico, '')::integer;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # Revert back to VARCHAR(3) if needed.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name='fatura_servico'
                  AND column_name='id_servico'
                  AND data_type = 'integer'
            ) THEN
                ALTER TABLE fatura_servico
                    ALTER COLUMN id_servico TYPE varchar(3)
                    USING id_servico::varchar(3);
            END IF;
        END $$;
        """
    )

