from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_stocktake_item_batches"
down_revision: Union[str, None] = "0002_add_restored_quantity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stocktake_item_batches",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("stocktake_item_id", sa.BigInteger(), nullable=False),
        sa.Column("batch_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "system_quantity",
            sa.Integer(),
            nullable=False,
            comment="Tồn kho hệ thống của lô tại thời điểm đếm",
        ),
        sa.Column(
            "counted_quantity",
            sa.Integer(),
            nullable=False,
            comment="Số đếm thực tế của lô",
        ),
        sa.Column(
            "difference",
            sa.Integer(),
            nullable=False,
            comment="counted_quantity - system_quantity (âm = thiếu, dương = thừa)",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["stocktake_item_id"],
            ["stocktake_items.id"],
            ondelete="CASCADE",
            name="fk_stocktake_item_batches_item",
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["product_batches.id"],
            name="fk_stocktake_item_batches_batch",
        ),
        sa.UniqueConstraint(
            "stocktake_item_id",
            "batch_id",
            name="uq_stocktake_item_batches",
        ),
        sa.CheckConstraint(
            "system_quantity >= 0",
            name="chk_stocktake_item_batches_system_qty",
        ),
        sa.CheckConstraint(
            "counted_quantity >= 0",
            name="chk_stocktake_item_batches_counted_qty",
        ),
    )
    op.create_index(
        "idx_stocktake_item_batches_item",
        "stocktake_item_batches",
        ["stocktake_item_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_stocktake_item_batches_item",
        table_name="stocktake_item_batches",
    )
    op.drop_table("stocktake_item_batches")
