from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, PositiveInt

ShiftStatus = Literal["open", "closed"]


class OpenShiftDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    opening_cash: Decimal = Field(
        ..., ge=Decimal("0"), examples=[500000], description="Tiền quỹ đầu ca"
    )
    cashier_ids: Optional[List[PositiveInt]] = Field(
        default=None,
        examples=[[2, 3]],
        description=(
            "Danh sách ID thu ngân được gán vào ca làm việc (tuỳ chọn, có thể để "
            "trống). Trưởng ca có thể mở ca một mình mà không cần thêm thu ngân."
        ),
    )
    branch_id: Optional[int] = Field(
        default=None,
        gt=0,
        examples=[1],
        description=(
            "Chỉ cần truyền khi tài khoản (thường là admin) không gắn cố định với "
            "1 chi nhánh. Nhân viên chi nhánh (staff) mặc định dùng branch_id của "
            "chính tài khoản đang đăng nhập."
        ),
    )
    note: Optional[str] = Field(default=None, max_length=255, examples=["Ca sáng"])


class CloseShiftDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    closing_cash: Decimal = Field(
        ...,
        ge=Decimal("0"),
        examples=[1250000],
        description="Tiền quỹ thực đếm cuối ca",
    )
    note: Optional[str] = Field(default=None, max_length=255, examples=["Đủ quỹ"])


class UpdateClosingDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    closing_cash: Optional[Decimal] = Field(
        default=None,
        ge=Decimal("0"),
        examples=[1300000],
        description="Tiền quỹ thực đếm lại (sửa sau khi đóng ca nhỡ nhập sai)",
    )
    note: Optional[str] = Field(
        default=None,
        max_length=255,
        examples=["Ca sáng, đủ quỹ"],
        description="Ghi chú đóng ca (có thể sửa lại)",
    )


class CashierSummaryDto(BaseModel):
    id: int
    full_name: str


class ShiftDto(BaseModel):
    id: int
    branch_id: int
    branch_name: Optional[str] = None
    user_id: int
    user_full_name: Optional[str] = None
    opening_cash: float
    closing_cash: Optional[float] = None
    expected_cash: Optional[float] = None
    cash_difference: Optional[float] = None
    note: Optional[str] = None
    opened_at: str
    closed_at: Optional[str] = None
    cashiers: Optional[List[CashierSummaryDto]] = None


class ShiftOrderSummaryDto(BaseModel):
    id: int
    created_by: int
    created_by_name: Optional[str] = None
    payment_method: str
    payment_status: str
    status: str
    total_amount: float
    refunded_amount: float
    created_at: str


class ShiftReturnSummaryDto(BaseModel):
    id: int
    order_id: int
    order_item_id: int
    product_name: Optional[str] = None
    quantity: int
    refund_amount: float
    payment_method: str
    reason: Optional[str] = None
    created_by: int
    created_by_name: Optional[str] = None
    created_at: str


class ShiftDetailDto(ShiftDto):
    orders_count: int
    cash_orders_total: float
    card_orders_total: float
    transfer_orders_total: float
    cash_returns_total: float
    card_returns_total: float
    transfer_returns_total: float
    live_expected_cash: float
    orders: List[ShiftOrderSummaryDto]
    returns: List[ShiftReturnSummaryDto]
