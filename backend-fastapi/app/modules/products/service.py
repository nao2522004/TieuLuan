from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.products.crud import ProductCRUD
from app.modules.products.schemas import CreateProductDto, UpdateProductDto, ProductResponseDto
from app.core.exceptions import BusinessException

class ProductService:
    def __init__(self, db: AsyncSession):
        self.crud = ProductCRUD(db)

    async def get_products(self, page: int = 1, limit: int = 10) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        products, total_items = await self.crud.get_multi(page=page, limit=limit)
        total_pages = (total_items + limit - 1) // limit if limit > 0 else 1

        data = [self._to_dto(p) for p in products]
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages
        }
        return data, meta

    async def get_product_by_id(self, product_id: int) -> Dict[str, Any]:
        product = await self.crud.get_by_id(product_id)
        if not product:
            raise BusinessException(
                error_code="PRODUCT_NOT_FOUND",
                status_code=404,
                message=f"Sản phẩm với ID {product_id} không tồn tại."
            )
        return self._to_dto(product)

    async def create_product(self, dto: CreateProductDto) -> Dict[str, Any]:
        existing = await self.crud.get_by_barcode(dto.barcode)
        if existing:
            raise BusinessException(
                error_code="BARCODE_EXISTS",
                status_code=400,
                message=f"Mã vạch {dto.barcode} đã tồn tại trong hệ thống."
            )
        product = await self.crud.create(dto)
        return self._to_dto(product)

    async def update_product(self, product_id: int, dto: UpdateProductDto) -> Dict[str, Any]:
        product = await self.crud.get_by_id(product_id)
        if not product:
            raise BusinessException(
                error_code="PRODUCT_NOT_FOUND",
                status_code=404,
                message=f"Sản phẩm với ID {product_id} không tồn tại."
            )
        updated = await self.crud.update(product, dto)
        return self._to_dto(updated)

    async def delete_product(self, product_id: int) -> None:
        product = await self.crud.get_by_id(product_id)
        if not product:
            raise BusinessException(
                error_code="PRODUCT_NOT_FOUND",
                status_code=404,
                message=f"Sản phẩm với ID {product_id} không tồn tại."
            )
        await self.crud.soft_delete(product)

    def _to_dto(self, p) -> Dict[str, Any]:
        return {
            "id": p.id,
            "branch_id": p.branch_id,
            "category_id": p.category_id,
            "barcode": p.barcode,
            "name": p.name,
            "unit": p.unit,
            "cost_price": float(p.cost_price),
            "sale_price": float(p.sale_price),
            "stock_quantity": p.stock_quantity,
            "reorder_level": p.reorder_level,
            "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
            "nearest_expiry_date": p.nearest_expiry_date.isoformat() if p.nearest_expiry_date else None,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat()
        }
