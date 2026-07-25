from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.roles.service import RoleService
from app.modules.auth.dependencies import require_roles
from app.common.schemas import ApiSuccessResponse

router = APIRouter(prefix="/roles", tags=["roles"]) 

@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[list],
    summary="Danh sách role hệ thống (chỉ admin, dùng cho dropdown tạo tài khoản)",
)
async def get_roles(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(["admin"])),
):
    service = RoleService(db)
    data = await service.find_all()
    return ApiSuccessResponse(data=data)