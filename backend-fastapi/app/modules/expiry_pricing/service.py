from datetime import date, datetime, timezone
from typing import List, Optional, TypedDict, Union

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.expiry_pricing.models import ExpiryDiscountRule


class EffectivePriceResult(TypedDict):
    effective_price: float
    discount_percent: float
    is_expiry_discount_applied: bool


def _to_date(value: Optional[Union[str, date]]) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


class ExpiryPricingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_active_rules(self) -> List[ExpiryDiscountRule]:
        stmt = (
            select(ExpiryDiscountRule)
            .where(
                ExpiryDiscountRule.is_active.is_(True),
                ExpiryDiscountRule.deleted_at.is_(None),
            )
            .order_by(ExpiryDiscountRule.id.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def compute_effective_price(
        self, sale_price: float, expiry_date: Optional[Union[str, date]]
    ) -> EffectivePriceResult:
        rules = await self._get_active_rules()
        matching: List[ExpiryDiscountRule] = [
            r for r in rules if r.scope == "all_products"
        ]

        parsed_expiry = _to_date(expiry_date)
        if parsed_expiry:
            today = datetime.now(timezone.utc).date()
            days_left = (parsed_expiry - today).days
            matching.extend(
                r
                for r in rules
                if r.scope == "expiry"
                and r.days_before_expiry is not None
                and days_left <= r.days_before_expiry
            )

        if not matching:
            return {
                "effective_price": float(sale_price),
                "discount_percent": 0.0,
                "is_expiry_discount_applied": False,
            }

        best_rule = max(matching, key=lambda r: float(r.discount_percent))
        percent = float(best_rule.discount_percent)
        effective_price = round(float(sale_price) * (1 - percent / 100))

        return {
            "effective_price": max(0.0, effective_price),
            "discount_percent": percent,
            "is_expiry_discount_applied": True,
        }
