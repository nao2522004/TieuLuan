from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user
from app.modules.orders.schemas import (
    CreateOrderDto,
    OrderPaymentStatus,
    OrderStatus,
    QueryOrderDto,
)
from app.modules.orders.service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Tạo đơn hàng - row-lock (SELECT ... FOR UPDATE) trừ kho trong 1 "
        "transaction. Bắt buộc đang có ca làm việc mở. Hỗ trợ 'cash'/'card' "
        "(paid ngay) và 'transfer' (pending, response kèm qr_content/qr_code)."
    ),
)
async def create_order(
    dto: CreateOrderDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = OrderService(db)
    data = await service.create(dto, user)
    return ApiSuccessResponse(data=data)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary=(
        "Danh sách đơn hàng (phân trang). Staff chỉ xem được đơn hàng của chi "
        "nhánh mình (và chỉ đơn của chính mình); admin xem toàn hệ thống hoặc "
        "lọc theo branch_id."
    ),
)
async def list_orders(
    page: int = Query(default=1, ge=1, description="tối thiểu là 1"),
    limit: int = Query(default=10, ge=1, le=100, description="tối đa là 100"),
    branch_id: Optional[int] = Query(default=None, gt=0),
    status_: Optional[OrderStatus] = Query(default=None, alias="status"),
    payment_status: Optional[OrderPaymentStatus] = Query(default=None),
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
    created_by: Optional[int] = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    query = QueryOrderDto(
        page=page,
        limit=limit,
        branch_id=branch_id,
        status=status_,
        payment_status=payment_status,
        from_date=from_date,
        to_date=to_date,
        created_by=created_by,
    )
    service = OrderService(db)
    data, meta = await service.find_all(query, user)
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{order_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Chi tiết 1 đơn hàng (chỉ admin hoặc user cùng chi nhánh)",
)
async def get_order(
    order_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = OrderService(db)
    await service.assert_branch_access(order_id, user)
    data = await service.find_one(order_id)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{order_id}/confirm-payment",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Xác nhận đã nhận tiền cho đơn payment_method='transfer' (payment_status "
        "pending -> paid). Chỉ admin hoặc user cùng chi nhánh với đơn hàng."
    ),
)
async def confirm_payment(
    order_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = OrderService(db)
    await service.assert_branch_access(order_id, user)
    data = await service.confirm_payment(order_id, user)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{order_id}/cancel",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Hủy đơn hàng - hoàn lại tồn kho (transaction + row-lock, xem comment "
        "OrderService.cancel() về thứ tự khóa). Chỉ admin hoặc chính người tạo "
        "đơn mới được hủy."
    ),
)
async def cancel_order(
    order_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = OrderService(db)
    data = await service.cancel(order_id, user)
    return ApiSuccessResponse(data=data)
