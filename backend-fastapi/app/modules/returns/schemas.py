from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CreateReturnDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_item_id: int = Field(
        ...,
        gt=0,
        description="ID dòng sản phẩm trong đơn hàng (order_items.id) cần trả",
    )
    quantity: int = Field(
        ...,
        gt=0,
        description=(
            "Số lượng trả (phải > 0, không được vượt quá số lượng chưa trả trước đó "
            "của dòng hàng này - hỗ trợ trả từng phần)"
        ),
    )
    reason: Optional[str] = Field(
        default=None, max_length=255, examples=["Sản phẩm bị lỗi"]
    )


class QueryReturnsDto(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)
    order_id: Optional[int] = Field(default=None, gt=0)
    created_by: Optional[int] = Field(default=None, gt=0)


class ReturnDto(BaseModel):
    id: int
    order_item_id: int
    quantity: int
    refund_amount: float = Field(
        ...,
        description=(
            "Tự động tính = quantity trả × unit_price của order_item tại thời điểm "
            "bán (snapshot) - KHÔNG nhận từ client."
        ),
    )
    reason: Optional[str] = None
    created_by: int
    created_by_name: Optional[str] = None
    created_at: str
    zalopay_m_refund_id: Optional[str] = None
    zalopay_refund_id: Optional[str] = None
    zalopay_refund_status: Optional[str] = None
