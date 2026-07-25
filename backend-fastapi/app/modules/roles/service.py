from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.modules.roles.models import Role
from app.modules.roles.schemas import RoleDto

class RoleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_all(self) -> List[RoleDto]:
        stmt = select(Role).order_by(Role.id.asc())
        rows = (await self.db.execute(stmt)).scalars().all()
        return [RoleDto.model_validate(r) for r in rows]