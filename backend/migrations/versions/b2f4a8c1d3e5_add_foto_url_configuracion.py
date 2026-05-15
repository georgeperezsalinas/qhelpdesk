"""add foto_url to equipos and configuracion_app table

Revision ID: b2f4a8c1d3e5
Revises: 69e0650d631f
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2f4a8c1d3e5'
down_revision: Union[str, None] = '69e0650d631f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('equipos',
        sa.Column('foto_url', sa.String(length=500), nullable=True)
    )

    op.create_table('configuracion_app',
        sa.Column('id',             sa.Integer(),     nullable=False),
        sa.Column('clave',          sa.String(100),   nullable=False),
        sa.Column('valor',          sa.Text(),        nullable=True),
        sa.Column('actualizado_en', sa.DateTime(),    nullable=True,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clave'),
    )
    op.create_index(op.f('ix_configuracion_app_id'),    'configuracion_app', ['id'],    unique=False)
    op.create_index(op.f('ix_configuracion_app_clave'), 'configuracion_app', ['clave'], unique=True)

    # Insertar valores por defecto
    op.execute("""
        INSERT INTO configuracion_app (clave, valor) VALUES
        ('app_name',      'QHelpDesk'),
        ('logo_url',       NULL),
        ('color_primario', '#1d4ed8'),
        ('descripcion',   'Sistema de Mesa de Ayuda')
        ON CONFLICT (clave) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_column('equipos', 'foto_url')
    op.drop_index(op.f('ix_configuracion_app_clave'), table_name='configuracion_app')
    op.drop_index(op.f('ix_configuracion_app_id'),    table_name='configuracion_app')
    op.drop_table('configuracion_app')
