import json
import math
import random
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.common.redis import RedisService, get_redis
from app.core.config import settings
from app.core.exceptions import BusinessException
from app.modules.auth.dependencies import AuthUser
from app.modules.branches.crud import BranchCRUD
from app.modules.categories.crud import CategoryCRUD
from app.modules.expiry_pricing.service import ExpiryPricingService
from app.modules.products.batch_consumption_service import BatchConsumptionService
from app.modules.products.crud import ProductCRUD
from app.modules.products.models import Product, ProductBatch
from app.modules.products.schemas import (
    CreateProductDto,
    UpdateProductBatchDto,
    UpdateProductDto,
)

CACHE_PREFIX = "products"


class ProductService:
    def __init__(self, db: AsyncSession, redis: Optional[RedisService] = None):
        self.db = db
        self.crud = ProductCRUD(db)
        self.branch_crud = BranchCRUD(db)
        self.category_crud = CategoryCRUD(db)
        self.expiry_pricing = ExpiryPricingService(db)
        self.batch_service = BatchConsumptionService(db)
        self.redis = redis or get_redis()
        self.cache_ttl = settings.REDIS_CACHE_TTL

    async def get_products(
        self,
        page: int,
        limit: int,
        search: Optional[str],
        branch_id: Optional[int],
        category_id: Optional[int],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        cache_key = self._list_cache_key(page, limit, search, branch_id, category_id)

        cached = await self.redis.get(cache_key)
        if cached:
            try:
                parsed = json.loads(cached)
                data = [await self._with_pricing(base) for base in parsed["data"]]
                return data, parsed["meta"]
            except Exception:
                pass  # cache hỏng/không parse được -> bỏ qua, query DB như bình thường

        rows, total = await self.crud.get_multi(
            page, limit, search, branch_id, category_id
        )
        base_data = [self._to_base_dto(p) for p in rows]
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total,
            "total_pages": math.ceil(total / limit) if limit > 0 else 0,
        }

        await self.redis.set(
            cache_key, json.dumps({"data": base_data, "meta": meta}), self.cache_ttl
        )

        data = [await self._with_pricing(b) for b in base_data]
        return data, meta

    async def get_product_by_id(self, product_id: int) -> Dict[str, Any]:
        cache_key = self._detail_cache_key(product_id)

        cached = await self.redis.get(cache_key)
        if cached:
            try:
                base = json.loads(cached)
                return await self._with_pricing(base)
            except Exception:
                pass  # fallback query DB nếu cache hỏng

        product = await self._find_active_or_throw(product_id)
        base = self._to_base_dto(product)
        await self.redis.set(cache_key, json.dumps(base), self.cache_ttl)

        return await self._with_pricing(base)

    async def create_product(self, dto: CreateProductDto) -> Dict[str, Any]:
        await self._assert_branch_exists(dto.branch_id)
        await self._assert_category_exists(dto.category_id)

        barcode = dto.barcode.strip() if dto.barcode else None
        if not barcode:
            barcode = await self._generate_unique_barcode()
        else:
            await self._assert_barcode_not_taken(dto.branch_id, barcode)

        product = await self.crud.create(
            branch_id=dto.branch_id,
            category_id=dto.category_id,
            barcode=barcode,
            name=dto.name,
            unit=dto.unit,
            cost_price=dto.cost_price,
            sale_price=dto.sale_price,
            stock_quantity=dto.stock_quantity if dto.stock_quantity is not None else 0,
            reorder_level=dto.reorder_level if dto.reorder_level is not None else 10,
            expiry_date=dto.expiry_date,
        )

        await self._evict_list_cache()

        return await self._with_pricing(self._to_base_dto(product))

    async def update_product(
        self, product_id: int, dto: UpdateProductDto
    ) -> Dict[str, Any]:
        product = await self._find_active_or_throw(product_id)

        if dto.branch_id is not None:
            await self._assert_branch_exists(dto.branch_id)
        if dto.category_id is not None:
            await self._assert_category_exists(dto.category_id)

        next_branch_id = (
            dto.branch_id if dto.branch_id is not None else product.branch_id
        )
        next_barcode = dto.barcode if dto.barcode is not None else product.barcode
        barcode_or_branch_changed = (
            dto.barcode is not None and dto.barcode != product.barcode
        ) or (dto.branch_id is not None and dto.branch_id != product.branch_id)

        if barcode_or_branch_changed:
            await self._assert_barcode_not_taken(
                next_branch_id, next_barcode, exclude_id=product_id
            )

        update_data = dto.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)

        await self.db.commit()
        await self.db.refresh(product)

        # Evict cache
        await self._evict_detail_cache(product_id)
        await self._evict_list_cache()

        return await self._with_pricing(self._to_base_dto(product))

    async def delete_product(self, product_id: int) -> Dict[str, str]:
        product = await self._find_active_or_throw(product_id)
        await self.crud.soft_delete(product)

        await self._evict_detail_cache(product_id)
        await self._evict_list_cache()

        return {"message": "Xóa sản phẩm thành công."}

    async def find_by_barcode(
        self, code_or_name: str, user: AuthUser, query_branch_id: Optional[int]
    ) -> Dict[str, Any]:
        branch_id = self._resolve_branch_id(user, query_branch_id)
        search = code_or_name.strip()

        product = await self.crud.get_by_barcode_exact(branch_id, search)
        if not product:
            product = await self.crud.search_by_name_or_barcode(branch_id, search)

        if not product:
            raise BusinessException(
                "PRODUCT_NOT_FOUND",
                404,
                f'Không tìm thấy sản phẩm với từ khóa hoặc mã vạch "{search}".',
            )

        return await self._with_pricing(self._to_base_dto(product))

    async def find_alerts(
        self, user: AuthUser, query_branch_id: Optional[int]
    ) -> Dict[str, Any]:
        branch_id = self._resolve_branch_id(user, query_branch_id)
        alert_days = self._get_expiry_alert_days()

        low_stock_rows = await self.crud.get_low_stock_all(branch_id)
        low_stock = [
            await self._with_pricing(self._to_base_dto(p)) for p in low_stock_rows
        ]

        expiring_soon = await self.crud.get_expiring_soon_batches(branch_id, alert_days)

        return {"low_stock": low_stock, "expiring_soon": expiring_soon}

    async def find_low_stock_paginated(
        self, page: int, limit: int, user: AuthUser, query_branch_id: Optional[int]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        branch_id = self._resolve_branch_id(user, query_branch_id)
        rows, total = await self.crud.get_low_stock_paginated(branch_id, page, limit)

        data = [await self._with_pricing(self._to_base_dto(p)) for p in rows]
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total,
            "total_pages": math.ceil(total / limit) if limit > 0 else 0,
        }
        return data, meta

    async def find_expiring_soon_paginated(
        self,
        page: int,
        limit: int,
        days: Optional[int],
        user: AuthUser,
        query_branch_id: Optional[int],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        branch_id = self._resolve_branch_id(user, query_branch_id)
        alert_days = days if days is not None else self._get_expiry_alert_days()

        rows, total = await self.crud.get_expiring_soon_paginated(
            branch_id, alert_days, page, limit
        )
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total,
            "total_pages": math.ceil(total / limit) if limit > 0 else 0,
        }
        return rows, meta

    async def quote_effective_price(
        self, product_id: int, quantity: int
    ) -> Dict[str, Any]:
        product = await self._find_active_or_throw(product_id)
        sale_price = float(product.sale_price)

        simulated = await self.batch_service.simulate_fefo(product_id, quantity)

        line_total = 0.0
        for s in simulated:
            pricing = await self.expiry_pricing.compute_effective_price(
                sale_price, s["expiry_date"]
            )
            line_total += pricing["effective_price"] * s["quantity_taken"]
        line_total = round(line_total, 2)

        original_total = sale_price * quantity
        is_discounted = line_total < original_total

        return {
            "unit_price": round(line_total / quantity, 2) if quantity else 0.0,
            "original_unit_price": sale_price if is_discounted else None,
            "discount_percent": (
                round(((original_total - line_total) / original_total) * 100, 2)
                if is_discounted and original_total > 0
                else None
            ),
            "line_total": line_total,
        }

    async def find_batches_by_product(self, product_id: int) -> List[Dict[str, Any]]:
        await self._find_active_or_throw(product_id)
        batches = await self.batch_service.list_batches(product_id)
        return [self._batch_to_dto(b) for b in batches]

    async def update_batch(
        self, batch_id: int, dto: UpdateProductBatchDto
    ) -> Dict[str, Any]:
        batch = await self.crud.get_batch_by_id(batch_id)
        if not batch:
            raise BusinessException("BATCH_NOT_FOUND", 404, "Không tìm thấy lô hàng.")

        update_data = dto.model_dump(exclude_unset=True)
        if update_data.get("batch_code"):
            stripped = update_data["batch_code"].strip()
            if stripped:
                batch.batch_code = stripped
        if "expiry_date" in update_data:
            batch.expiry_date = update_data["expiry_date"]
        if "unit_cost" in update_data:
            batch.unit_cost = update_data["unit_cost"]

        await self.db.commit()
        await self.db.refresh(batch)

        # Cập nhật lại nearest_expiry_date của sản phẩm
        min_expiry_stmt = (
            select(ProductBatch.expiry_date)
            .where(
                ProductBatch.product_id == batch.product_id,
                ProductBatch.quantity_remaining > 0,
                ProductBatch.expiry_date.isnot(None),
                ProductBatch.deleted_at.is_(None),
            )
            .order_by(ProductBatch.expiry_date.asc())
            .limit(1)
        )
        nearest = (await self.db.execute(min_expiry_stmt)).scalar_one_or_none()

        await self.db.execute(
            update(Product)
            .where(Product.id == batch.product_id)
            .values(nearest_expiry_date=nearest)
        )
        await self.db.commit()

        # Xóa cache Redis của sản phẩm để cập nhật lại nearest_expiry_date/effective_price real-time
        await self.evict_cache_for_product(batch.product_id)

        return self._batch_to_dto(batch)

    def _resolve_branch_id(self, user: AuthUser, query_branch_id: Optional[int]) -> int:
        branch_id = query_branch_id if query_branch_id is not None else user.branch_id
        if not branch_id:
            raise BusinessException(
                "PRODUCT_BRANCH_REQUIRED",
                400,
                "branch_id: bắt buộc khi tài khoản không gắn với 1 chi nhánh cụ thể",
            )
        return branch_id

    def _get_expiry_alert_days(self) -> int:
        return settings.PRODUCT_EXPIRY_ALERT_DAYS

    async def _find_active_or_throw(self, product_id: int) -> Product:
        product = await self.crud.get_by_id(product_id)
        if not product:
            raise BusinessException(
                "PRODUCT_NOT_FOUND", 404, "Không tìm thấy sản phẩm."
            )
        return product

    async def _assert_branch_exists(self, branch_id: int) -> None:
        branch = await self.branch_crud.get_by_id(branch_id)
        if not branch:
            raise BusinessException(
                "BRANCH_NOT_FOUND", 404, "Không tìm thấy chi nhánh."
            )

    async def _assert_category_exists(self, category_id: int) -> None:
        category = await self.category_crud.get_by_id(category_id)
        if not category:
            raise BusinessException(
                "CATEGORY_NOT_FOUND", 404, "Không tìm thấy category."
            )

    async def _assert_barcode_not_taken(
        self, branch_id: int, barcode: str, exclude_id: Optional[int] = None
    ) -> None:
        existing = await self.crud.get_by_barcode_branch(branch_id, barcode, exclude_id)
        if existing:
            raise BusinessException(
                "PRODUCT_BARCODE_DUPLICATE",
                409,
                "Barcode đã tồn tại trong chi nhánh này.",
            )

    async def _generate_unique_barcode(self) -> str:
        for _ in range(5):
            raw12 = f"200{random.randint(100000000, 999999999)}"
            candidate = self._append_ean13_check_digit(raw12)

            existing = await self.crud.get_by_barcode_global(candidate)
            if not existing:
                return candidate

        timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        timestamp12 = f"20{str(timestamp_ms)[-10:]}"
        return self._append_ean13_check_digit(timestamp12)

    @staticmethod
    def _append_ean13_check_digit(raw12: str) -> str:
        if len(raw12) != 12:
            raise ValueError("Chuỗi đầu vào phải đúng 12 chữ số")
        total = 0
        for i, ch in enumerate(raw12):
            digit = int(ch)
            total += digit if i % 2 == 0 else digit * 3
        checksum = (10 - (total % 10)) % 10
        return f"{raw12}{checksum}"

    def _to_base_dto(self, p: Product) -> Dict[str, Any]:
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
            "nearest_expiry_date": (
                p.nearest_expiry_date.isoformat() if p.nearest_expiry_date else None
            ),
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
        }

    async def _with_pricing(self, base: Dict[str, Any]) -> Dict[str, Any]:
        nearest: Optional[str] = base.get("nearest_expiry_date")
        expiry_date_obj = date.fromisoformat(nearest) if nearest else None
        pricing = await self.expiry_pricing.compute_effective_price(
            base["sale_price"], expiry_date_obj
        )
        return {**base, **pricing}

    @staticmethod
    def _batch_to_dto(b: ProductBatch) -> Dict[str, Any]:
        return {
            "id": b.id,
            "product_id": b.product_id,
            "batch_code": b.batch_code,
            "expiry_date": b.expiry_date.isoformat() if b.expiry_date else None,
            "quantity_received": b.quantity_received,
            "quantity_remaining": b.quantity_remaining,
            "unit_cost": float(b.unit_cost) if b.unit_cost is not None else None,
            "received_at": b.received_at.isoformat(),
            "created_by": b.created_by,
        }

    def _list_cache_key(
        self,
        page: int,
        limit: int,
        search: Optional[str],
        branch_id: Optional[int],
        category_id: Optional[int],
    ) -> str:
        return ":".join(
            [
                CACHE_PREFIX,
                "list",
                f"p{page}",
                f"l{limit}",
                f"s{search or ''}",
                f"b{branch_id or ''}",
                f"c{category_id or ''}",
            ]
        )

    def _detail_cache_key(self, product_id: int) -> str:
        return f"{CACHE_PREFIX}:detail:{product_id}"

    async def evict_cache_for_product(self, product_id: int) -> None:
        await self._evict_detail_cache(product_id)
        await self._evict_list_cache()

    async def _evict_detail_cache(self, product_id: int) -> None:
        await self.redis.delete(self._detail_cache_key(product_id))

    async def _evict_list_cache(self) -> None:
        keys = await self.redis.keys(f"{CACHE_PREFIX}:list:*")
        if keys:
            await self.redis.delete(*keys)
