from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user, require_roles
from app.modules.users.schemas import (
    ChangePasswordDto,
    CreateUserDto,
    ResetPasswordDto,
    UpdateUserDto,
)
from app.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me", status_code=status.HTTP_200_OK, response_model=ApiSuccessResponse[dict]
)
async def me(user: AuthUser = Depends(get_current_user)):
    return ApiSuccessResponse(
        data={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "roles": user.roles,
            "branch_id": user.branch_id,
        }
    )


@router.patch(
    "/me/password",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
)
async def change_own_password(
    dto: ChangePasswordDto,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    service = UserService(db)
    return ApiSuccessResponse(data=await service.change_own_password(user.id, dto))


@router.get("", status_code=status.HTTP_200_OK, response_model=ApiSuccessResponse[list])
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    branch_id: Optional[int] = Query(None, gt=0),
    role_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
):
    service = UserService(db)
    data, meta = await service.find_all_paginated(
        page, limit, branch_id, role_code, is_active, search
    )
    return ApiSuccessResponse(data=data, meta=meta)


@router.get(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
)
async def get_user(
    user_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    return ApiSuccessResponse(data=await service.find_one_or_throw(user_id))


@router.post(
    "", status_code=status.HTTP_201_CREATED, response_model=ApiSuccessResponse[dict]
)
async def create_user(
    dto: CreateUserDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    return ApiSuccessResponse(data=await service.create_by_admin(dto))


@router.patch(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
)
async def update_user(
    dto: UpdateUserDto,
    user_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    return ApiSuccessResponse(
        data=await service.update_by_admin(user_id, dto, current_user.id)
    )


@router.patch(
    "/{user_id}/reset-password",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
)
async def reset_password(
    dto: ResetPasswordDto,
    user_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    return ApiSuccessResponse(data=await service.reset_password_by_admin(user_id, dto))


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
)
async def delete_user(
    user_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    return ApiSuccessResponse(data=await service.remove(user_id))
