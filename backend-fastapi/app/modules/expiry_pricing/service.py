from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, TypedDict, Union

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException
from app.modules.expiry_pricing.crud import ExpiryPricingCRUD
from app.modules.expiry_pricing.models import ExpiryDiscountRule
from app.modules.expiry_pricing.schemas import (
    CreateExpiryDiscountRuleDto,
    UpdateExpiryDiscountRuleDto,
)


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
        self.crud = ExpiryPricingCRUD(db)

    async def compute_effective_price(
        self, sale_price: float, expiry_date: Optional[Union[str, date]]
    ) -> EffectivePriceResult:
        rules = await self.crud.get_active_rules()
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

    async def find_all(self) -> List[Dict[str, Any]]:
        rules = await self.crud.get_all()
        return [self._to_dto(r) for r in rules]

    async def create(self, dto: CreateExpiryDiscountRuleDto) -> Dict[str, Any]:
        scope = dto.scope or "expiry"
        rule = await self.crud.create(
            scope=scope,
            days_before_expiry=(
                None if scope == "all_products" else dto.days_before_expiry
            ),
            discount_percent=dto.discount_percent,
            is_active=dto.is_active if dto.is_active is not None else True,
        )
        return self._to_dto(rule)

    async def update(
        self, rule_id: int, dto: UpdateExpiryDiscountRuleDto
    ) -> Dict[str, Any]:
        rule = await self._find_active_or_throw(rule_id)
        update_data = dto.model_dump(exclude_unset=True)

        if "scope" in update_data:
            rule.scope = update_data["scope"]
        effective_scope = update_data.get("scope", rule.scope)

        if "days_before_expiry" in update_data:
            rule.days_before_expiry = (
                None
                if effective_scope == "all_products"
                else update_data["days_before_expiry"]
            )
        elif effective_scope == "all_products":
            rule.days_before_expiry = None

        if "discount_percent" in update_data:
            rule.discount_percent = update_data["discount_percent"]
        if "is_active" in update_data:
            rule.is_active = update_data["is_active"]

        saved = await self.crud.save(rule)
        return self._to_dto(saved)

    async def remove(self, rule_id: int) -> Dict[str, str]:
        rule = await self._find_active_or_throw(rule_id)
        await self.crud.soft_delete(rule)
        return {"message": "Xóa quy tắc giảm giá thành công."}

    async def _find_active_or_throw(self, rule_id: int) -> ExpiryDiscountRule:
        rule = await self.crud.get_by_id(rule_id)
        if not rule:
            raise BusinessException(
                "EXPIRY_RULE_NOT_FOUND",
                404,
                "Không tìm thấy quy tắc giảm giá.",
            )
        return rule

    def _to_dto(self, r: ExpiryDiscountRule) -> Dict[str, Any]:
        return {
            "id": r.id,
            "scope": r.scope,
            "days_before_expiry": r.days_before_expiry,
            "discount_percent": float(r.discount_percent),
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
        }
