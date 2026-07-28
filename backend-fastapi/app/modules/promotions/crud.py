from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.promotions.models import Promotion


class PromotionCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, promotion_id: int) -> Optional[Promotion]:
        stmt = select(Promotion).where(
            Promotion.id == promotion_id, Promotion.deleted_at.is_(None)
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def get_by_code(
        self, code: str, exclude_id: Optional[int] = None
    ) -> Optional[Promotion]:
        stmt = select(Promotion).where(
            Promotion.code == code, Promotion.deleted_at.is_(None)
        )
        if exclude_id is not None:
            stmt = stmt.where(Promotion.id != exclude_id)
        return (await self.db.execute(stmt)).scalars().first()

    async def get_multi(
        self, page: int, limit: int, is_active: Optional[bool]
    ) -> Tuple[List[Promotion], int]:
        conditions: List[Any] = [Promotion.deleted_at.is_(None)]
        if is_active is not None:
            conditions.append(Promotion.is_active == is_active)

        count_stmt = select(func.count(Promotion.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Promotion)
            .where(*conditions)
            .order_by(Promotion.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items

    async def create(self, **kwargs) -> Promotion:
        promotion = Promotion(**kwargs)
        self.db.add(promotion)
        await self.db.commit()
        await self.db.refresh(promotion)
        return promotion

    async def save(self, promotion: Promotion) -> Promotion:
        await self.db.commit()
        await self.db.refresh(promotion)
        return promotion

    async def soft_delete(self, promotion: Promotion) -> None:
        promotion.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
