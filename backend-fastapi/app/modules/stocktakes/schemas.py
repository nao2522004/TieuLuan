from typing import Any, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

StocktakeStatus = Literal["open", "closed"]


class CreateStocktakeDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: Optional[str] = Field(
        default=None, max_length=255, description="Ghi chú tối đa 255 ký tự"
    )
    branch_id: Optional[int] = Field(
        default=None,
        gt=0,
        description="Chỉ dành cho admin để tạo cho chi nhánh bất kỳ",
    )


class BatchCountDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    batch_id: int = Field(..., gt=0, description="ID lô hàng")
    counted_quantity: int = Field(..., ge=0, description="Số đếm thực tế của lô này")


class CreateStocktakeItemDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(..., gt=0, description="ID sản phẩm cần kiểm")
    counted_quantity: int = Field(..., ge=0, description="Số lượng đếm thực tế (tổng tất cả lô)")
    batch_counts: Optional[List[BatchCountDto]] = Field(
        default=None,
        description=(
            "Chi tiết số đếm theo từng lô. Nếu gửi, backend sẽ cộng/trừ đúng lô khi "
            "chốt phiên thay vì dùng FEFO mù. Tuỳ chọn — backward compatible."
        ),
    )


class BulkCreateStocktakeItemDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: List[CreateStocktakeItemDto] = Field(..., min_length=1)


class StocktakeItemBatchDto(BaseModel):
    batch_id: int
    batch_code: str
    expiry_date: Optional[str] = None
    quantity_remaining: int


class StocktakeBatchAdjustmentDto(BaseModel):
    batch_code: str
    expiry_date: Optional[str] = None
    type: Literal["IN", "OUT"]
    quantity: int


class StocktakeItemDto(BaseModel):
    id: int
    stocktake_id: int
    product_id: int
    product_name: Optional[str] = None
    product_barcode: Optional[str] = None
    unit: Optional[str] = None
    system_quantity: int
    counted_quantity: int
    difference: int
    batches: Optional[List[StocktakeItemBatchDto]] = None
    batch_adjustments: Optional[List[StocktakeBatchAdjustmentDto]] = None


class StocktakeSkippedItemDto(BaseModel):
    product_id: int
    reason: str


class StocktakeDto(BaseModel):
    id: int
    branch_id: int
    branch_name: Optional[str] = None
    created_by: int
    creator_name: Optional[str] = None
    status: StocktakeStatus
    note: Optional[str] = None
    created_at: str
    closed_at: Optional[str] = None
    items: Optional[List[StocktakeItemDto]] = None
    skipped_items: Optional[List[StocktakeSkippedItemDto]] = None
