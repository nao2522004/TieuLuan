from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException
from app.modules.promotions.crud import PromotionCRUD
from app.modules.promotions.models import Promotion
from app.modules.promotions.schemas import CreatePromotionDto, UpdatePromotionDto


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class PromotionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = PromotionCRUD(db)

    async def create(self, dto: CreatePromotionDto) -> Dict[str, Any]:
        clean_code = dto.code.strip().upper()
        await self._assert_code_not_taken(clean_code)

        # Validate type-specific constraints
        if dto.type == "percent" and dto.value > 100:
            raise BusinessException(
                "PROMOTION_INVALID_VALUE",
                400,
                "Khuyến mãi theo phần trăm thì giá trị phải từ 1 đến 100.",
            )

        if dto.ends_at and dto.starts_at and dto.ends_at <= dto.starts_at:
            raise BusinessException(
                "PROMOTION_INVALID_DATES",
                400,
                "Thời gian kết thúc phải sau thời gian bắt đầu.",
            )

        promotion = await self.crud.create(
            code=clean_code,
            name=dto.name,
            type=dto.type,
            value=dto.value,
            min_order_amount=dto.min_order_amount,
            max_discount_amount=dto.max_discount_amount,
            is_active=dto.is_active if dto.is_active is not None else True,
            starts_at=(
                dto.starts_at
                if dto.starts_at is not None
                else datetime.now(timezone.utc)
            ),
            ends_at=dto.ends_at,
        )
        return self._to_dto(promotion)

    async def find_all_paginated(
        self, page: int, limit: int, is_active: Optional[bool]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        rows, total_items = await self.crud.get_multi(page, limit, is_active)
        total_pages = ((total_items + limit - 1) // limit) if limit > 0 else 0

        data = [self._to_dto(r) for r in rows]
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return data, meta

    async def find_one_or_throw(self, promotion_id: int) -> Dict[str, Any]:
        promotion = await self._find_active_or_throw(promotion_id)
        return self._to_dto(promotion)

    async def update(
        self, promotion_id: int, dto: UpdatePromotionDto
    ) -> Dict[str, Any]:
        promotion = await self._find_active_or_throw(promotion_id)

        if dto.code is not None:
            clean_code = dto.code.strip().upper()
            if clean_code != promotion.code:
                await self._assert_code_not_taken(clean_code, exclude_id=promotion_id)
                promotion.code = clean_code

        if dto.name is not None:
            promotion.name = dto.name
        if dto.type is not None:
            promotion.type = dto.type
        if dto.value is not None:
            promotion.value = dto.value
        if dto.min_order_amount is not None:
            promotion.min_order_amount = dto.min_order_amount
        if dto.max_discount_amount is not None:
            promotion.max_discount_amount = dto.max_discount_amount
        if dto.is_active is not None:
            promotion.is_active = dto.is_active
        if dto.starts_at is not None:
            promotion.starts_at = dto.starts_at
        if dto.ends_at is not None:
            promotion.ends_at = dto.ends_at

        # Validate type-specific constraints
        if promotion.type == "percent" and promotion.value > 100:
            raise BusinessException(
                "PROMOTION_INVALID_VALUE",
                400,
                "Khuyến mãi theo phần trăm thì giá trị phải từ 1 đến 100.",
            )

        if (
            promotion.ends_at
            and promotion.starts_at
            and promotion.ends_at <= promotion.starts_at
        ):
            raise BusinessException(
                "PROMOTION_INVALID_DATES",
                400,
                "Thời gian kết thúc phải sau thời gian bắt đầu.",
            )

        saved = await self.crud.save(promotion)
        return self._to_dto(saved)

    async def remove(self, promotion_id: int) -> Dict[str, str]:
        promotion = await self._find_active_or_throw(promotion_id)
        await self.crud.soft_delete(promotion)
        return {"message": "Xóa chương trình khuyến mãi thành công."}

    async def validate_and_calculate_discount(
        self, code: str, order_amount: float
    ) -> Dict[str, Any]:
        clean_code = (code or "").strip().upper()
        promotion = await self.crud.get_by_code(clean_code)

        if not promotion:
            return {
                "valid": False,
                "discount_amount": 0,
                "reason": "Mã khuyến mãi không tồn tại.",
            }

        if not promotion.is_active:
            return {
                "valid": False,
                "discount_amount": 0,
                "reason": "Chương trình khuyến mãi đã bị vô hiệu hóa.",
            }

        now = datetime.now(timezone.utc)
        if now < _ensure_aware(promotion.starts_at):
            return {
                "valid": False,
                "discount_amount": 0,
                "reason": "Chương trình khuyến mãi chưa bắt đầu.",
            }

        if promotion.ends_at and now > _ensure_aware(promotion.ends_at):
            return {
                "valid": False,
                "discount_amount": 0,
                "reason": "Chương trình khuyến mãi đã hết hạn.",
            }

        min_amount = (
            float(promotion.min_order_amount) if promotion.min_order_amount else 0.0
        )
        if order_amount < min_amount:
            return {
                "valid": False,
                "discount_amount": 0,
                "reason": (
                    f"Đơn hàng chưa đạt giá trị tối thiểu "
                    f"({min_amount:,.0f}đ) để áp dụng mã."
                ),
            }

        discount = 0.0
        value = float(promotion.value)

        if promotion.type == "fixed":
            discount = value
        elif promotion.type == "percent":
            discount = (value / 100) * order_amount
            if promotion.max_discount_amount:
                max_discount = float(promotion.max_discount_amount)
                discount = min(discount, max_discount)

        # Số tiền giảm không được vượt quá tổng giá trị đơn hàng
        discount = min(discount, order_amount)

        return {
            "valid": True,
            "discount_amount": discount,
            "reason": None,
            "promotion_type": promotion.type,
            "promotion_value": float(promotion.value),
        }

    async def _find_active_or_throw(self, promotion_id: int) -> Promotion:
        promotion = await self.crud.get_by_id(promotion_id)
        if not promotion:
            raise BusinessException(
                "PROMOTION_NOT_FOUND",
                404,
                "Không tìm thấy chương trình khuyến mãi.",
            )
        return promotion

    async def _assert_code_not_taken(
        self, code: str, exclude_id: Optional[int] = None
    ) -> None:
        existing = await self.crud.get_by_code(code, exclude_id=exclude_id)
        if existing:
            raise BusinessException(
                "PROMOTION_CODE_DUPLICATE",
                409,
                "Mã khuyến mãi này đã tồn tại.",
            )

    def _to_dto(self, p: Promotion) -> Dict[str, Any]:
        return {
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "type": p.type,
            "value": float(p.value),
            "min_order_amount": (
                float(p.min_order_amount) if p.min_order_amount is not None else None
            ),
            "max_discount_amount": (
                float(p.max_discount_amount)
                if p.max_discount_amount is not None
                else None
            ),
            "is_active": p.is_active,
            "starts_at": p.starts_at.isoformat(),
            "ends_at": p.ends_at.isoformat() if p.ends_at else None,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
        }
