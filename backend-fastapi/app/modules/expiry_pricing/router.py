from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user, require_roles
from app.modules.expiry_pricing.schemas import (
    CreateExpiryDiscountRuleDto,
    UpdateExpiryDiscountRuleDto,
)
from app.modules.expiry_pricing.service import ExpiryPricingService

router = APIRouter(prefix="/expiry-discount-rules", tags=["expiry-pricing"])


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách quy tắc giảm giá theo hạn dùng (mọi user đã đăng nhập đều xem được)",
)
async def get_rules(
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = ExpiryPricingService(db)
    data = await service.find_all()
    return ApiSuccessResponse(data=data)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Tạo quy tắc giảm giá cận hạn mới (chỉ admin)",
)
async def create_rule(
    dto: CreateExpiryDiscountRuleDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = ExpiryPricingService(db)
    data = await service.create(dto)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{rule_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Cập nhật quy tắc (chỉ admin)",
)
async def update_rule(
    dto: UpdateExpiryDiscountRuleDto,
    rule_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = ExpiryPricingService(db)
    data = await service.update(rule_id, dto)
    return ApiSuccessResponse(data=data)


@router.delete(
    "/{rule_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Xóa mềm quy tắc (chỉ admin)",
)
async def delete_rule(
    rule_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = ExpiryPricingService(db)
    data = await service.remove(rule_id)
    return ApiSuccessResponse(data=data)
