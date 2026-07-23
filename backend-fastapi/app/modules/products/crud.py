from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update

from app.modules.products.models import Product
from app.modules.products.schemas import CreateProductDto, UpdateProductDto

class ProductCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, product_id: int) -> Optional[Product]:
        stmt = select(Product).where(Product.id == product_id, Product.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_barcode(self, barcode: str) -> Optional[Product]:
        stmt = select(Product).where(Product.barcode == barcode, Product.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_multi(self, page: int = 1, limit: int = 10) -> Tuple[List[Product], int]:
        offset = (page - 1) * limit
        count_stmt = select(func.count(Product.id)).where(Product.deleted_at.is_(None))
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Product)
            .where(Product.deleted_at.is_(None))
            .order_by(Product.id.desc())
            .offset(offset)
            .limit(limit)
        )
        products = (await self.db.execute(stmt)).scalars().all()
        return list(products), total_items

    async def create(self, dto: CreateProductDto) -> Product:
        product = Product(**dto.model_dump())
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def update(self, product: Product, dto: UpdateProductDto) -> Product:
        update_data = dto.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def soft_delete(self, product: Product) -> None:
        product.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()

    # Query trực tiếp từ DB không dùng Cache theo Rule 365 (Bắt buộc cho cảnh báo tồn kho thấp)
    async def get_low_stock_direct_db(self, threshold: int = 10) -> List[Product]:
        stmt = select(Product).where(
            Product.deleted_at.is_(None),
            Product.stock_quantity <= threshold
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())
