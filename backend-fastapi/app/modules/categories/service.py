from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.categories.crud import CategoryCRUD
from app.modules.categories.schemas import CreateCategoryDto, UpdateCategoryDto
from app.core.exceptions import BusinessException


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.crud = CategoryCRUD(db)

    async def get_categories(
        self, page: int, limit: int, search: Optional[str]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        categories, total_items = await self.crud.get_multi(
            page=page, limit=limit, search=search
        )
        total_pages = ((total_items + limit - 1) // limit) if limit > 0 else 0

        data = [self._to_dto(c) for c in categories]
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return data, meta

    async def get_category_by_id(self, category_id: int) -> Dict[str, Any]:
        category = await self._find_active_or_throw(category_id)
        return self._to_dto(category)

    async def create_category(self, dto: CreateCategoryDto) -> Dict[str, Any]:
        await self._assert_name_not_taken(dto.name)
        category = await self.crud.create(dto)
        return self._to_dto(category)

    async def update_category(
        self, category_id: int, dto: UpdateCategoryDto
    ) -> Dict[str, Any]:
        category = await self._find_active_or_throw(category_id)

        if dto.name is not None and dto.name != category.name:
            await self._assert_name_not_taken(dto.name, exclude_id=category_id)

        updated = await self.crud.update(category, dto)
        return self._to_dto(updated)

    async def delete_category(self, category_id: int) -> Dict[str, str]:
        category = await self._find_active_or_throw(category_id)
        await self.crud.soft_delete(category)
        return {"message": "Xóa category thành công."}

    async def _find_active_or_throw(self, category_id: int):
        category = await self.crud.get_by_id(category_id)
        if not category:
            raise BusinessException(
                error_code="CATEGORY_NOT_FOUND",
                status_code=404,
                message="Không tìm thấy category.",
            )
        return category

    async def _assert_name_not_taken(
        self, name: str, exclude_id: Optional[int] = None
    ) -> None:
        existing = await self.crud.get_by_name(name, exclude_id=exclude_id)
        if existing:
            raise BusinessException(
                error_code="CATEGORY_NAME_DUPLICATE",
                status_code=409,
                message="Tên category đã tồn tại.",
            )

    def _to_dto(self, c) -> Dict[str, Any]:
        return {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
