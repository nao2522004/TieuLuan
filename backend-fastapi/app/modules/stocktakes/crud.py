from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.exceptions import BusinessException

from app.modules.stocktakes.models import Stocktake, StocktakeItem, StocktakeItemBatch


class StocktakeCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_open_by_branch(self, branch_id: int) -> Optional[Stocktake]:
        stmt = select(Stocktake).where(
            Stocktake.branch_id == branch_id, Stocktake.status == "open"
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def create(
        self, branch_id: int, created_by: int, note: Optional[str]
    ) -> Stocktake:
        st = Stocktake(
            branch_id=branch_id, created_by=created_by, status="open", note=note
        )
        self.db.add(st)
        await self.db.commit()
        await self.db.refresh(st)
        return st

    async def lock_by_id(self, stocktake_id: int) -> Optional[Stocktake]:
        stmt = select(Stocktake).where(Stocktake.id == stocktake_id).with_for_update()
        return (await self.db.execute(stmt)).scalars().first()

    async def get_by_id(self, stocktake_id: int) -> Optional[Stocktake]:
        stmt = select(Stocktake).where(Stocktake.id == stocktake_id)
        return (await self.db.execute(stmt)).scalars().first()

    async def upsert_item(
        self,
        stocktake_id: int,
        product_id: int,
        system_quantity: int,
        counted_quantity: int,
        difference: int,
    ) -> Dict[str, Any]:
        stmt = text(
            """
            INSERT INTO stocktake_items
            (stocktake_id, product_id, system_quantity, counted_quantity, difference)
            VALUES (:stocktake_id, :product_id, :system_quantity, :counted_quantity, :difference)
            ON CONFLICT (stocktake_id, product_id)
            DO UPDATE SET
            counted_quantity = EXCLUDED.counted_quantity,
            difference = EXCLUDED.counted_quantity - stocktake_items.system_quantity
            RETURNING id, stocktake_id, product_id, system_quantity, counted_quantity, difference
            """
        )
        result = await self.db.execute(
            stmt,
            {
                "stocktake_id": stocktake_id,
                "product_id": product_id,
                "system_quantity": system_quantity,
                "counted_quantity": counted_quantity,
                "difference": difference,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise BusinessException(
                "STOCKTAKE_ITEM_UPSERT_FAILED",
                500,
                "Không thể ghi nhận dòng đếm kiểm kê.",
            )
        return dict(row)

    async def get_items(self, stocktake_id: int) -> List[StocktakeItem]:
        stmt = (
            select(StocktakeItem)
            .where(StocktakeItem.stocktake_id == stocktake_id)
            .order_by(StocktakeItem.id.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_item_by_id(
        self, stocktake_id: int, item_id: int
    ) -> Optional[StocktakeItem]:
        stmt = select(StocktakeItem).where(
            StocktakeItem.id == item_id, StocktakeItem.stocktake_id == stocktake_id
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def delete_item(self, item: StocktakeItem) -> None:
        await self.db.delete(item)
        await self.db.commit()

    async def upsert_item_batches(
        self,
        stocktake_item_id: int,
        product_id: int,
        batch_counts: List[Dict[str, Any]],
    ) -> None:
        for bc in batch_counts:
            await self.db.execute(
                text(
                    """
                    INSERT INTO stocktake_item_batches
                        (stocktake_item_id, batch_id, system_quantity, counted_quantity, difference)
                    VALUES (:item_id, :batch_id, :sys_qty, :cnt_qty, :diff)
                    ON CONFLICT (stocktake_item_id, batch_id)
                    DO UPDATE SET
                        counted_quantity = EXCLUDED.counted_quantity,
                        difference = EXCLUDED.counted_quantity - stocktake_item_batches.system_quantity
                    """
                ),
                {
                    "item_id": stocktake_item_id,
                    "batch_id": bc["batch_id"],
                    "sys_qty": bc["system_quantity"],
                    "cnt_qty": bc["counted_quantity"],
                    "diff": bc["counted_quantity"] - bc["system_quantity"],
                },
            )

    async def get_item_batches(
        self, stocktake_item_id: int
    ) -> List[StocktakeItemBatch]:
        """Tải tất cả chi tiết lô của một dòng kiểm kê."""
        stmt = (
            select(StocktakeItemBatch)
            .where(StocktakeItemBatch.stocktake_item_id == stocktake_item_id)
            .order_by(StocktakeItemBatch.batch_id.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def count_and_list(
        self, conditions: list, page: int, limit: int
    ) -> Tuple[List[Stocktake], int]:
        count_stmt = select(func.count(Stocktake.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Stocktake)
            .where(*conditions)
            .order_by(Stocktake.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items
