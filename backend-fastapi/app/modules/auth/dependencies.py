from typing import List, Optional
from fastapi import Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_jwt_token
from app.core.exceptions import BusinessException
from app.db.session import get_db
from app.modules.users.service import UserService

security = HTTPBearer()


class AuthUser:
    def __init__(self, id: int, email: str, full_name: str, roles: List[str], branch_id: Optional[int]):
        self.id = id
        self.email = email
        self.full_name = full_name
        self.roles = roles
        self.branch_id = branch_id


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> AuthUser:
    token = credentials.credentials
    payload = decode_jwt_token(token)
    if not payload or payload.get("type") != "access":
        raise BusinessException("UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED, "Thiếu hoặc sai access token.")

    user_id = payload.get("sub")
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise BusinessException("UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED, "Thiếu hoặc sai access token.")

    user_service = UserService(db)
    user = await user_service.find_by_id(user_id)
    if not user or not user.is_active:
        raise BusinessException("UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED, "Thiếu hoặc sai access token.")
    pwd_hash_claim = payload.get("pwdHash")
    if pwd_hash_claim and user.password_hash and pwd_hash_claim != user.password_hash[-10:]:
        raise BusinessException("UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED, "Thiếu hoặc sai access token.")

    roles = [r.code for r in user.roles] if user.roles else []
    return AuthUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        roles=roles,
        branch_id=user.branch_id,
    )


def require_roles(allowed_roles: List[str]):
    async def _checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if not any(r in user.roles for r in allowed_roles):
            raise BusinessException(
                "FORBIDDEN", status.HTTP_403_FORBIDDEN, "Bạn không có quyền thực hiện hành động này."
            )
        return user

    return _checker

get_current_user_payload = get_current_user