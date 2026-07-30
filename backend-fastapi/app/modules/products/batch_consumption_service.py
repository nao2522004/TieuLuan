from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.exceptions import BusinessException
from app.modules.products.models import Product, ProductBatch
from app.modules.orders.models import OrderItemBatch


class SimulatedBatch(TypedDict):
    expiry_date: Optional[date]
    quantity_taken: int


class ConsumedBatch(TypedDict):
    batch_id: int
    quantity_taken: int
    expiry_date: Optional[date]


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

    async def receive_batch(
        self,
        product_id: int,
        quantity: int,
        expiry_date: Optional[date],
        unit_cost: Decimal,
        created_by: Optional[int],
        batch_code: Optional[str] = None,
    ) -> ProductBatch:
        product = await self._lock_product_or_throw(product_id)

        code = batch_code.strip() if batch_code and batch_code.strip() else None

        batch = ProductBatch(
            product_id=product_id,
            batch_code=code or "TEMP",
            quantity_received=quantity,
            quantity_remaining=quantity,
            unit_cost=unit_cost,
            expiry_date=expiry_date,
            created_by=created_by,
        )
        self.db.add(batch)
        await self.db.flush()

        if not code:
            now = datetime.now(timezone.utc)
            batch.batch_code = f"LÔ-{now:%Y%m%d}-{batch.id}"
            await self.db.flush()

        product.stock_quantity += quantity
        await self._refresh_nearest_expiry(product)

        return batch

    async def consume_fefo(self, product_id: int, quantity: int) -> List[ConsumedBatch]:
        if quantity <= 0:
            return []

        product = await self._lock_product_or_throw(product_id)

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
            .with_for_update()
        )
        batches = (await self.db.execute(stmt)).scalars().all()

        total_remaining = sum(b.quantity_remaining for b in batches)
        if total_remaining < quantity:
            raise BusinessException(
                "INVENTORY_INSUFFICIENT",
                409,
                f'Sản phẩm "{product.name}" không đủ tồn kho '
                f"(còn {total_remaining}, cần {quantity}).",
            )

        to_consume = quantity
        consumed: List[ConsumedBatch] = []
        for batch in batches:
            if to_consume <= 0:
                break
            take = min(batch.quantity_remaining, to_consume)
            batch.quantity_remaining -= take
            to_consume -= take
            consumed.append(
                {
                    "batch_id": batch.id,
                    "quantity_taken": take,
                    "expiry_date": batch.expiry_date,
                }
            )

        await self.db.flush()

        product.stock_quantity -= quantity
        await self._refresh_nearest_expiry(product)

        return consumed

    async def consume_specific_batch(
        self, product_id: int, batch_id: int, quantity: int
    ) -> List[ConsumedBatch]:
        if quantity <= 0:
            return []

        product = await self._lock_product_or_throw(product_id)

        stmt = (
            select(ProductBatch)
            .where(
                ProductBatch.id == batch_id,
                ProductBatch.product_id == product_id,
                ProductBatch.deleted_at.is_(None),
            )
            .with_for_update()
        )
        batch = (await self.db.execute(stmt)).scalars().first()

        if not batch:
            raise BusinessException(
                "BATCH_NOT_FOUND",
                404,
                f"Không tìm thấy lô hàng ID {batch_id} của sản phẩm này.",
            )

        if batch.quantity_remaining < quantity:
            raise BusinessException(
                "INVENTORY_INSUFFICIENT",
                409,
                f'Lô hàng "{batch.batch_code}" chỉ còn tồn '
                f"{batch.quantity_remaining} (cần trừ {quantity}).",
            )

        batch.quantity_remaining -= quantity
        await self.db.flush()

        product.stock_quantity -= quantity
        await self._refresh_nearest_expiry(product)

        return [
            {
                "batch_id": batch.id,
                "quantity_taken": quantity,
                "expiry_date": batch.expiry_date,
            }
        ]

    async def _lock_product_or_throw(self, product_id: int) -> Product:
        stmt = (
            select(Product)
            .where(Product.id == product_id, Product.deleted_at.is_(None))
            .with_for_update()
        )
        product = (await self.db.execute(stmt)).scalars().first()
        if not product:
            raise BusinessException(
                "PRODUCT_NOT_FOUND", 404, f"Không tìm thấy sản phẩm ID {product_id}."
            )
        return product

    async def _earliest_batch(self, product_id: int) -> Optional[ProductBatch]:
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
        return (await self.db.execute(stmt)).scalars().first()

    async def _refresh_nearest_expiry(self, product: Product) -> None:
        earliest = await self._earliest_batch(product.id)
        product.nearest_expiry_date = earliest.expiry_date if earliest else None
        await self.db.flush()

    async def restore_exact_batches(self, order_item_id: int, product_id: int) -> None:
        stmt = (
            select(OrderItemBatch)
            .where(OrderItemBatch.order_item_id == order_item_id)
            .order_by(OrderItemBatch.batch_id.asc())
            .with_for_update()
        )
        item_batches = list((await self.db.execute(stmt)).scalars().all())
        if not item_batches:
            return

        product = await self._lock_product_or_throw(product_id)

        total_restored = 0
        for ib in item_batches:
            amount_to_restore = ib.quantity_taken - ib.restored_quantity
            if amount_to_restore <= 0:
                continue

            batch_stmt = (
                select(ProductBatch)
                .where(ProductBatch.id == ib.batch_id)
                .with_for_update()
            )
            batch = (await self.db.execute(batch_stmt)).scalars().first()
            if batch:
                batch.quantity_remaining += amount_to_restore
                total_restored += amount_to_restore

            ib.restored_quantity = ib.quantity_taken

        if total_restored > 0:
            product.stock_quantity += total_restored
            await self._refresh_nearest_expiry(product)

        await self.db.flush()

    async def restore_quantity_for_returned_item(
        self, order_item_id: int, product_id: int, quantity_to_restore: int
    ) -> None:
        if quantity_to_restore <= 0:
            return

        stmt = (
            select(Product)
            .where(Product.id == product_id, Product.deleted_at.is_(None))
            .with_for_update()
        )
        product = (await self.db.execute(stmt)).scalars().first()
        if not product:
            return

        item_batches_stmt = (
            select(OrderItemBatch)
            .where(OrderItemBatch.order_item_id == order_item_id)
            .order_by(OrderItemBatch.id.desc())
            .with_for_update()
        )
        item_batches = list((await self.db.execute(item_batches_stmt)).scalars().all())

        remaining_to_restore = quantity_to_restore

        for ib in item_batches:
            if remaining_to_restore <= 0:
                break

            available_in_this_batch = ib.quantity_taken - ib.restored_quantity
            if available_in_this_batch <= 0:
                continue

            restore_amount = min(available_in_this_batch, remaining_to_restore)

            batch_stmt = (
                select(ProductBatch)
                .where(ProductBatch.id == ib.batch_id)
                .with_for_update()
            )
            batch = (await self.db.execute(batch_stmt)).scalars().first()
            if batch:
                batch.quantity_remaining += restore_amount

            ib.restored_quantity += restore_amount
            remaining_to_restore -= restore_amount

        if remaining_to_restore > 0:
            fallback_stmt = (
                select(ProductBatch)
                .where(
                    ProductBatch.product_id == product_id,
                    ProductBatch.deleted_at.is_(None),
                )
                .order_by(
                    ProductBatch.expiry_date.asc().nulls_last(),
                    ProductBatch.id.desc(),
                )
                .with_for_update()
            )
            fallback_batch = (await self.db.execute(fallback_stmt)).scalars().first()
            if fallback_batch:
                fallback_batch.quantity_remaining += remaining_to_restore

        await self.db.flush()

        product.stock_quantity += quantity_to_restore
        await self._refresh_nearest_expiry(product)
