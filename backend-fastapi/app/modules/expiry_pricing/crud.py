from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.expiry_pricing.models import ExpiryDiscountRule


class ExpiryPricingCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, rule_id: int) -> Optional[ExpiryDiscountRule]:
        stmt = select(ExpiryDiscountRule).where(
            ExpiryDiscountRule.id == rule_id,
            ExpiryDiscountRule.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_all(self) -> List[ExpiryDiscountRule]:
        stmt = (
            select(ExpiryDiscountRule)
            .where(ExpiryDiscountRule.deleted_at.is_(None))
            .order_by(ExpiryDiscountRule.id.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_active_rules(self) -> List[ExpiryDiscountRule]:
        stmt = (
            select(ExpiryDiscountRule)
            .where(
                ExpiryDiscountRule.is_active.is_(True),
                ExpiryDiscountRule.deleted_at.is_(None),
            )
            .order_by(ExpiryDiscountRule.id.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def create(self, **kwargs) -> ExpiryDiscountRule:
        rule = ExpiryDiscountRule(**kwargs)
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def save(self, rule: ExpiryDiscountRule) -> ExpiryDiscountRule:
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def soft_delete(self, rule: ExpiryDiscountRule) -> None:
        rule.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
