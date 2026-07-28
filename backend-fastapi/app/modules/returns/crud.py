from typing import Any, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.orders.models import Order, OrderItem
from app.modules.returns.models import Return


class ReturnCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def lock_order_item(self, order_item_id: int) -> Optional[OrderItem]:
        stmt = select(OrderItem).where(OrderItem.id == order_item_id).with_for_update()
        return (await self.db.execute(stmt)).scalars().first()

    async def get_order_item_by_id(self, order_item_id: int) -> Optional[OrderItem]:
        stmt = select(OrderItem).where(OrderItem.id == order_item_id)
        return (await self.db.execute(stmt)).scalars().first()

    async def get_order_by_id(self, order_id: int) -> Optional[Order]:
        stmt = select(Order).where(Order.id == order_id)
        return (await self.db.execute(stmt)).scalars().first()

    async def sum_returned_quantity(self, order_item_id: int) -> int:
        stmt = select(func.coalesce(func.sum(Return.quantity), 0)).where(
            Return.order_item_id == order_item_id
        )
        return int((await self.db.execute(stmt)).scalar_one())

    async def create(
        self,
        order_item_id: int,
        quantity: int,
        refund_amount: float,
        reason: Optional[str],
        created_by: int,
    ) -> Return:
        entity = Return(
            order_item_id=order_item_id,
            quantity=quantity,
            refund_amount=refund_amount,
            reason=reason,
            created_by=created_by,
        )
        self.db.add(entity)
        await self.db.flush()
        return entity

    async def get_by_id(self, return_id: int) -> Optional[Return]:
        stmt = select(Return).where(Return.id == return_id)
        return (await self.db.execute(stmt)).scalars().first()

    async def count_and_list(
        self, conditions: list, page: int, limit: int
    ) -> Tuple[List[Return], int]:
        base_join = (
            select(Return.id)
            .join(OrderItem, OrderItem.id == Return.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(*conditions)
        )
        count_stmt = select(func.count()).select_from(base_join.subquery())
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Return)
            .join(OrderItem, OrderItem.id == Return.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(*conditions)
            .order_by(Return.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items
