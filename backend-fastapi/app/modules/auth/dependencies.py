from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_jwt_token
from app.core.exceptions import BusinessException

security = HTTPBearer()

async def get_current_user_payload(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI Guard / Dependency xác thực Bearer JWT Token."""
    token = credentials.credentials
    payload = decode_jwt_token(token)
    if not payload or payload.get("type") != "access":
        raise BusinessException(
            error_code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Token không hợp lệ hoặc đã hết hạn."
        )
    return payload
