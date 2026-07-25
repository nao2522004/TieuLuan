from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user, require_roles
from app.modules.branches.schemas import CreateBranchDto, UpdateBranchDto
from app.modules.branches.service import BranchService

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách chi nhánh (phân trang)",
)
async def get_branches(
    page: int = Query(default=1, ge=1, description="tối thiểu là 1"),
    limit: int = Query(default=10, ge=1, le=100, description="tối đa là 100"),
    search: Optional[str] = Query(default=None, description="Tìm theo tên chi nhánh"),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = BranchService(db)
    data, meta = await service.get_branches(page=page, limit=limit, search=search)
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{branch_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Chi tiết 1 chi nhánh (kèm bank info)",
)
async def get_branch(
    branch_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = BranchService(db)
    data = await service.get_branch_by_id(branch_id)
    return ApiSuccessResponse(data=data)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiSuccessResponse[dict],
    summary="Tạo chi nhánh mới, kèm bank info (chỉ admin)",
)
async def create_branch(
    dto: CreateBranchDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = BranchService(db)
    data = await service.create_branch(dto)
    return ApiSuccessResponse(data=data)


@router.patch(
    "/{branch_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Cập nhật chi nhánh, bao gồm cả bank info (chỉ admin)",
)
async def update_branch(
    dto: UpdateBranchDto,
    branch_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = BranchService(db)
    data = await service.update_branch(branch_id, dto)
    return ApiSuccessResponse(data=data)


@router.delete(
    "/{branch_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Xóa chi nhánh (soft delete, chỉ admin)",
)
async def delete_branch(
    branch_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = BranchService(db)
    data = await service.delete_branch(branch_id)
    return ApiSuccessResponse(data=data)
