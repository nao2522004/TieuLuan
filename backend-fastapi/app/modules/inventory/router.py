from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, require_roles
from app.modules.inventory.schemas import (
    CreateAdjustmentDto,
    CreateInventoryTransactionDto,
)
from app.modules.inventory.service import InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post(
    "/inbound",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Nhập kho (chỉ type='IN', admin/leader) - cộng thẳng stock_quantity và "
        "ghi lịch sử vào inventory_transactions với source='INBOUND' trong 1 "
        "transaction có row-lock"
    ),
)
async def create_inbound(
    dto: CreateInventoryTransactionDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = InventoryService(db)
    data = await service.create_inbound_transaction(dto, user)
    return ApiSuccessResponse(data=data)


@router.post(
    "/transactions",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Alias cho POST /inventory/inbound để tương thích ngược",
)
async def create_inbound_legacy(
    dto: CreateInventoryTransactionDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = InventoryService(db)
    data = await service.create_inbound_transaction(dto, user)
    return ApiSuccessResponse(data=data)


@router.post(
    "/adjustments",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Ghi nhận hao hụt/hủy hàng (admin/leader) - bắt buộc product_id, quantity, "
        "reason. Trừ stock_quantity, ghi log type='OUT', source='ADJUSTMENT'. Chặn "
        "tồn kho âm ở tầng Service."
    ),
)
async def create_adjustment(
    dto: CreateAdjustmentDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = InventoryService(db)
    data = await service.create_adjustment(dto, user)
    return ApiSuccessResponse(data=data)


@router.get(
    "/transactions",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary=(
        "Lịch sử biến động tồn kho (phân trang, admin/leader). Lọc theo "
        "product_id/type/source. Nếu không phải admin, chỉ được xem các giao dịch "
        "của sản phẩm thuộc chi nhánh của mình."
    ),
)
async def get_transactions(
    page: int = Query(default=1, ge=1, description="tối thiểu là 1"),
    limit: int = Query(default=10, ge=1, le=100, description="tối đa là 100"),
    product_id: Optional[int] = Query(default=None, gt=0),
    type: Optional[str] = Query(
        default=None,
        pattern="^(IN|OUT)$",
        description="Lọc theo loại biến động (IN/OUT)",
    ),
    source: Optional[str] = Query(
        default=None,
        pattern="^(ORDER|INBOUND|ADJUSTMENT|STOCKTAKE)$",
        description="Lọc theo nguồn biến động",
    ),
    start_date: Optional[str] = Query(
        default=None, description="Ngày bắt đầu (YYYY-MM-DD hoặc ISO string)"
    ),
    end_date: Optional[str] = Query(
        default=None, description="Ngày kết thúc (YYYY-MM-DD hoặc ISO string)"
    ),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = InventoryService(db)
    data, meta = await service.find_all_paginated(
        page=page,
        limit=limit,
        user=user,
        product_id=product_id,
        type=type,
        source=source,
        start_date=start_date,
        end_date=end_date,
    )
    return ApiSuccessResponse(data=data, meta=meta)
