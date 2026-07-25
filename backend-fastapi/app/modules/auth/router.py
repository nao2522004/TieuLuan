from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.schemas import (
    LoginDto,
    RefreshTokenDto,
    LoginDataDto,
    RefreshResultDto,
    MessageResultDto,
)
from app.modules.auth.service import AuthService
from app.modules.auth.rate_limit import login_rate_limiter
from app.common.schemas import ApiSuccessResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[LoginDataDto],
    summary="Đăng nhập - dùng luôn tài khoản seed sẵn để test",
    dependencies=[Depends(login_rate_limiter)],
)
async def login(dto: LoginDto, request: Request, db: AsyncSession = Depends(get_db)):
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None

    service = AuthService(db)
    result = await service.login(dto, user_agent=user_agent, ip=ip)
    return ApiSuccessResponse(data=result)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[MessageResultDto],
    summary="Đăng xuất - thu hồi refresh token hiện tại",
)
async def logout(dto: RefreshTokenDto, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.logout(dto.refresh_token)
    return ApiSuccessResponse(data=result)


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[RefreshResultDto],
    summary="Cấp access token mới từ refresh token",
)
async def refresh(dto: RefreshTokenDto, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.refresh_token(dto.refresh_token)
    return ApiSuccessResponse(data=result)
