from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user, require_roles
from app.modules.categories.schemas import CreateCategoryDto, UpdateCategoryDto
from app.modules.categories.service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách category (phân trang)",
)
async def get_categories(
    page: int = Query(default=1, ge=1, description="tối thiểu là 1"),
    limit: int = Query(default=10, ge=1, le=100, description="tối đa là 100"),
    search: Optional[str] = Query(default=None, description="Tìm theo tên category"),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = CategoryService(db)
    data, meta = await service.get_categories(page=page, limit=limit, search=search)
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Chi tiết 1 category",
)
async def get_category(
    category_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = CategoryService(db)
    data = await service.get_category_by_id(category_id)
    return ApiSuccessResponse(data=data)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Tạo category mới (chỉ admin)",
)
async def create_category(
    dto: CreateCategoryDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = CategoryService(db)
    data = await service.create_category(dto)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Cập nhật category (chỉ admin)",
)
async def update_category(
    dto: UpdateCategoryDto,
    category_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = CategoryService(db)
    data = await service.update_category(category_id, dto)
    return ApiSuccessResponse(data=data)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Xóa category (soft delete, chỉ admin)",
)
async def delete_category(
    category_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = CategoryService(db)
    data = await service.delete_category(category_id)
    return ApiSuccessResponse(data=data)
