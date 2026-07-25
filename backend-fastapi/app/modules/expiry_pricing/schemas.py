from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.exceptions import BusinessException

ExpiryDiscountRuleScope = Literal["expiry", "all_products"]


class CreateExpiryDiscountRuleDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: Optional[ExpiryDiscountRuleScope] = Field(
        default="expiry",
        examples=["expiry"],
        description=(
            "'expiry': áp dụng theo số ngày còn lại tới hạn sử dụng (mặc định, hành vi cũ). "
            "'all_products': áp dụng cho TOÀN BỘ sản phẩm, dùng cho sự kiện giảm giá "
            "toàn cửa hàng (VD: Tết, Black Friday), không cần expiry_date."
        ),
    )
    days_before_expiry: Optional[int] = Field(
        default=None,
        ge=0,
        examples=[3],
        description=(
            "BẮT BUỘC khi scope='expiry': áp dụng khi sản phẩm còn <= X ngày tới hạn "
            "(0 = đã hết hạn). Bỏ qua (không cần truyền) khi scope='all_products'."
        ),
    )
    discount_percent: Decimal = Field(
        ...,
        gt=Decimal("0"),
        le=Decimal("100"),
        examples=[30],
        description="% giảm giá, 1-100",
    )
    is_active: Optional[bool] = Field(default=True, examples=[True])

    @model_validator(mode="after")
    def _validate_scope_requirements(self):
        effective_scope = self.scope or "expiry"
        if effective_scope == "expiry" and self.days_before_expiry is None:
            raise BusinessException(
                "VALIDATION_ERROR",
                400,
                "days_before_expiry: bắt buộc khi scope='expiry'",
            )
        return self


class UpdateExpiryDiscountRuleDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: Optional[ExpiryDiscountRuleScope] = None
    days_before_expiry: Optional[int] = Field(default=None, ge=0)
    discount_percent: Optional[Decimal] = Field(
        default=None, gt=Decimal("0"), le=Decimal("100")
    )
    is_active: Optional[bool] = None


class ExpiryDiscountRuleDto(BaseModel):
    id: int
    scope: str
    days_before_expiry: Optional[int] = None
    discount_percent: float
    is_active: bool
    created_at: str
    updated_at: str
