from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.modules.shifts.models import Shift, ShiftUser


class ShiftCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_open_by_branch(self, branch_id: int) -> Optional[Shift]:
        stmt = select(Shift).where(
            Shift.branch_id == branch_id, Shift.closed_at.is_(None)
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def save_new(self, shift: Shift) -> Shift:
        self.db.add(shift)
        await self.db.commit()
        await self.db.refresh(shift)
        return shift

    async def lock_by_id(self, shift_id: int) -> Optional[Shift]:
        stmt = select(Shift).where(Shift.id == shift_id).with_for_update()
        return (await self.db.execute(stmt)).scalars().first()

    async def get_with_users(self, shift_id: int) -> Optional[Shift]:
        stmt = (
            select(Shift)
            .where(Shift.id == shift_id)
            .options(selectinload(Shift.shift_users).selectinload(ShiftUser.user))
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def save(self, shift: Shift) -> Shift:
        await self.db.commit()
        await self.db.refresh(shift)
        return shift

    async def count_users_in_shift(self, user_id: int, shift_id: int) -> int:
        stmt = select(func.count(ShiftUser.id)).where(
            ShiftUser.shift_id == shift_id, ShiftUser.user_id == user_id
        )
        return (await self.db.execute(stmt)).scalar_one()

    async def count_and_list(
        self, conditions: list, page: int, limit: int
    ) -> Tuple[List[Shift], int]:
        count_stmt = select(func.count(Shift.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Shift)
            .where(*conditions)
            .options(selectinload(Shift.shift_users).selectinload(ShiftUser.user))
            .order_by(Shift.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().unique().all()
        return list(rows), total_items
