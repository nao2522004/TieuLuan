from typing import List, Optional, Tuple
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.modules.categories.models import Category
from app.modules.categories.schemas import CreateCategoryDto, UpdateCategoryDto


class CategoryCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, category_id: int) -> Optional[Category]:
        stmt = select(Category).where(
            Category.id == category_id, Category.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_name(
        self, name: str, exclude_id: Optional[int] = None
    ) -> Optional[Category]:
        stmt = select(Category).where(
            Category.name == name, Category.deleted_at.is_(None)
        )
        if exclude_id is not None:
            stmt = stmt.where(Category.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_multi(
        self, page: int, limit: int, search: Optional[str]
    ) -> Tuple[List[Category], int]:
        offset = (page - 1) * limit
        conditions = [Category.deleted_at.is_(None)]
        if search:
            conditions.append(Category.name.ilike(f"%{search}%"))

        count_stmt = select(func.count(Category.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Category)
            .where(*conditions)
            .order_by(Category.id.asc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items

    async def create(self, dto: CreateCategoryDto) -> Category:
        category = Category(
            name=dto.name,
            description=dto.description,
            is_active=dto.is_active if dto.is_active is not None else True,
        )
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def update(self, category: Category, dto: UpdateCategoryDto) -> Category:
        update_data = dto.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(category, key, value)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def soft_delete(self, category: Category) -> None:
        category.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
