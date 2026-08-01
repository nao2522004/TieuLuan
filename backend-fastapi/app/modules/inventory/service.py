import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException
from app.modules.auth.dependencies import AuthUser
from app.modules.inventory.crud import InventoryCRUD
from app.modules.inventory.models import InventoryTransaction
from app.modules.inventory.schemas import (
    CreateAdjustmentDto,
    CreateInventoryTransactionDto,
)
from app.modules.products.batch_consumption_service import BatchConsumptionService
from app.modules.products.models import Product
from app.modules.products.service import ProductService
from decimal import Decimal


def _parse_vn_date(value: str, end_of_day: bool) -> datetime:
    if "T" in value:
        return datetime.fromisoformat(value)
    suffix = "T23:59:59+07:00" if end_of_day else "T00:00:00+07:00"
    return datetime.fromisoformat(value + suffix)


class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = InventoryCRUD(db)
        self.batch_service = BatchConsumptionService(db)
        self.product_service = ProductService(db)

    async def create_inbound_transaction(
        self, dto: CreateInventoryTransactionDto, user: AuthUser
    ) -> Dict[str, Any]:
        product = await self._lock_product_or_throw(dto.product_id)
        self._assert_branch_access(
            product,
            user,
            "Bạn không có quyền nhập kho cho sản phẩm thuộc chi nhánh khác.",
        )

        batch = await self.batch_service.receive_batch(
            product_id=dto.product_id,
            quantity=dto.quantity,
            expiry_date=dto.expiry_date,
            unit_cost=dto.unit_cost if dto.unit_cost is not None else Decimal(0),
            created_by=user.id,
            batch_code=dto.batch_code,
        )

        tx = self.crud.build_transaction(
            product_id=dto.product_id,
            type="IN",
            source="INBOUND",
            reason=None,
            quantity=dto.quantity,
            unit_cost=dto.unit_cost,
            note=dto.note,
            batch_id=batch.id,
            created_by=user.id,
        )

        await self.crud.commit_and_refresh(tx)
        await self.product_service.evict_cache_for_product(dto.product_id)

        return await self._to_dto_with_product(tx)

    async def create_adjustment(
        self, dto: CreateAdjustmentDto, user: AuthUser
    ) -> Dict[str, Any]:
        product = await self._lock_product_or_throw(dto.product_id)
        self._assert_branch_access(
            product,
            user,
            "Bạn không có quyền điều chỉnh sản phẩm thuộc chi nhánh khác.",
        )

        if dto.batches:
            # Explicit multi-batch mode: consume each listed batch individually
            consumed: List[ConsumedBatch] = []
            for item in dto.batches:
                result = await self.batch_service.consume_specific_batch(
                    dto.product_id, item.batch_id, item.quantity
                )
                consumed.extend(result)
        elif dto.batch_id:
            consumed = await self.batch_service.consume_specific_batch(
                dto.product_id, dto.batch_id, dto.quantity
            )
        else:
            consumed = await self.batch_service.consume_fefo(
                dto.product_id, dto.quantity
            )

        txs: List[InventoryTransaction] = []
        for c in consumed:
            tx = self.crud.build_transaction(
                product_id=dto.product_id,
                type="OUT",
                source="ADJUSTMENT",
                reason=dto.reason,
                quantity=c["quantity_taken"],
                unit_cost=None,
                note=dto.note,
                batch_id=c["batch_id"],
                created_by=user.id,
            )
            txs.append(tx)

        await self.crud.commit_and_refresh(*txs)
        await self.product_service.evict_cache_for_product(dto.product_id)

        return await self._to_dto_with_product(txs[0])

    async def find_all_paginated(
        self,
        page: int,
        limit: int,
        user: AuthUser,
        product_id: Optional[int] = None,
        type: Optional[str] = None,
        source: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        conditions: list = [Product.deleted_at.is_(None)]

        # Lọc theo chi nhánh nếu không phải admin
        if "admin" not in user.roles:
            conditions.append(Product.branch_id == user.branch_id)

        if product_id is not None:
            conditions.append(InventoryTransaction.product_id == product_id)
        if type:
            conditions.append(InventoryTransaction.type == type)
        if source:
            conditions.append(InventoryTransaction.source == source)
        if start_date:
            conditions.append(
                InventoryTransaction.created_at >= _parse_vn_date(start_date, False)
            )
        if end_date:
            conditions.append(
                InventoryTransaction.created_at <= _parse_vn_date(end_date, True)
            )

        rows, total_items = await self.crud.count_and_list(conditions, page, limit)

        data = [
            self._to_dto(tx, product_name=name, product_barcode=barcode)
            for tx, name, barcode in rows
        ]
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": math.ceil(total_items / limit) if limit else 0,
        }
        return data, meta

    async def _lock_product_or_throw(self, product_id: int) -> Product:
        product = await self.crud.lock_product(product_id)
        if not product:
            raise BusinessException(
                "PRODUCT_NOT_FOUND", 404, "Không tìm thấy sản phẩm."
            )
        return product

    def _assert_branch_access(
        self, product: Product, user: AuthUser, message: str
    ) -> None:
        if "admin" not in user.roles and product.branch_id != user.branch_id:
            raise BusinessException("FORBIDDEN", 403, message)

    async def _to_dto_with_product(self, tx: InventoryTransaction) -> Dict[str, Any]:
        name, barcode = await self.crud.get_product_name_barcode(tx.product_id)
        return self._to_dto(tx, product_name=name, product_barcode=barcode)

    def _to_dto(
        self,
        tx: InventoryTransaction,
        product_name: Optional[str] = None,
        product_barcode: Optional[str] = None,
    ) -> Dict[str, Any]:
        return {
            "id": tx.id,
            "product_id": tx.product_id,
            "product_name": product_name or f"Sản phẩm #{tx.product_id}",
            "product_barcode": product_barcode or "",
            "type": tx.type,
            "source": tx.source,
            "reason": tx.reason,
            "quantity": tx.quantity,
            "unit_cost": float(tx.unit_cost) if tx.unit_cost is not None else None,
            "note": tx.note,
            "batch_id": tx.batch_id,
            "created_by": tx.created_by,
            "created_at": tx.created_at.isoformat(),
        }
