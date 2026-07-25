from typing import Any, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.inventory.models import InventoryTransaction
from app.modules.products.models import Product


class InventoryCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def lock_product(self, product_id: int) -> Optional[Product]:
        stmt = (
            select(Product)
            .where(Product.id == product_id, Product.deleted_at.is_(None))
            .with_for_update()
        )
        return (await self.db.execute(stmt)).scalars().first()

    def build_transaction(self, **kwargs: Any) -> InventoryTransaction:
        tx = InventoryTransaction(**kwargs)
        self.db.add(tx)
        return tx

    async def commit_and_refresh(self, *entities: Any) -> None:
        await self.db.commit()
        for entity in entities:
            await self.db.refresh(entity)

    async def get_product_name_barcode(
        self, product_id: int
    ) -> Tuple[Optional[str], Optional[str]]:
        stmt = select(Product.name, Product.barcode).where(Product.id == product_id)
        row = (await self.db.execute(stmt)).first()
        return (row.name, row.barcode) if row else (None, None)

    async def count_and_list(
        self, conditions: list, page: int, limit: int
    ) -> Tuple[List[Tuple[InventoryTransaction, str, str]], int]:
        count_stmt = (
            select(func.count(InventoryTransaction.id))
            .join(Product, InventoryTransaction.product_id == Product.id)
            .where(*conditions)
        )
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(InventoryTransaction, Product.name, Product.barcode)
            .join(Product, InventoryTransaction.product_id == Product.id)
            .where(*conditions)
            .order_by(InventoryTransaction.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        return [(r[0], r[1], r[2]) for r in rows], total_items
