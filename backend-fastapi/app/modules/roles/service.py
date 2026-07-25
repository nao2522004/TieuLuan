from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.modules.roles.models import Role
from app.modules.roles.schemas import RoleDto


def _to_iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class RoleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_all(self) -> List[RoleDto]:
        stmt = select(Role).order_by(Role.id.asc())
        rows = (await self.db.execute(stmt)).scalars().all()
        return [
            RoleDto(
                id=r.id,
                code=r.code,
                name=r.name,
                description=r.description,
                createdAt=_to_iso_z(r.created_at),
                updatedAt=_to_iso_z(r.updated_at),
            )
            for r in rows
        ]