from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class QueryRevenueReportDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_date: Optional[str] = Field(
        default=None,
        pattern=_DATE_PATTERN,
        examples=["2026-07-01"],
        description=(
            "Từ ngày (YYYY-MM-DD, theo UTC). Bỏ trống = không giới hạn cận dưới."
        ),
    )
    to_date: Optional[str] = Field(
        default=None,
        pattern=_DATE_PATTERN,
        examples=["2026-07-31"],
        description=(
            "Đến ngày (YYYY-MM-DD, theo UTC, bao gồm cả ngày này). Bỏ trống = "
            "không giới hạn cận trên."
        ),
    )
    branch_id: Optional[int] = Field(
        default=None,
        gt=0,
        examples=[1],
        description=(
            "Không truyền = tổng doanh thu TOÀN HỆ THỐNG (mọi chi nhánh). Chỉ "
            "admin mới gọi được endpoint này (require_roles)."
        ),
    )


class RevenueReportDataDto(BaseModel):
    from_date: Optional[str] = Field(default=None, examples=["2026-07-01"])
    to_date: Optional[str] = Field(default=None, examples=["2026-07-31"])
    branch_id: Optional[int] = Field(
        default=None,
        examples=[1],
        description="null = tổng hợp toàn hệ thống (mọi chi nhánh)",
    )
    total_orders: int = Field(
        ...,
        examples=[120],
        description=(
            "Số đơn hàng status='completed' trong khoảng thời gian - KHÔNG lọc "
            "deleted_at (Mục 9: tính cả sản phẩm/nhân viên đã soft-delete, vì "
            "hóa đơn cũ vẫn tham chiếu tới các bản ghi đó)."
        ),
    )
    gross_revenue: float = Field(
        ...,
        examples=[15000000],
        description=(
            "Tổng total_amount của các đơn completed (đã trừ discount_amount, "
            "CHƯA trừ trả hàng)"
        ),
    )
    total_refund: float = Field(
        ...,
        examples=[500000],
        description="Tổng refund_amount của các returns thuộc các đơn nằm trong phạm vi báo cáo",
    )
    net_revenue: float = Field(
        ...,
        examples=[14500000],
        description="net_revenue = gross_revenue - total_refund",
    )
