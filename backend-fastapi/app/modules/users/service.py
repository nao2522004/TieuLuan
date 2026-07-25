from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException
from app.core.security import get_password_hash, verify_password
from app.modules.auth.models import RefreshToken
from app.modules.branches.models import Branch
from app.modules.roles.models import Role
from app.modules.shifts.models import Shift, ShiftUser
from app.modules.users.models import User


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
        return (await self.db.execute(stmt)).scalars().first()

    async def find_by_id(self, user_id: int) -> Optional[User]:
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        return (await self.db.execute(stmt)).scalars().first()

    async def find_by_ids(self, ids: List[int]) -> List[User]:
        if not ids:
            return []
        stmt = select(User).where(User.id.in_(ids), User.deleted_at.is_(None))
        return list((await self.db.execute(stmt)).scalars().unique().all())

    async def find_names_by_ids(self, ids: List[int]) -> Dict[int, str]:
        unique_ids = list({i for i in ids if i is not None})
        if not unique_ids:
            return {}
        stmt = select(User.id, User.full_name).where(User.id.in_(unique_ids))
        rows = (await self.db.execute(stmt)).all()
        return {r.id: r.full_name for r in rows}

    # ---- CRUD chính ----
    async def find_all_paginated(
        self,
        page: int,
        limit: int,
        branch_id: Optional[int],
        role_code: Optional[str],
        is_active: Optional[bool],
        search: Optional[str],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        stmt = select(User).where(User.deleted_at.is_(None))

        if branch_id is not None:
            stmt = stmt.where(User.branch_id == branch_id)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        if role_code:
            stmt = stmt.where(User.roles.any(Role.code == role_code))
        if search:
            trimmed = search.strip()
            if trimmed.isdigit():
                stmt = stmt.where(User.id == int(trimmed))
            else:
                stmt = stmt.where(User.full_name.ilike(f"%{trimmed}%"))

        total_items = (
            await self.db.execute(select(func.count()).select_from(stmt.subquery()))
        ).scalar_one()

        stmt = stmt.order_by(User.id.asc()).offset((page - 1) * limit).limit(limit)
        rows = (await self.db.execute(stmt)).scalars().unique().all()
        total_pages = (total_items + limit - 1) // limit if limit > 0 else 0

        return [self._to_dto(u) for u in rows], {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        }

    async def find_one_or_throw(self, user_id: int) -> Dict[str, Any]:
        return self._to_dto(await self._find_active_or_throw(user_id))

    async def create_by_admin(self, dto) -> Dict[str, Any]:
        await self._assert_email_not_taken(dto.email)
        if dto.branch_id is not None:
            await self._assert_branch_exists(dto.branch_id)

        codes = dto.role_codes if dto.role_codes else ["cashier"]
        roles = await self._resolve_roles_or_throw(codes)

        user = User(
            full_name=dto.full_name,
            email=dto.email,
            password_hash=get_password_hash(dto.password),
            branch_id=dto.branch_id,
            role_id=roles[0].id,
            is_active=True,
        )
        user.roles = roles
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user, attribute_names=["roles"])

        return self._to_dto(user)

    async def update_by_admin(
        self, user_id: int, dto, current_user_id: int
    ) -> Dict[str, Any]:
        user = await self._find_active_or_throw(user_id)
        is_self = user.id == current_user_id

        if dto.role_codes is not None and is_self:
            if sorted(r.code for r in user.roles) != sorted(dto.role_codes):
                raise BusinessException(
                    "USER_CANNOT_CHANGE_OWN_ROLE",
                    400,
                    "Không thể tự thay đổi vai trò của chính mình.",
                )

        if dto.is_active is False and is_self:
            raise BusinessException(
                "USER_CANNOT_LOCK_SELF",
                400,
                "Không thể tự khóa tài khoản của chính mình.",
            )

        if dto.full_name is not None:
            user.full_name = dto.full_name
        if dto.branch_id is not None:
            await self._assert_branch_exists(dto.branch_id)
            user.branch_id = dto.branch_id

        was_active = user.is_active
        if dto.is_active is not None:
            user.is_active = dto.is_active

        if dto.role_codes is not None:
            new_roles = await self._resolve_roles_or_throw(dto.role_codes)
            user.roles = new_roles
            user.role_id = new_roles[0].id if new_roles else None

        await self.db.commit()

        if was_active and dto.is_active is False:
            await self._revoke_all_refresh_tokens(user_id)

        await self.db.refresh(user, attribute_names=["roles"])
        return self._to_dto(user)

    async def remove(self, user_id: int) -> Dict[str, str]:
        await self._find_active_or_throw(user_id)

        open_as_leader = (
            await self.db.execute(
                select(Shift.id).where(
                    Shift.user_id == user_id, Shift.closed_at.is_(None)
                )
            )
        ).first()
        open_as_cashier = (
            await self.db.execute(
                select(ShiftUser.id)
                .join(Shift, Shift.id == ShiftUser.shift_id)
                .where(ShiftUser.user_id == user_id, Shift.closed_at.is_(None))
            )
        ).first()

        if open_as_leader or open_as_cashier:
            raise BusinessException(
                "USER_HAS_OPEN_SHIFT",
                409,
                "Không thể xóa nhân viên đang có ca làm việc chưa đóng.",
            )

        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(deleted_at=datetime.now(timezone.utc), is_active=False)
        )
        await self.db.commit()
        await self._revoke_all_refresh_tokens(user_id)

        return {"message": "Xóa nhân viên thành công."}

    async def change_own_password(self, user_id: int, dto) -> Dict[str, str]:
        user = await self._find_active_or_throw(user_id)

        if not verify_password(dto.old_password, user.password_hash):
            raise BusinessException(
                "AUTH_INVALID_OLD_PASSWORD", 401, "Mật khẩu cũ không đúng."
            )

        user.password_hash = get_password_hash(dto.new_password)
        await self.db.commit()
        await self._revoke_all_refresh_tokens(user_id)

        return {
            "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."
        }

    async def reset_password_by_admin(self, user_id: int, dto) -> Dict[str, str]:
        user = await self._find_active_or_throw(user_id)

        user.password_hash = get_password_hash(dto.new_password)
        await self.db.commit()
        await self._revoke_all_refresh_tokens(user_id)

        return {
            "message": "Reset mật khẩu thành công. Mọi phiên đăng nhập cũ của nhân viên này đã bị vô hiệu hóa."
        }

    # ---- helpers ----
    async def _find_active_or_throw(self, user_id: int) -> User:
        user = await self.find_by_id(user_id)
        if not user:
            raise BusinessException("USER_NOT_FOUND", 404, "Không tìm thấy nhân viên.")
        return user

    async def _assert_email_not_taken(self, email: str) -> None:
        existing = (
            await self.db.execute(select(User.id).where(User.email == email))
        ).first()
        if existing:
            raise BusinessException(
                "USER_EMAIL_DUPLICATE", 409, "Email đã được sử dụng."
            )

    async def _assert_branch_exists(self, branch_id: int) -> None:
        existing = (
            await self.db.execute(
                select(Branch.id).where(
                    Branch.id == branch_id, Branch.deleted_at.is_(None)
                )
            )
        ).first()
        if not existing:
            raise BusinessException(
                "BRANCH_NOT_FOUND", 404, "Không tìm thấy chi nhánh."
            )

    async def _resolve_roles_or_throw(self, codes: List[str]) -> List[Role]:
        unique_codes = list(set(codes))
        roles = list(
            (
                await self.db.execute(select(Role).where(Role.code.in_(unique_codes)))
            ).scalars()
        )
        found = {r.code for r in roles}
        missing = [c for c in unique_codes if c not in found]
        if missing:
            raise BusinessException(
                "ROLE_NOT_FOUND", 400, f"Không tìm thấy role: {', '.join(missing)}."
            )
        return roles

    async def _revoke_all_refresh_tokens(self, user_id: int) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.db.commit()

    def _to_dto(self, user: User) -> Dict[str, Any]:
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "roles": [r.code for r in user.roles] if user.roles else [],
            "branch_id": user.branch_id,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
        }
