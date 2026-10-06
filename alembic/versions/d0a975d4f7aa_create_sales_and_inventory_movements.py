"""create sales and inventory movements

Revision ID: d0a975d4f7aa
Revises: abfe3b007fb4
Create Date: 2026-09-25 16:31:08.301784

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd0a975d4f7aa'
down_revision: Union[str, Sequence[str], None] = 'abfe3b007fb4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'sales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(24, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('total_amount >= 0', name='ck_sales_total_amount_nonnegative'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sales_created_by_id', 'sales', ['created_by_id'])

    op.create_table(
        'sale_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sale_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(24, 2), nullable=False),
        sa.CheckConstraint('quantity > 0', name='ck_sale_items_quantity_positive'),
        sa.CheckConstraint('unit_price >= 0', name='ck_sale_items_unit_price_nonnegative'),
        sa.CheckConstraint('subtotal >= 0', name='ck_sale_items_subtotal_nonnegative'),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sale_id', 'product_id', name='uq_sale_items_sale_product'),
    )
    op.create_index('ix_sale_items_product_id', 'sale_items', ['product_id'])

    op.create_table(
        'inventory_movements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column(
            'movement_type',
            sa.Enum('SALE', 'RESTOCK', 'ADJUSTMENT', name='inventory_movement_type'),
            nullable=False,
        ),
        sa.Column('quantity_change', sa.Integer(), nullable=False),
        sa.Column('sale_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('quantity_change <> 0', name='ck_inventory_movements_quantity_nonzero'),
        sa.CheckConstraint(
            "movement_type <> 'SALE' OR (quantity_change < 0 AND sale_id IS NOT NULL)",
            name='ck_inventory_movements_sale_reference_and_quantity',
        ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_inventory_movements_product_id', 'inventory_movements', ['product_id'])
    op.create_index('ix_inventory_movements_movement_type', 'inventory_movements', ['movement_type'])
    op.create_index('ix_inventory_movements_sale_id', 'inventory_movements', ['sale_id'])
    op.create_index('ix_inventory_movements_created_by_id', 'inventory_movements', ['created_by_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_inventory_movements_created_by_id', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_sale_id', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_movement_type', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_product_id', table_name='inventory_movements')
    op.drop_table('inventory_movements')
    sa.Enum(name='inventory_movement_type').drop(op.get_bind(), checkfirst=True)
    op.drop_index('ix_sale_items_product_id', table_name='sale_items')
    op.drop_table('sale_items')
    op.drop_index('ix_sales_created_by_id', table_name='sales')
    op.drop_table('sales')
