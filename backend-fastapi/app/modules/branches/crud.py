from typing import List, Optional, Tuple
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.modules.branches.models import Branch
from app.modules.branches.schemas import CreateBranchDto, UpdateBranchDto


class BranchCRUD:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, branch_id: int) -> Optional[Branch]:
        stmt = select(Branch).where(Branch.id == branch_id, Branch.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_multi(
        self, page: int, limit: int, search: Optional[str]
    ) -> Tuple[List[Branch], int]:
        offset = (page - 1) * limit
        conditions = [Branch.deleted_at.is_(None)]
        if search:
            conditions.append(Branch.name.ilike(f"%{search}%"))

        count_stmt = select(func.count(Branch.id)).where(*conditions)
        total_items = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Branch)
            .where(*conditions)
            .order_by(Branch.id.asc())
            .offset(offset)
            .limit(limit)
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total_items

    async def create(self, dto: CreateBranchDto) -> Branch:
        branch = Branch(
            name=dto.name,
            address=dto.address,
            phone=dto.phone,
            is_active=dto.is_active if dto.is_active is not None else True,
            bank_bin=dto.bank_bin,
            bank_account_no=dto.bank_account_no,
            bank_account_name=dto.bank_account_name,
        )
        self.db.add(branch)
        await self.db.commit()
        await self.db.refresh(branch)
        return branch

    async def update(self, branch: Branch, dto: UpdateBranchDto) -> Branch:
        update_data = dto.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(branch, key, value)
        await self.db.commit()
        await self.db.refresh(branch)
        return branch

    async def soft_delete(self, branch: Branch) -> None:
        branch.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
