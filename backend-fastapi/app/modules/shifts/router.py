from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user
from app.modules.shifts.schemas import CloseShiftDto, OpenShiftDto, UpdateClosingDto
from app.modules.shifts.service import ShiftsService

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.post(
    "/open",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Mở ca làm việc mới cho user đang đăng nhập (mức tối giản - phục vụ Orders)",
)
async def open_shift(
    dto: OpenShiftDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ShiftsService(db)
    data = await service.open(dto, user)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{shift_id}/close",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Đóng ca làm việc, tính expected_cash mức tối giản (chưa trừ Returns)",
)
async def close_shift(
    dto: CloseShiftDto,
    shift_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ShiftsService(db)
    data = await service.close(shift_id, dto, user)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{shift_id}/correction",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Chỉnh sửa thông tin ca đã đóng (tiền đếm thực tế closing_cash, ghi chú) "
        "dành cho Admin hoặc Trưởng ca mở ca."
    ),
)
async def correct_closed_shift(
    dto: UpdateClosingDto,
    shift_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ShiftsService(db)
    data = await service.correct_closed(shift_id, dto, user)
    return ApiSuccessResponse(data=data)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary=(
        "Danh sách tất cả ca làm việc (phân trang). Staff chỉ xem được ca của chi "
        "nhánh mình (hoặc chính mình); admin xem toàn hệ thống hoặc lọc theo branch_id."
    ),
)
async def list_shifts(
    page: int = Query(default=1, ge=1, description="tối thiểu là 1"),
    limit: int = Query(default=10, ge=1, le=100, description="tối đa là 100"),
    branch_id: Optional[int] = Query(default=None, gt=0),
    user_id: Optional[int] = Query(
        default=None, gt=0, description="Lọc ca theo nhân viên"
    ),
    status_: Optional[str] = Query(
        default=None,
        alias="status",
        pattern="^(open|closed)$",
        description="Lọc theo trạng thái ca: 'open' hoặc 'closed'",
    ),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ShiftsService(db)
    data, meta = await service.find_all(page, limit, user, branch_id, user_id, status_)
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{shift_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Chi tiết 1 ca làm việc, kèm danh sách đơn hàng và tổng hợp theo phương "
        "thức thanh toán (cash/card/transfer) để đối soát quỹ. Staff chỉ xem được "
        "ca của chi nhánh mình (hoặc của chính mình); admin xem mọi ca."
    ),
)
async def get_shift(
    shift_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ShiftsService(db)
    data = await service.find_one_detail(shift_id, user)
    return ApiSuccessResponse(data=data)
