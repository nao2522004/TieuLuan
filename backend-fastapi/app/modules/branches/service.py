from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.branches.crud import BranchCRUD
from app.modules.branches.schemas import CreateBranchDto, UpdateBranchDto
from app.core.exceptions import BusinessException


class BranchService:
    def __init__(self, db: AsyncSession):
        self.crud = BranchCRUD(db)

    async def get_branches(
        self, page: int, limit: int, search: Optional[str]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        branches, total_items = await self.crud.get_multi(
            page=page, limit=limit, search=search
        )
        total_pages = ((total_items + limit - 1) // limit) if limit > 0 else 0

        data = [self._to_dto(b) for b in branches]
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return data, meta

    async def get_branch_by_id(self, branch_id: int) -> Dict[str, Any]:
        branch = await self._find_active_or_throw(branch_id)
        return self._to_dto(branch)

    async def create_branch(self, dto: CreateBranchDto) -> Dict[str, Any]:
        branch = await self.crud.create(dto)
        return self._to_dto(branch)

    async def update_branch(
        self, branch_id: int, dto: UpdateBranchDto
    ) -> Dict[str, Any]:
        branch = await self._find_active_or_throw(branch_id)
        updated = await self.crud.update(branch, dto)
        return self._to_dto(updated)

    async def delete_branch(self, branch_id: int) -> Dict[str, str]:
        branch = await self._find_active_or_throw(branch_id)
        await self.crud.soft_delete(branch)
        return {"message": "Xóa chi nhánh thành công."}

    async def _find_active_or_throw(self, branch_id: int):
        branch = await self.crud.get_by_id(branch_id)
        if not branch:
            raise BusinessException(
                error_code="BRANCH_NOT_FOUND",
                status_code=404,
                message="Không tìm thấy chi nhánh.",
            )
        return branch

    def _to_dto(self, b) -> Dict[str, Any]:
        return {
            "id": b.id,
            "name": b.name,
            "address": b.address,
            "phone": b.phone,
            "is_active": b.is_active,
            "bank_bin": b.bank_bin,
            "bank_account_no": b.bank_account_no,
            "bank_account_name": b.bank_account_name,
            "created_at": b.created_at.isoformat(),
            "updated_at": b.updated_at.isoformat(),
        }
