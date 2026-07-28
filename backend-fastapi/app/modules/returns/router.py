from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user
from app.modules.returns.schemas import CreateReturnDto
from app.modules.returns.service import ReturnService

router = APIRouter(prefix="/returns", tags=["returns"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Trả hàng theo từng dòng sản phẩm (order_item_id), hỗ trợ trả từng phần. "
        "refund_amount tự động tính = quantity × unit_price tại thời điểm bán "
        "(server tính, không nhận từ client). KHÔNG hoàn lại tồn kho (quyết định "
        "nghiệp vụ đã chốt ở Ngày 14). Chỉ admin hoặc user cùng chi nhánh với đơn "
        "hàng chứa dòng sản phẩm này."
    ),
)
async def create_return(
    dto: CreateReturnDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ReturnService(db)
    data = await service.create(dto, user)
    return ApiSuccessResponse(data=data)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary=(
        "Danh sách lịch sử trả hàng (phân trang). Lọc theo order_id/created_by. "
        "Nếu không phải admin, chỉ được xem lịch sử thuộc chi nhánh của mình."
    ),
)
async def list_returns(
    page: int = Query(default=1, ge=1, description="tối thiểu là 1"),
    limit: int = Query(default=10, ge=1, le=100, description="tối đa là 100"),
    order_id: Optional[int] = Query(
        default=None, gt=0, description="Lọc theo ID đơn hàng"
    ),
    created_by: Optional[int] = Query(
        default=None, gt=0, description="Lọc theo ID nhân viên xử lý trả hàng"
    ),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ReturnService(db)
    data, meta = await service.find_all_paginated(
        page, limit, order_id, created_by, user
    )
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{return_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Xem chi tiết một giao dịch hoàn trả. Nếu không phải admin, chỉ được xem "
        "nếu giao dịch đó thuộc chi nhánh của mình."
    ),
)
async def get_return(
    return_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = ReturnService(db)
    data = await service.find_one_or_throw(return_id, user)
    return ApiSuccessResponse(data=data)
