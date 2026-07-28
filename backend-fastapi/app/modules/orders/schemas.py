from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.exceptions import BusinessException

OrderPaymentMethod = Literal["cash", "card", "transfer"]
OrderStatus = Literal["completed", "cancelled"]
OrderPaymentStatus = Literal["pending", "paid"]


class CreateOrderItemDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(
        ..., gt=0, description="ID sản phẩm (phải thuộc chi nhánh của ca đang mở)"
    )
    quantity: int = Field(..., gt=0, description="Số lượng mua (phải > 0)")


class CreateOrderDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    payment_method: OrderPaymentMethod = Field(
        ...,
        description=(
            "'cash'/'card' -> payment_status='paid' ngay. 'transfer' -> đơn tạo "
            "ra ở payment_status='pending', response kèm qr_content/qr_code."
        ),
    )
    discount_amount: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0"),
        description="Số tiền giảm giá cho cả đơn (không lớn hơn tổng tiền hàng)",
    )
    promotion_code: Optional[str] = Field(
        default=None,
        description=(
            "Mã khuyến mãi áp dụng cho ngày đặc biệt. KHÔNG được truyền đồng thời "
            "với discount_amount."
        ),
    )
    items: List[CreateOrderItemDto] = Field(
        ..., min_length=1, description="Danh sách sản phẩm, không trùng product_id"
    )

    @model_validator(mode="after")
    def _validate(self):
        if self.discount_amount is not None and self.promotion_code:
            raise BusinessException(
                "ORDER_DISCOUNT_PROMOTION_CONFLICT",
                400,
                "Không được truyền đồng thời discount_amount và promotion_code.",
            )

        seen = set()
        for item in self.items:
            if item.product_id in seen:
                raise BusinessException(
                    "VALIDATION_ERROR",
                    400,
                    f"items: product_id {item.product_id} bị lặp lại, vui lòng "
                    "gộp thành 1 dòng với tổng số lượng",
                )
            seen.add(item.product_id)
        return self


class QueryOrderDto(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)
    branch_id: Optional[int] = Field(default=None, gt=0)
    status: Optional[OrderStatus] = None
    payment_status: Optional[OrderPaymentStatus] = None
    from_date: Optional[str] = Field(
        default=None, description="YYYY-MM-DD, tính từ 00:00:00 UTC+7"
    )
    to_date: Optional[str] = Field(
        default=None, description="YYYY-MM-DD, tính đến 23:59:59 UTC+7"
    )
    created_by: Optional[int] = Field(default=None, gt=0)


class OrderItemBatchDto(BaseModel):
    batch_id: int
    batch_code: str
    expiry_date: Optional[str] = None
    quantity_taken: int


class OrderItemDto(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    unit_price: float
    original_unit_price: Optional[float] = None
    discount_percent: Optional[float] = None
    returned_quantity: int = 0
    batches: List[OrderItemBatchDto] = Field(default_factory=list)


class OrderDataDto(BaseModel):
    id: int
    branch_id: int
    shift_id: Optional[int] = None
    created_by: int
    status: str
    payment_method: str
    payment_status: str
    discount_amount: float
    total_amount: float
    items: List[OrderItemDto]
    created_at: str
    updated_at: str
    qr_content: Optional[str] = None
    qr_code: Optional[str] = None
    promotion_code: Optional[str] = None
    promotion_type: Optional[str] = None
    promotion_value: Optional[float] = None
