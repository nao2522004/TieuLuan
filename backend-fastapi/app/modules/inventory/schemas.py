from datetime import date
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

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


class AdjustmentBatchItem(BaseModel):
    """Một mục lô hàng trong điều chỉnh nhiều lô."""

    model_config = ConfigDict(extra="forbid")

    batch_id: int = Field(..., gt=0, description="ID lô hàng cần trừ")
    quantity: int = Field(..., gt=0, description="Số lượng cần trừ từ lô này")


class CreateAdjustmentDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(..., gt=0, description="ID sản phẩm cần điều chỉnh")
    quantity: Optional[int] = Field(
        default=None,
        gt=0,
        description=(
            "Số lượng hao hụt/hủy. Bắt buộc khi không truyền `batches`. "
            "Bị bỏ qua khi `batches` được cung cấp (tổng tính từ danh sách)."
        ),
    )
    reason: str = Field(
        ..., min_length=1, max_length=255, description="Lý do hao hụt/hủy (bắt buộc)"
    )
    note: Optional[str] = Field(default=None, max_length=255)
    batch_id: Optional[int] = Field(
        default=None,
        gt=0,
        description=(
            "ID lô hàng cụ thể cần trừ (tùy chọn, chỉ dùng khi không truyền `batches`). "
            "Nếu không truyền cả hai sẽ tự động trừ theo FEFO."
        ),
    )
    batches: Optional[List[AdjustmentBatchItem]] = Field(
        default=None,
        description=(
            "Danh sách lô hàng cần trừ cụ thể (nhiều lô). "
            "Khi truyền field này, `batch_id` và `quantity` ở cấp trên sẽ bị bỏ qua."
        ),
    )

    @model_validator(mode="after")
    def check_quantity_or_batches(self) -> "CreateAdjustmentDto":
        if self.batch_id and self.batches:
            raise ValueError("Không được truyền đồng thời 'batch_id' và 'batches'.")
        if not self.batches and self.quantity is None:
            raise ValueError(
                "Phải cung cấp `quantity` (trừ FEFO/một lô) hoặc `batches` (trừ nhiều lô)."
            )
        if self.batches is not None:
            if len(self.batches) == 0:
                raise ValueError("`batches` không được là danh sách rỗng.")
            batch_ids = [b.batch_id for b in self.batches]
            if len(set(batch_ids)) != len(batch_ids):
                raise ValueError("batches: batch_id không được trùng lặp giữa các lô.")
            if self.quantity is not None:
                total_batches_qty = sum(b.quantity for b in self.batches)
                if total_batches_qty != self.quantity:
                    raise ValueError(
                        f"Tổng số lượng theo từng lô ({total_batches_qty}) phải bằng đúng quantity tổng ({self.quantity})."
                    )
        return self


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
