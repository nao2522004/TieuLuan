from datetime import date
from typing import Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import Order, OrderItem
from app.modules.returns.models import Return


class ReportCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_orders_aggregate(
        self,
        branch_id: Optional[int],
        from_date: Optional[date],
        to_date_exclusive: Optional[date],
    ) -> Tuple[int, float]:
        stmt = select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0),
        ).where(Order.status == "completed")

        if branch_id:
            stmt = stmt.where(Order.branch_id == branch_id)
        if from_date:
            stmt = stmt.where(Order.created_at >= from_date)
        if to_date_exclusive:
            stmt = stmt.where(Order.created_at < to_date_exclusive)

        count, total = (await self.db.execute(stmt)).one()
        return int(count), float(total)

    async def get_returns_aggregate(
        self,
        branch_id: Optional[int],
        from_date: Optional[date],
        to_date_exclusive: Optional[date],
    ) -> float:
        stmt = (
            select(func.coalesce(func.sum(Return.refund_amount), 0))
            .select_from(Return)
            .join(OrderItem, OrderItem.id == Return.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.status == "completed")
        )

        if branch_id:
            stmt = stmt.where(Order.branch_id == branch_id)
        if from_date:
            stmt = stmt.where(Order.created_at >= from_date)
        if to_date_exclusive:
            stmt = stmt.where(Order.created_at < to_date_exclusive)

        total = (await self.db.execute(stmt)).scalar_one()
        return float(total)
