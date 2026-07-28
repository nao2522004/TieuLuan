from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

PromotionType = Literal["percent", "fixed"]


class CreatePromotionDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(
        ...,
        min_length=1,
        max_length=50,
        examples=["GIAM20K"],
        description="Mã khuyến mãi (viết hoa, không khoảng trắng, duy nhất)",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=150,
        examples=["Giảm 20.000đ cho đơn hàng từ 100.000đ"],
    )
    type: PromotionType = Field(
        ...,
        examples=["fixed"],
        description="Loại giảm giá (percent: %, fixed: số tiền VND)",
    )
    value: Decimal = Field(
        ...,
        ge=Decimal("0.01"),
        examples=[20000],
        description="Giá trị giảm (nếu là percent: 1-100; nếu là fixed: > 0)",
    )
    min_order_amount: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0"),
        examples=[100000],
        description="Giá trị đơn hàng tối thiểu để áp dụng",
    )
    max_discount_amount: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0"),
        examples=[50000],
        description="Số tiền giảm tối đa (chỉ có tác dụng với type='percent')",
    )
    is_active: Optional[bool] = Field(default=True, examples=[True])
    starts_at: Optional[datetime] = Field(
        default=None, examples=["2026-07-17T00:00:00.000Z"]
    )
    ends_at: Optional[datetime] = Field(
        default=None, examples=["2026-08-17T00:00:00.000Z"]
    )


class UpdatePromotionDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    type: Optional[PromotionType] = None
    value: Optional[Decimal] = Field(default=None, ge=Decimal("0.01"))
    min_order_amount: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    max_discount_amount: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class PromotionDto(BaseModel):
    id: int
    code: str
    name: str
    type: str
    value: float
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    is_active: bool
    starts_at: str
    ends_at: Optional[str] = None
    created_at: str
    updated_at: str


class ValidatePromotionResultDto(BaseModel):
    valid: bool
    discount_amount: float
    reason: Optional[str] = None
    promotion_type: Optional[str] = None
    promotion_value: Optional[float] = None
