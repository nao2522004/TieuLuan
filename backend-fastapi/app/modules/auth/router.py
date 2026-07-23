from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.auth.schemas import LoginDto, RefreshTokenDto
from app.modules.auth.service import AuthService
from app.common.schemas import ApiSuccessResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Đăng nhập tài khoản"
)
async def login(
    dto: LoginDto,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    
    service = AuthService(db)
    result = await service.login(dto, user_agent=user_agent, ip=ip)
    return ApiSuccessResponse(data=result)

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Đăng xuất - Thu hồi refresh token"
)
async def logout(
    dto: RefreshTokenDto,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    result = await service.logout(dto.refresh_token)
    return ApiSuccessResponse(data=result)

@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Cấp access token mới"
)
async def refresh(
    dto: RefreshTokenDto,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    result = await service.refresh_token(dto.refresh_token)
    return ApiSuccessResponse(data=result)
