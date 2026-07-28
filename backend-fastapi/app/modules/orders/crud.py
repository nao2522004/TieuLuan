from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import Order, OrderItem, OrderItemBatch
from app.modules.products.models import ProductBatch
from app.modules.returns.models import Return


class OrderCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(
        self, order_id: int, include_deleted: bool = False
    ) -> Optional[Order]:
        conditions = [Order.id == order_id]
        if not include_deleted:
            conditions.append(Order.deleted_at.is_(None))
        stmt = select(Order).where(*conditions)
        return (await self.db.execute(stmt)).scalars().first()

    async def lock_by_id(self, order_id: int) -> Optional[Order]:
        stmt = select(Order).where(Order.id == order_id).with_for_update()
        return (await self.db.execute(stmt)).scalars().first()

    async def get_items(self, order_id: int) -> List[OrderItem]:
        stmt = (
            select(OrderItem)
            .where(OrderItem.order_id == order_id)
            .order_by(OrderItem.id.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_returned_quantities(self, item_ids: List[int]) -> Dict[int, int]:
        if not item_ids:
            return {}
        stmt = (
            select(Return.order_item_id, func.coalesce(func.sum(Return.quantity), 0))
            .where(Return.order_item_id.in_(item_ids))
            .group_by(Return.order_item_id)
        )
        rows = (await self.db.execute(stmt)).all()
        return {r[0]: int(r[1]) for r in rows}

    async def get_item_batches(
        self, item_ids: List[int]
    ) -> Dict[int, List[Dict[str, Any]]]:
        if not item_ids:
            return {}
        stmt = (
            select(
                OrderItemBatch.order_item_id,
                ProductBatch.id.label("batch_id"),
                ProductBatch.batch_code,
                ProductBatch.expiry_date,
                OrderItemBatch.quantity_taken,
            )
            .join(ProductBatch, ProductBatch.id == OrderItemBatch.batch_id)
            .where(OrderItemBatch.order_item_id.in_(item_ids))
        )
        rows = (await self.db.execute(stmt)).all()
        result: Dict[int, List[Dict[str, Any]]] = {}
        for row in rows:
            result.setdefault(row.order_item_id, []).append(
                {
                    "batch_id": row.batch_id,
                    "batch_code": row.batch_code,
                    "expiry_date": (
                        row.expiry_date.isoformat() if row.expiry_date else None
                    ),
                    "quantity_taken": row.quantity_taken,
                }
            )
        return result

    async def count_and_list(
        self, conditions: list, page: int, limit: int
    ) -> Tuple[List[Order], int]:
        count_stmt = select(func.count(Order.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Order)
            .where(*conditions)
            .order_by(Order.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items
