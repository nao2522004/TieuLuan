from fastapi import APIRouter, status
from app.common.schemas import ApiSuccessResponse

router = APIRouter(prefix="/health", tags=["health"])

@router.get("", status_code=status.HTTP_200_OK, response_model=ApiSuccessResponse[dict])
async def check_health():
    return ApiSuccessResponse(data={"status": "ok", "service": "backend-fastapi"})
