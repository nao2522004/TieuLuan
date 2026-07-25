from typing import List, Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, require_roles
from app.modules.stocktakes.schemas import (
    BulkCreateStocktakeItemDto,
    CreateStocktakeDto,
    CreateStocktakeItemDto,
)
from app.modules.stocktakes.service import StocktakesService

router = APIRouter(prefix="/stocktakes", tags=["stocktakes"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Mở phiên kiểm kê kho mới (admin/leader) - Chặn nếu đã có phiên đang open "
        "cho chi nhánh"
    ),
)
async def create_stocktake(
    dto: CreateStocktakeDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = StocktakesService(db)
    data = await service.create(dto, user)
    return ApiSuccessResponse(data=data)


@router.post(
    "/{stocktake_id}/items",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Ghi nhận số lượng đếm tay thực tế của một sản phẩm trong phiên kiểm kê "
        "(admin/leader/cashier)"
    ),
)
async def record_item(
    dto: CreateStocktakeItemDto,
    stocktake_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader", "cashier"])),
):
    service = StocktakesService(db)
    data = await service.record_item(stocktake_id, dto, user)
    return ApiSuccessResponse(data=data)


@router.post(
    "/{stocktake_id}/items/bulk",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[list],
    summary=(
        "Ghi nhận số lượng đếm thực tế của nhiều sản phẩm cùng lúc trong phiên "
        "kiểm kê (admin/leader/cashier)"
    ),
)
async def record_items_bulk(
    dto: BulkCreateStocktakeItemDto,
    stocktake_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader", "cashier"])),
):
    service = StocktakesService(db)
    data = await service.record_items_bulk(stocktake_id, dto.items, user)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{stocktake_id}/close",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Chốt phiên kiểm kê (admin/leader) - Cập nhật stock_quantity, ghi log "
        "biến động tồn kho và evict cache"
    ),
)
async def close_stocktake(
    stocktake_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = StocktakesService(db)
    data = await service.close(stocktake_id, user)
    return ApiSuccessResponse(data=data)


@router.delete(
    "/{stocktake_id}/items/{item_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary=(
        "Xóa 1 dòng đếm nhầm khỏi phiên kiểm kê đang mở (admin/leader/cashier). "
        "Chỉ áp dụng khi phiên còn status='open'."
    ),
)
async def remove_item(
    stocktake_id: int = Path(..., ge=1),
    item_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader", "cashier"])),
):
    service = StocktakesService(db)
    await service.remove_item(stocktake_id, item_id, user)
    return ApiSuccessResponse(data={"message": "Đã xóa dòng đếm."})


@router.get(
    "/{stocktake_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Chi tiết một phiên kiểm kê kho kèm các sản phẩm được đếm (admin/leader/cashier)",
)
async def get_stocktake(
    stocktake_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader", "cashier"])),
):
    service = StocktakesService(db)
    data = await service.find_one(stocktake_id, user)
    return ApiSuccessResponse(data=data)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách các phiên kiểm kê kho có phân trang (admin/leader)",
)
async def list_stocktakes(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    branch_id: Optional[int] = Query(default=None, gt=0),
    status_: Optional[str] = Query(
        default=None, alias="status", pattern="^(open|closed)$"
    ),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = StocktakesService(db)
    data, meta = await service.find_all(page, limit, user, branch_id, status_)
    return ApiSuccessResponse(data=data, meta=meta)
