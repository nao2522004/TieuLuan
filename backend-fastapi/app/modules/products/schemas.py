from datetime import date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CreateProductDto(BaseModel):
    model_config = ConfigDict(extra="forbid")  # chống Mass Assignment (Mục 4 ruleset)

    branch_id: int = Field(..., gt=0, description="ID chi nhánh sở hữu sản phẩm")
    category_id: int = Field(..., gt=0)
    barcode: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Mã vạch. Bỏ trống = hệ thống tự động sinh mã vạch EAN-13",
    )
    name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=20)
    cost_price: Decimal = Field(
        ..., ge=Decimal("0"), description="Giá vốn - NUMERIC(12,2)"
    )
    sale_price: Decimal = Field(
        ..., ge=Decimal("0"), description="Giá bán - NUMERIC(12,2)"
    )
    stock_quantity: Optional[int] = Field(default=0, ge=0)
    reorder_level: Optional[int] = Field(default=10, ge=0)
    expiry_date: Optional[date] = None


class UpdateProductDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    branch_id: Optional[int] = Field(default=None, gt=0)
    category_id: Optional[int] = Field(default=None, gt=0)
    barcode: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=20)
    cost_price: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    sale_price: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    reorder_level: Optional[int] = Field(default=None, ge=0)
    expiry_date: Optional[date] = None


class ProductDto(BaseModel):
    id: int
    branch_id: int
    category_id: int
    barcode: str
    name: str
    unit: str
    cost_price: float
    sale_price: float
    stock_quantity: int
    reorder_level: int
    expiry_date: Optional[str] = None
    nearest_expiry_date: Optional[str] = Field(
        default=None,
        description="Hạn sử dụng gần nhất của các lô còn tồn kho",
    )
    created_at: str
    updated_at: str
    effective_price: float = Field(
        ..., description="Giá bán sau khi áp giảm giá cận hạn (nếu có), tính real-time"
    )
    discount_percent: float = Field(
        ..., description="% giảm giá cận hạn đang áp dụng, 0 nếu không có"
    )
    is_expiry_discount_applied: bool


class ProductBatchDto(BaseModel):
    id: int
    product_id: int
    batch_code: str
    expiry_date: Optional[str] = None
    quantity_received: int
    quantity_remaining: int
    unit_cost: Optional[float] = None
    received_at: str
    created_by: Optional[int] = None


class UpdateProductBatchDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    batch_code: Optional[str] = Field(
        default=None, max_length=100, description="Mã lô. Nếu để trống sẽ giữ nguyên."
    )
    expiry_date: Optional[date] = Field(
        default=None,
        description="Hạn sử dụng (YYYY-MM-DD). Nếu để trống sẽ giữ nguyên.",
    )
    unit_cost: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0"),
        description="Giá nhập mỗi đơn vị (không âm).",
    )


class QuoteResultDto(BaseModel):
    unit_price: float
    original_unit_price: Optional[float] = None
    discount_percent: Optional[float] = None
    line_total: float


class ExpiringSoonBatchDto(BaseModel):
    batch_id: int
    product_id: int
    batch_code: str
    expiry_date: Optional[str] = None
    quantity_remaining: int
    product_name: str
    barcode: str
    unit: str
    sale_price: Optional[float] = None


class ProductAlertsDataDto(BaseModel):
    low_stock: List[ProductDto] = Field(
        ..., description="Sản phẩm có stock_quantity <= reorder_level"
    )
    expiring_soon: List[ExpiringSoonBatchDto] = Field(
        ...,
        description=(
            "Lô hàng có expiry_date trong X ngày tới "
            "(X = PRODUCT_EXPIRY_ALERT_DAYS, mặc định 7)"
        ),
    )
