import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import verify_password, create_access_token
from app.core.exceptions import BusinessException
from app.core.config import settings
from app.modules.users.service import UserService
from app.modules.users.models import User
from app.modules.auth.models import RefreshToken
from app.modules.auth.schemas import LoginDto


def _user_roles(user: User) -> List[str]:
    return [r.code for r in user.roles] if user.roles else []


def _pwd_hash_claim(user: User) -> Optional[str]:
    return user.password_hash[-10:] if user.password_hash else None


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_service = UserService(db)

    async def login(
        self,
        dto: LoginDto,
        user_agent: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> Dict[str, Any]:
        user = await self.user_service.find_by_email(dto.email)

        invalid_credentials = lambda: BusinessException(
            error_code="AUTH_INVALID_CREDENTIALS",
            status_code=401,
            message="Email hoặc mật khẩu không đúng.",
        )

        if not user:
            raise invalid_credentials()

        if not user.is_active:
            raise BusinessException(
                error_code="AUTH_ACCOUNT_DISABLED",
                status_code=401,
                message="Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
            )

        if not verify_password(dto.password, user.password_hash):
            raise invalid_credentials()

        roles = _user_roles(user)

        access_token = create_access_token(
            subject=user.id,
            extra_claims={
                "email": user.email,
                "roles": roles,
                "branchId": user.branch_id,
                "pwdHash": _pwd_hash_claim(user),
            },
        )
        refresh_token = await self._issue_refresh_token(user.id, user_agent, ip)

        return {
            "user": self._to_public_user(user, roles),
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def _issue_refresh_token(
        self, user_id: int, user_agent: Optional[str], ip: Optional[str]
    ) -> str:
        raw_token = secrets.token_hex(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.REFRESH_TOKEN_EXPIRATION
        )

        token_record = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            user_agent=user_agent,
            ip_address=ip,
            expires_at=expires_at,
        )
        self.db.add(token_record)
        await self.db.commit()
        return raw_token

    async def refresh_token(self, raw_refresh_token: str) -> Dict[str, str]:
        token_hash = hashlib.sha256(raw_refresh_token.encode()).hexdigest()
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        res = await self.db.execute(stmt)
        stored = res.scalars().first()

        invalid = lambda: BusinessException(
            error_code="AUTH_INVALID_REFRESH_TOKEN",
            status_code=401,
            message="Refresh token không hợp lệ hoặc đã hết hạn.",
        )

        if (
            not stored
            or stored.revoked_at
            or stored.expires_at < datetime.now(timezone.utc)
        ):
            raise invalid()

        user = await self.user_service.find_by_id(stored.user_id)
        if not user or not user.is_active:
            raise invalid()

        stored.revoked_at = datetime.now(timezone.utc)
        await self.db.commit()

        roles = _user_roles(user)
        new_access_token = create_access_token(
            subject=user.id,
            extra_claims={
                "email": user.email,
                "roles": roles,
                "branchId": user.branch_id,
                "pwdHash": _pwd_hash_claim(user),
            },
        )
        new_refresh_token = await self._issue_refresh_token(user.id, None, None)

        return {"access_token": new_access_token, "refresh_token": new_refresh_token}

    async def logout(self, raw_refresh_token: str) -> Dict[str, str]:
        token_hash = hashlib.sha256(raw_refresh_token.encode()).hexdigest()
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        res = await self.db.execute(stmt)
        stored = res.scalars().first()

        if stored and not stored.revoked_at:
            stored.revoked_at = datetime.now(timezone.utc)
            await self.db.commit()

        return {"message": "Đăng xuất thành công."}

    def _to_public_user(self, user: User, roles: List[str]) -> Dict[str, Any]:
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "roles": roles,
            "is_active": user.is_active,
            "branch_id": user.branch_id,
            "created_at": user.created_at.isoformat(),
        }
