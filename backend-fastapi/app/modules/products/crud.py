from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.products.models import Product, ProductBatch


class ProductCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, product_id: int) -> Optional[Product]:
        stmt = select(Product).where(
            Product.id == product_id, Product.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_barcode_global(self, barcode: str) -> Optional[Product]:
        stmt = select(Product).where(
            Product.barcode == barcode, Product.deleted_at.is_(None)
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def get_by_barcode_branch(
        self, branch_id: int, barcode: str, exclude_id: Optional[int] = None
    ) -> Optional[Product]:
        conditions = [
            Product.branch_id == branch_id,
            Product.barcode == barcode,
            Product.deleted_at.is_(None),
        ]
        if exclude_id is not None:
            conditions.append(Product.id != exclude_id)
        stmt = select(Product).where(*conditions)
        return (await self.db.execute(stmt)).scalars().first()

    async def get_by_barcode_exact(
        self, branch_id: int, barcode: str
    ) -> Optional[Product]:
        stmt = select(Product).where(
            Product.branch_id == branch_id,
            Product.barcode == barcode,
            Product.deleted_at.is_(None),
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def search_by_name_or_barcode(
        self, branch_id: int, search: str
    ) -> Optional[Product]:
        stmt = (
            select(Product)
            .where(
                Product.branch_id == branch_id,
                Product.deleted_at.is_(None),
                or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.barcode.ilike(f"%{search}%"),
                ),
            )
            .order_by(Product.id.asc())
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def get_multi(
        self,
        page: int,
        limit: int,
        search: Optional[str],
        branch_id: Optional[int],
        category_id: Optional[int],
    ) -> Tuple[List[Product], int]:
        offset = (page - 1) * limit
        conditions: list[Any] = [Product.deleted_at.is_(None)]
        if branch_id:
            conditions.append(Product.branch_id == branch_id)
        if category_id:
            conditions.append(Product.category_id == category_id)
        if search:
            conditions.append(
                or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.barcode.ilike(f"%{search}%"),
                )
            )

        count_stmt = select(func.count(Product.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Product)
            .where(*conditions)
            .order_by(Product.id.asc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items

    async def create(self, **kwargs) -> Product:
        product = Product(**kwargs)
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def soft_delete(self, product: Product) -> None:
        product.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()

    async def get_low_stock_all(self, branch_id: int) -> List[Product]:
        stmt = (
            select(Product)
            .where(
                Product.branch_id == branch_id,
                Product.deleted_at.is_(None),
                Product.stock_quantity <= Product.reorder_level,
            )
            .order_by(Product.stock_quantity.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_low_stock_paginated(
        self, branch_id: int, page: int, limit: int
    ) -> Tuple[List[Product], int]:
        offset = (page - 1) * limit
        conditions = [
            Product.branch_id == branch_id,
            Product.deleted_at.is_(None),
            Product.stock_quantity <= Product.reorder_level,
        ]
        count_stmt = select(func.count(Product.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Product)
            .where(*conditions)
            .order_by(Product.stock_quantity.asc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items

    async def get_expiring_soon_batches(
        self, branch_id: int, alert_days: int
    ) -> List[Dict[str, Any]]:
        threshold = datetime.now(timezone.utc).date() + timedelta(days=alert_days)
        stmt = (
            select(
                ProductBatch.id.label("batch_id"),
                ProductBatch.product_id,
                ProductBatch.batch_code,
                ProductBatch.expiry_date,
                ProductBatch.quantity_remaining,
                Product.name.label("product_name"),
                Product.barcode,
                Product.unit,
            )
            .join(Product, ProductBatch.product_id == Product.id)
            .where(
                Product.branch_id == branch_id,
                Product.deleted_at.is_(None),
                ProductBatch.deleted_at.is_(None),
                ProductBatch.quantity_remaining > 0,
                ProductBatch.expiry_date.isnot(None),
                ProductBatch.expiry_date <= threshold,
            )
            .order_by(ProductBatch.expiry_date.asc())
        )
        rows = (await self.db.execute(stmt)).all()
        return [self._batch_alert_row_to_dict(r) for r in rows]

    async def get_expiring_soon_paginated(
        self, branch_id: int, alert_days: int, page: int, limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        threshold = datetime.now(timezone.utc).date() + timedelta(days=alert_days)
        offset = (page - 1) * limit

        join_conditions = [
            Product.branch_id == branch_id,
            Product.deleted_at.is_(None),
            ProductBatch.deleted_at.is_(None),
            ProductBatch.quantity_remaining > 0,
            ProductBatch.expiry_date.isnot(None),
            ProductBatch.expiry_date <= threshold,
        ]

        count_stmt = (
            select(func.count(ProductBatch.id))
            .join(Product, ProductBatch.product_id == Product.id)
            .where(*join_conditions)
        )
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(
                ProductBatch.id.label("batch_id"),
                ProductBatch.product_id,
                ProductBatch.batch_code,
                ProductBatch.expiry_date,
                ProductBatch.quantity_remaining,
                Product.name.label("product_name"),
                Product.barcode,
                Product.unit,
                Product.sale_price,
            )
            .join(Product, ProductBatch.product_id == Product.id)
            .where(*join_conditions)
            .order_by(ProductBatch.expiry_date.asc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).all()
        data = [self._batch_alert_row_to_dict(r, with_sale_price=True) for r in rows]
        return data, total_items

    @staticmethod
    def _batch_alert_row_to_dict(row, with_sale_price: bool = False) -> Dict[str, Any]:
        result = {
            "batch_id": row.batch_id,
            "product_id": row.product_id,
            "batch_code": row.batch_code,
            "expiry_date": row.expiry_date.isoformat() if row.expiry_date else None,
            "quantity_remaining": row.quantity_remaining,
            "product_name": row.product_name,
            "barcode": row.barcode,
            "unit": row.unit,
        }
        if with_sale_price:
            sale_price = getattr(row, "sale_price", None)
            result["sale_price"] = float(sale_price) if sale_price is not None else None
        return result

    async def get_batch_by_id(self, batch_id: int) -> Optional[ProductBatch]:
        stmt = select(ProductBatch).where(
            ProductBatch.id == batch_id, ProductBatch.deleted_at.is_(None)
        )
        return (await self.db.execute(stmt)).scalars().first()
