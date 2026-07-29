from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, require_roles
from app.modules.reports.schemas import QueryRevenueReportDto
from app.modules.reports.service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])

_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


@router.get(
    "/revenue",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Báo cáo doanh thu (chỉ admin) - KHÔNG lọc deleted_at, tính cả sản "
        "phẩm/nhân viên đã soft-delete (Mục 9 ruleset). Không truyền branch_id "
        "= tổng hợp toàn hệ thống."
    ),
)
async def get_revenue_report(
    from_date: Optional[str] = Query(
        default=None,
        pattern=_DATE_PATTERN,
        description="Từ ngày (YYYY-MM-DD, theo UTC). Bỏ trống = không giới hạn cận dưới.",
    ),
    to_date: Optional[str] = Query(
        default=None,
        pattern=_DATE_PATTERN,
        description=(
            "Đến ngày (YYYY-MM-DD, theo UTC, bao gồm cả ngày này). Bỏ trống = "
            "không giới hạn cận trên."
        ),
    ),
    branch_id: Optional[int] = Query(
        default=None,
        gt=0,
        description=(
            "Không truyền = tổng doanh thu TOÀN HỆ THỐNG (mọi chi nhánh). Chỉ "
            "admin mới gọi được endpoint này."
        ),
    ),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    query = QueryRevenueReportDto(
        from_date=from_date, to_date=to_date, branch_id=branch_id
    )
    service = ReportService(db)
    data = await service.revenue(query)
    return ApiSuccessResponse(data=data)
