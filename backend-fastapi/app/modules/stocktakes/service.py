import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException
from app.modules.auth.dependencies import AuthUser
from app.modules.branches.models import Branch
from app.modules.inventory.models import InventoryTransaction
from app.modules.products.batch_consumption_service import BatchConsumptionService
from app.modules.products.models import Product, ProductBatch
from app.modules.products.service import ProductService
from app.modules.stocktakes.crud import StocktakeCRUD
from app.modules.stocktakes.models import Stocktake, StocktakeItem
from app.modules.stocktakes.schemas import CreateStocktakeDto, CreateStocktakeItemDto
from app.modules.users.service import UserService


class StocktakesService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = StocktakeCRUD(db)
        self.batch_service = BatchConsumptionService(db)
        self.product_service = ProductService(db)
        self.user_service = UserService(db)

    async def create(self, dto: CreateStocktakeDto, user: AuthUser) -> Dict[str, Any]:
        branch_id = dto.branch_id if dto.branch_id is not None else user.branch_id
        if not branch_id:
            raise BusinessException(
                "STOCKTAKE_BRANCH_REQUIRED",
                400,
                "branch_id: bắt buộc khi tài khoản không gắn với 1 chi nhánh cụ thể",
            )

        if "admin" not in user.roles and branch_id != user.branch_id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Bạn không có quyền mở phiên kiểm kê cho chi nhánh khác.",
            )

        existing = await self.crud.get_open_by_branch(branch_id)
        if existing:
            raise BusinessException(
                "STOCKTAKE_ALREADY_OPEN",
                400,
                "Chi nhánh này đang có một phiên kiểm kê chưa đóng.",
            )

        stocktake = await self.crud.create(branch_id, user.id, dto.note)
        return self._to_dto(stocktake)

    async def record_item(
        self, stocktake_id: int, dto: CreateStocktakeItemDto, user: AuthUser
    ) -> Dict[str, Any]:
        stocktake = await self.crud.lock_by_id(stocktake_id)
        stocktake = self._assert_open_and_access(
            stocktake, user, closed_message="Phiên kiểm kê đã đóng."
        )

        product = await self._get_active_product_or_throw(dto.product_id)

        if product.branch_id != stocktake.branch_id:
            raise BusinessException(
                "PRODUCT_BRANCH_MISMATCH",
                400,
                "Sản phẩm không thuộc chi nhánh của phiên kiểm kê.",
            )

        difference = dto.counted_quantity - product.stock_quantity

        row = await self.crud.upsert_item(
            stocktake_id,
            dto.product_id,
            product.stock_quantity,
            dto.counted_quantity,
            difference,
        )
        stocktake_item_id: int = row["id"]

        # Lưu chi tiết từng lô nếu client gửi batch_counts
        if dto.batch_counts and len(dto.batch_counts) > 0:
            await self._upsert_item_batches(
                stocktake_item_id=stocktake_item_id,
                product_id=dto.product_id,
                batch_counts=dto.batch_counts,
            )

        await self.db.commit()

        return self._row_to_item_dto(row)

    async def record_items_bulk(
        self, stocktake_id: int, dtos: List[CreateStocktakeItemDto], user: AuthUser
    ) -> List[Dict[str, Any]]:
        stocktake = await self.crud.lock_by_id(stocktake_id)
        stocktake = self._assert_open_and_access(
            stocktake, user, closed_message="Phiên kiểm kê đã đóng."
        )

        results: List[Dict[str, Any]] = []

        for dto in dtos:
            product_stmt = select(Product).where(
                Product.id == dto.product_id, Product.deleted_at.is_(None)
            )
            product = (await self.db.execute(product_stmt)).scalars().first()

            # Bỏ qua nếu sản phẩm không tồn tại hoặc không cùng chi nhánh phiên kiểm kê
            if not product or product.branch_id != stocktake.branch_id:
                continue

            difference = dto.counted_quantity - product.stock_quantity

            row = await self.crud.upsert_item(
                stocktake_id,
                dto.product_id,
                product.stock_quantity,
                dto.counted_quantity,
                difference,
            )
            stocktake_item_id: int = row["id"]

            # Lưu chi tiết từng lô nếu client gửi batch_counts
            if dto.batch_counts and len(dto.batch_counts) > 0:
                await self._upsert_item_batches(
                    stocktake_item_id=stocktake_item_id,
                    product_id=dto.product_id,
                    batch_counts=dto.batch_counts,
                )

            results.append(self._row_to_item_dto(row))

        await self.db.commit()
        return results

    async def remove_item(
        self, stocktake_id: int, item_id: int, user: AuthUser
    ) -> None:
        stocktake = await self.crud.lock_by_id(stocktake_id)
        stocktake = self._assert_open_and_access(
            stocktake,
            user,
            closed_message="Phiên kiểm kê đã đóng, không thể xóa dòng đếm.",
        )

        item = await self.crud.get_item_by_id(stocktake_id, item_id)
        if not item:
            raise BusinessException(
                "STOCKTAKE_ITEM_NOT_FOUND",
                404,
                "Không tìm thấy dòng đếm này trong phiên kiểm kê.",
            )

        await self.crud.delete_item(item)

    async def close(self, stocktake_id: int, user: AuthUser) -> Dict[str, Any]:
        skipped_items: List[Dict[str, Any]] = []

        stocktake = await self.crud.lock_by_id(stocktake_id)
        stocktake = self._assert_open_and_access(
            stocktake,
            user,
            closed_message="Phiên kiểm kê đã đóng.",
            forbidden_message="Bạn không có quyền chốt phiên kiểm kê của chi nhánh khác.",
        )

        items = await self.crud.get_items(stocktake_id)
        sorted_items = sorted(items, key=lambda i: i.product_id)

        for item in sorted_items:
            product_stmt = (
                select(Product).where(Product.id == item.product_id).with_for_update()
            )
            product = (await self.db.execute(product_stmt)).scalars().first()

            if not product or product.deleted_at:
                skipped_items.append(
                    {
                        "product_id": item.product_id,
                        "reason": (
                            "Sản phẩm đã bị xóa (hoặc không còn tồn tại) sau khi đếm — "
                            "bỏ qua điều chỉnh tồn kho cho dòng này."
                        ),
                    }
                )
                continue

            if item.difference == 0:
                continue

            note = (
                f"Phiên kiểm kê #{stocktake.id}: {stocktake.note}"
                if stocktake.note
                else f"Phiên kiểm kê #{stocktake.id}"
            )

            # Tải chi tiết lô nếu người kiểm kê đã gửi batch_counts
            batch_details = await self.crud.get_item_batches(item.id)

            if batch_details:
                # === Chế độ chính xác theo từng lô ===
                for bd in batch_details:
                    if bd.difference == 0:
                        continue

                    if bd.difference < 0:
                        # Lô này thiếu — trừ đúng lô đó
                        consumed = await self.batch_service.consume_specific_batch(
                            item.product_id, bd.batch_id, abs(bd.difference)
                        )
                        for c in consumed:
                            self.db.add(
                                InventoryTransaction(
                                    product_id=item.product_id,
                                    type="OUT",
                                    source="STOCKTAKE",
                                    reason=f"Chênh lệch kiểm kê (phiên #{stocktake.id})",
                                    quantity=c["quantity_taken"],
                                    unit_cost=None,
                                    batch_id=c["batch_id"],
                                    note=note,
                                    created_by=user.id,
                                )
                            )
                    else:
                        # Lô này thừa — nhập thêm vào chính lô đó
                        batch_stmt = (
                            select(ProductBatch)
                            .where(ProductBatch.id == bd.batch_id)
                            .with_for_update()
                        )
                        existing_batch = (await self.db.execute(batch_stmt)).scalars().first()
                        if existing_batch:
                            existing_batch.quantity_remaining += bd.difference
                            # Cập nhật stock_quantity trên Product
                            prod_stmt = (
                                select(Product)
                                .where(Product.id == item.product_id)
                                .with_for_update()
                            )
                            prod = (await self.db.execute(prod_stmt)).scalars().first()
                            if prod:
                                prod.stock_quantity += bd.difference
                                await self.batch_service._refresh_nearest_expiry(prod)
                            self.db.add(
                                InventoryTransaction(
                                    product_id=item.product_id,
                                    type="IN",
                                    source="STOCKTAKE",
                                    reason=f"Chênh lệch kiểm kê (phiên #{stocktake.id})",
                                    quantity=bd.difference,
                                    unit_cost=None,
                                    batch_id=existing_batch.id,
                                    note=note,
                                    created_by=user.id,
                                )
                            )
            else:
                # === Fallback: FEFO mù (không có batch_counts) — backward compat ===
                if item.difference < 0:
                    consumed = await self.batch_service.consume_fefo(
                        item.product_id, abs(item.difference)
                    )
                    for c in consumed:
                        self.db.add(
                            InventoryTransaction(
                                product_id=item.product_id,
                                type="OUT",
                                source="STOCKTAKE",
                                reason=f"Chênh lệch kiểm kê (phiên #{stocktake.id})",
                                quantity=c["quantity_taken"],
                                unit_cost=None,
                                batch_id=c["batch_id"],
                                note=note,
                                created_by=user.id,
                            )
                        )
                else:
                    batch = await self.batch_service.receive_batch(
                        product_id=item.product_id,
                        quantity=item.difference,
                        expiry_date=None,
                        unit_cost=Decimal("0"),
                        created_by=user.id,
                        batch_code=f"LÔ-KIỂMKÊ-{stocktake.id}-{item.product_id}",
                    )
                    self.db.add(
                        InventoryTransaction(
                            product_id=item.product_id,
                            type="IN",
                            source="STOCKTAKE",
                            reason=f"Chênh lệch kiểm kê (phiên #{stocktake.id})",
                            quantity=item.difference,
                            unit_cost=None,
                            batch_id=batch.id,
                            note=note,
                            created_by=user.id,
                        )
                    )

        stocktake.status = "closed"
        stocktake.closed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(stocktake)

        # Side-effect (evict cache) SAU KHI transaction
        for item in items:
            try:
                await self.product_service.evict_cache_for_product(item.product_id)
            except Exception:
                pass

        dto = await self.find_one(stocktake.id, user)
        if skipped_items:
            dto["skipped_items"] = skipped_items
        return dto

    # ---------------------------------------------------------------- #
    # Chi tiết 1 phiên kiểm kê
    # ---------------------------------------------------------------- #
    async def find_one(self, stocktake_id: int, user: AuthUser) -> Dict[str, Any]:
        stocktake = await self.crud.get_by_id(stocktake_id)
        if not stocktake:
            raise BusinessException(
                "STOCKTAKE_NOT_FOUND", 404, "Không tìm thấy phiên kiểm kê."
            )

        if "admin" not in user.roles and stocktake.branch_id != user.branch_id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Bạn không có quyền xem thông tin phiên kiểm kê của chi nhánh khác.",
            )

        items = await self.crud.get_items(stocktake_id)
        product_ids = [i.product_id for i in items]

        product_map: Dict[int, Product] = {}
        item_batches_map: Dict[int, List[Dict[str, Any]]] = {}

        if product_ids:
            products = (
                (
                    await self.db.execute(
                        select(Product).where(Product.id.in_(product_ids))
                    )
                )
                .scalars()
                .all()
            )
            for p in products:
                product_map[p.id] = p

            batch_rows = (
                await self.db.execute(
                    select(
                        ProductBatch.product_id,
                        ProductBatch.id.label("batch_id"),
                        ProductBatch.batch_code,
                        ProductBatch.expiry_date,
                        ProductBatch.quantity_remaining,
                    ).where(
                        ProductBatch.product_id.in_(product_ids),
                        ProductBatch.quantity_remaining > 0,
                    )
                )
            ).all()
            for row in batch_rows:
                item_batches_map.setdefault(row.product_id, []).append(
                    {
                        "batch_id": row.batch_id,
                        "batch_code": row.batch_code,
                        "expiry_date": (
                            row.expiry_date.isoformat() if row.expiry_date else None
                        ),
                        "quantity_remaining": row.quantity_remaining,
                    }
                )

        item_adjustments_map: Dict[int, List[Dict[str, Any]]] = {}

        if stocktake.status == "closed":
            tx_rows = (
                await self.db.execute(
                    select(
                        InventoryTransaction.product_id,
                        InventoryTransaction.type,
                        InventoryTransaction.quantity,
                        ProductBatch.batch_code,
                        ProductBatch.expiry_date,
                    )
                    .outerjoin(
                        ProductBatch, ProductBatch.id == InventoryTransaction.batch_id
                    )
                    .where(
                        InventoryTransaction.source == "STOCKTAKE",
                        InventoryTransaction.reason.like(f"%phiên #{stocktake_id}%"),
                    )
                )
            ).all()
            for row in tx_rows:
                item_adjustments_map.setdefault(row.product_id, []).append(
                    {
                        "batch_code": row.batch_code
                        or f"LÔ-KIỂMKÊ-{stocktake_id}-{row.product_id}",
                        "expiry_date": (
                            row.expiry_date.isoformat() if row.expiry_date else None
                        ),
                        "type": row.type,
                        "quantity": row.quantity,
                    }
                )

        branch_names = await self._find_branch_names([stocktake.branch_id])
        user_names = await self.user_service.find_names_by_ids([stocktake.created_by])

        return self._to_dto(
            stocktake,
            items,
            product_map,
            item_batches_map,
            item_adjustments_map,
            branch_names.get(stocktake.branch_id),
            user_names.get(stocktake.created_by),
        )

    async def find_all(
        self,
        page: int,
        limit: int,
        user: AuthUser,
        branch_id: Optional[int],
        status_filter: Optional[str],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        conditions: list = []

        if "admin" not in user.roles:
            conditions.append(Stocktake.branch_id == user.branch_id)
        elif branch_id:
            conditions.append(Stocktake.branch_id == branch_id)

        if status_filter:
            conditions.append(Stocktake.status == status_filter)

        rows, total_items = await self.crud.count_and_list(conditions, page, limit)

        branch_ids = list({r.branch_id for r in rows})
        user_ids = list({r.created_by for r in rows})
        branch_names = await self._find_branch_names(branch_ids)
        user_names = await self.user_service.find_names_by_ids(user_ids)

        data = [
            self._to_dto(
                row,
                branch_name=branch_names.get(row.branch_id),
                creator_name=user_names.get(row.created_by),
            )
            for row in rows
        ]

        total_pages = math.ceil(total_items / limit) if limit else 0
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return data, meta

    def _assert_open_and_access(
        self,
        stocktake: Optional[Stocktake],
        user: AuthUser,
        closed_message: str,
        forbidden_message: str = "Bạn không có quyền thao tác trên phiên kiểm kê của chi nhánh khác.",
    ) -> Stocktake:
        if stocktake is None:
            raise BusinessException(
                "STOCKTAKE_NOT_FOUND", 404, "Không tìm thấy phiên kiểm kê."
            )
        if stocktake.status != "open":
            raise BusinessException("STOCKTAKE_CLOSED", 400, closed_message)
        if "admin" not in user.roles and stocktake.branch_id != user.branch_id:
            raise BusinessException("FORBIDDEN", 403, forbidden_message)
        return stocktake

    async def _get_active_product_or_throw(self, product_id: int) -> Product:
        stmt = select(Product).where(
            Product.id == product_id, Product.deleted_at.is_(None)
        )
        product = (await self.db.execute(stmt)).scalars().first()
        if not product:
            raise BusinessException(
                "PRODUCT_NOT_FOUND",
                404,
                "Không tìm thấy sản phẩm hoặc sản phẩm đã bị xóa.",
            )
        return product

    async def _find_branch_names(self, branch_ids: List[int]) -> Dict[int, str]:
        unique_ids = list({i for i in branch_ids if i is not None})
        if not unique_ids:
            return {}
        rows = (
            await self.db.execute(
                select(Branch.id, Branch.name).where(Branch.id.in_(unique_ids))
            )
        ).all()
        return {r.id: r.name for r in rows}

    @staticmethod
    def _row_to_item_dto(row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "stocktake_id": row["stocktake_id"],
            "product_id": row["product_id"],
            "system_quantity": row["system_quantity"],
            "counted_quantity": row["counted_quantity"],
            "difference": row["difference"],
        }

    def _to_dto(
        self,
        s: Stocktake,
        items: Optional[List[StocktakeItem]] = None,
        product_map: Optional[Dict[int, Product]] = None,
        item_batches_map: Optional[Dict[int, List[Dict[str, Any]]]] = None,
        item_adjustments_map: Optional[Dict[int, List[Dict[str, Any]]]] = None,
        branch_name: Optional[str] = None,
        creator_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "id": s.id,
            "branch_id": s.branch_id,
            "branch_name": branch_name,
            "created_by": s.created_by,
            "creator_name": creator_name,
            "status": s.status,
            "note": s.note,
            "created_at": s.created_at.isoformat(),
            "closed_at": s.closed_at.isoformat() if s.closed_at else None,
        }
        if items is not None:
            result["items"] = [
                self._item_to_dto(
                    it,
                    (product_map or {}).get(it.product_id),
                    (item_batches_map or {}).get(it.product_id),
                    (item_adjustments_map or {}).get(it.product_id),
                )
                for it in items
            ]
        return result

    @staticmethod
    def _item_to_dto(
        it: StocktakeItem,
        product: Optional[Product] = None,
        batches: Optional[List[Dict[str, Any]]] = None,
        adjustments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        return {
            "id": it.id,
            "stocktake_id": it.stocktake_id,
            "product_id": it.product_id,
            "product_name": product.name if product else None,
            "product_barcode": product.barcode if product else None,
            "unit": product.unit if product else None,
            "system_quantity": it.system_quantity,
            "counted_quantity": it.counted_quantity,
            "difference": it.difference,
            "batches": batches or [],
            "batch_adjustments": adjustments or [],
        }

    async def _upsert_item_batches(
        self,
        stocktake_item_id: int,
        product_id: int,
        batch_counts: List[Any],
    ) -> None:
        """
        Xác minh từng lô thuộc đúng sản phẩm, lấy system_quantity hiện tại,
        rồi upsert vào stocktake_item_batches.
        Bỏ qua lô không thuộc sản phẩm để tránh dữ liệu lạ.
        """
        enriched: List[Dict[str, Any]] = []
        for bc in batch_counts:
            batch_id = bc.batch_id if hasattr(bc, "batch_id") else bc["batch_id"]
            counted_qty = (
                bc.counted_quantity
                if hasattr(bc, "counted_quantity")
                else bc["counted_quantity"]
            )
            batch_stmt = (
                select(ProductBatch).where(
                    ProductBatch.id == batch_id,
                    ProductBatch.product_id == product_id,
                    ProductBatch.deleted_at.is_(None),
                )
            )
            batch = (await self.db.execute(batch_stmt)).scalars().first()
            if not batch:
                # Bỏ qua lô không thuộc sản phẩm này
                continue
            enriched.append(
                {
                    "batch_id": batch_id,
                    "system_quantity": batch.quantity_remaining,
                    "counted_quantity": counted_qty,
                }
            )

        if enriched:
            await self.crud.upsert_item_batches(
                stocktake_item_id=stocktake_item_id,
                product_id=product_id,
                batch_counts=enriched,
            )
