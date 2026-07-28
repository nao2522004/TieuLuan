from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user, require_roles
from app.modules.promotions.schemas import CreatePromotionDto, UpdatePromotionDto
from app.modules.promotions.service import PromotionService

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get(
    "/validate",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Xác thực mã khuyến mãi & tính toán số tiền giảm giá (Dành cho POS/Thu ngân)",
)
async def validate_promotion(
    code: str = Query(default=""),
    amount: str = Query(default="0"),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    try:
        numeric_amount = float(amount) if amount else 0.0
    except ValueError:
        numeric_amount = 0.0

    service = PromotionService(db)
    data = await service.validate_and_calculate_discount(code, numeric_amount)
    return ApiSuccessResponse(data=data)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách chương trình khuyến mãi (Phân trang)",
)
async def list_promotions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    is_active: Optional[bool] = Query(
        default=None, description="Lọc theo trạng thái hoạt động"
    ),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = PromotionService(db)
    data, meta = await service.find_all_paginated(page, limit, is_active)
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{promotion_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Chi tiết một chương trình khuyến mãi",
)
async def get_promotion(
    promotion_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin", "leader"])),
):
    service = PromotionService(db)
    data = await service.find_one_or_throw(promotion_id)
    return ApiSuccessResponse(data=data)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Tạo chương trình khuyến mãi mới (Chỉ Admin)",
)
async def create_promotion(
    dto: CreatePromotionDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = PromotionService(db)
    data = await service.create(dto)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{promotion_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Cập nhật chương trình khuyến mãi (Chỉ Admin)",
)
async def update_promotion(
    dto: UpdatePromotionDto,
    promotion_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = PromotionService(db)
    data = await service.update(promotion_id, dto)
    return ApiSuccessResponse(data=data)


@router.delete(
    "/{promotion_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Xóa mềm chương trình khuyến mãi (Chỉ Admin)",
)
async def delete_promotion(
    promotion_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = PromotionService(db)
    data = await service.remove(promotion_id)
    return ApiSuccessResponse(data=data)
