from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import date, datetime

class CreateProductDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    branch_id: int = Field(..., description="ID chi nhánh")
    category_id: int = Field(..., description="ID danh mục")
    barcode: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=20)
    cost_price: Decimal = Field(..., ge=0)
    sale_price: Decimal = Field(..., ge=0)
    stock_quantity: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=10, ge=0)
    expiry_date: Optional[date] = None

class UpdateProductDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    branch_id: Optional[int] = None
    category_id: Optional[int] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    unit: Optional[str] = None
    cost_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    expiry_date: Optional[date] = None

class ProductResponseDto(BaseModel):
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
    nearest_expiry_date: Optional[str] = None
    created_at: str
    updated_at: str
