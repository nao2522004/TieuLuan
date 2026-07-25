from datetime import date
from typing import Dict, List, Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.products.models import ProductBatch


class SimulatedBatch(TypedDict):
    expiry_date: Optional[date]
    quantity_taken: int


class BatchConsumptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def simulate_fefo(
        self, product_id: int, quantity: int
    ) -> List[SimulatedBatch]:
        if quantity <= 0:
            return []

        stmt = (
            select(ProductBatch)
            .where(
                ProductBatch.product_id == product_id,
                ProductBatch.deleted_at.is_(None),
                ProductBatch.quantity_remaining > 0,
            )
            .order_by(
                ProductBatch.expiry_date.asc().nulls_last(), ProductBatch.id.asc()
            )
        )
        batches = (await self.db.execute(stmt)).scalars().all()

        remaining = quantity
        result: List[SimulatedBatch] = []
        for batch in batches:
            if remaining <= 0:
                break
            take = min(batch.quantity_remaining, remaining)
            result.append({"expiry_date": batch.expiry_date, "quantity_taken": take})
            remaining -= take

        if remaining > 0:
            result.append({"expiry_date": None, "quantity_taken": remaining})

        return result

    async def list_batches(self, product_id: int) -> List[ProductBatch]:
        stmt = (
            select(ProductBatch)
            .where(
                ProductBatch.product_id == product_id,
                ProductBatch.deleted_at.is_(None),
            )
            .order_by(
                ProductBatch.expiry_date.asc().nulls_last(), ProductBatch.id.asc()
            )
        )
        return list((await self.db.execute(stmt)).scalars().all())
