from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

InventoryTransactionType = Literal["IN", "OUT"]
InventoryTransactionSource = Literal["ORDER", "INBOUND", "ADJUSTMENT", "STOCKTAKE"]


class CreateInventoryTransactionDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(..., gt=0, description="ID sản phẩm cần nhập kho")
    quantity: int = Field(..., gt=0, description="Số lượng nhập thêm (phải > 0)")
    unit_cost: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0"),
        description=(
            "Giá vốn tham khảo tại thời điểm nhập lô này - CHỈ lưu tham khảo, "
            "không dùng để tính giá vốn trung bình (mức tối giản theo lịch trình)"
        ),
    )
    note: Optional[str] = Field(default=None, max_length=255)
    expiry_date: Optional[date] = Field(
        default=None, description="Hạn sử dụng của lô hàng (YYYY-MM-DD)"
    )
    batch_code: Optional[str] = Field(
        default=None, max_length=100, description="Mã lô tự chọn"
    )


class CreateAdjustmentDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(..., gt=0, description="ID sản phẩm cần điều chỉnh")
    quantity: int = Field(..., gt=0, description="Số lượng hao hụt/hủy (phải > 0)")
    reason: str = Field(
        ..., min_length=1, max_length=255, description="Lý do hao hụt/hủy (bắt buộc)"
    )
    note: Optional[str] = Field(default=None, max_length=255)
    batch_id: Optional[int] = Field(
        default=None,
        gt=0,
        description=(
            "ID lô hàng cụ thể cần trừ (tùy chọn). Nếu không truyền sẽ tự động "
            "trừ theo FEFO"
        ),
    )


class InventoryTransactionDto(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_barcode: str
    type: str
    source: str
    reason: Optional[str] = None
    quantity: int
    unit_cost: Optional[float] = None
    note: Optional[str] = None
    created_by: int
    batch_id: Optional[int] = None
    created_at: str
