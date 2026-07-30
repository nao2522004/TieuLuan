from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_add_restored_quantity"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "order_item_batches",
        sa.Column(
            "restored_quantity",
            sa.Integer(),
            nullable=False,
            server_default="0",
            comment="Số lượng đã hoàn trả vào tồn kho (để tránh cộng thừa khi gọi lại)",
        ),
    )


def downgrade() -> None:
    op.drop_column("order_item_batches", "restored_quantity")
