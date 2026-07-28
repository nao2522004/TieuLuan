import math
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException
from app.modules.auth.dependencies import AuthUser
from app.modules.products.batch_consumption_service import BatchConsumptionService
from app.modules.products.service import ProductService
from app.modules.returns.crud import ReturnCRUD
from app.modules.returns.models import Return
from app.modules.orders.models import Order
from app.modules.returns.schemas import CreateReturnDto
from app.modules.users.service import UserService


class ReturnService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = ReturnCRUD(db)
        self.batch_service = BatchConsumptionService(db)
        self.product_service = ProductService(db)
        self.user_service = UserService(db)

    async def create(self, dto: CreateReturnDto, user: AuthUser) -> Dict[str, Any]:
        order_item = await self.crud.lock_order_item(dto.order_item_id)
        if not order_item:
            raise BusinessException(
                "ORDER_ITEM_NOT_FOUND",
                404,
                "Không tìm thấy dòng sản phẩm trong đơn hàng.",
            )

        order = await self.crud.get_order_by_id(order_item.order_id)
        if not order:
            raise BusinessException(
                "ORDER_NOT_FOUND",
                404,
                "Không tìm thấy đơn hàng chứa dòng sản phẩm này.",
            )

        if order.status == "cancelled":
            raise BusinessException(
                "ORDER_ALREADY_CANCELLED",
                400,
                "Đơn hàng này đã bị hủy, không thể thực hiện trả hàng.",
            )

        if "admin" not in user.roles and user.branch_id != order.branch_id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Bạn không có quyền xử lý trả hàng cho đơn hàng của chi nhánh khác.",
            )

        already_returned = await self.crud.sum_returned_quantity(dto.order_item_id)
        remaining = order_item.quantity - already_returned

        if remaining <= 0:
            product_label = order_item.product_name or f"ID #{order_item.product_id}"
            raise BusinessException(
                "RETURN_QUANTITY_EXCEEDS",
                400,
                f'Sản phẩm "{product_label}" trong đơn hàng đã được trả đủ '
                f"({already_returned}/{order_item.quantity} sản phẩm), không thể trả thêm.",
            )

        if dto.quantity > remaining:
            raise BusinessException(
                "RETURN_QUANTITY_EXCEEDS",
                400,
                f"Số lượng xin trả ({dto.quantity}) vượt quá số lượng còn lại có "
                f"thể trả ({remaining} sản phẩm).",
            )

        # refund_amount server tự tính từ snapshot unit_price - KHÔNG nhận từ client
        refund_amount = float(order_item.unit_price) * dto.quantity

        entity = await self.crud.create(
            order_item_id=dto.order_item_id,
            quantity=dto.quantity,
            refund_amount=refund_amount,
            reason=dto.reason,
            created_by=user.id,
        )

        # Cộng lại tồn kho sản phẩm & lô hàng tương ứng - trong cùng transaction
        await self.batch_service.restore_quantity_for_returned_item(
            dto.order_item_id, order_item.product_id, dto.quantity
        )

        await self.db.commit()
        await self.db.refresh(entity)

        # Side-effect (evict cache)
        try:
            await self.product_service.evict_cache_for_product(order_item.product_id)
        except Exception:
            pass

        return await self._to_dto(entity)

    async def find_all_paginated(
        self,
        page: int,
        limit: int,
        order_id: Optional[int],
        created_by: Optional[int],
        user: AuthUser,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        conditions: list = []

        if "admin" not in user.roles:
            conditions.append(Order.branch_id == user.branch_id)

        if order_id is not None:
            conditions.append(Order.id == order_id)

        if created_by is not None:
            conditions.append(Return.created_by == created_by)

        rows, total_items = await self.crud.count_and_list(conditions, page, limit)

        # Batch lookup tên nhân viên
        creator_ids = list({r.created_by for r in rows})
        creator_names = await self.user_service.find_names_by_ids(creator_ids)

        data = [self._to_dto_sync(r, creator_names.get(r.created_by)) for r in rows]

        total_pages = math.ceil(total_items / limit) if limit else 0
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return data, meta

    async def find_one_or_throw(self, return_id: int, user: AuthUser) -> Dict[str, Any]:
        return_record = await self.crud.get_by_id(return_id)
        if not return_record:
            raise BusinessException(
                "RETURN_NOT_FOUND", 404, "Không tìm thấy giao dịch trả hàng."
            )

        order_item = await self.crud.get_order_item_by_id(return_record.order_item_id)
        if not order_item:
            raise BusinessException(
                "ORDER_ITEM_NOT_FOUND",
                404,
                "Không tìm thấy dòng sản phẩm trong đơn hàng tương ứng.",
            )

        order = await self.crud.get_order_by_id(order_item.order_id)
        if not order:
            raise BusinessException(
                "ORDER_NOT_FOUND", 404, "Không tìm thấy đơn hàng tương ứng."
            )

        if "admin" not in user.roles and order.branch_id != user.branch_id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Bạn không có quyền truy cập giao dịch trả hàng của chi nhánh khác.",
            )

        return await self._to_dto(return_record)

    async def _to_dto(self, ret: Return) -> Dict[str, Any]:
        names = await self.user_service.find_names_by_ids([ret.created_by])
        return self._to_dto_sync(ret, names.get(ret.created_by))

    @staticmethod
    def _to_dto_sync(ret: Return, creator_name: Optional[str]) -> Dict[str, Any]:
        return {
            "id": ret.id,
            "order_item_id": ret.order_item_id,
            "quantity": ret.quantity,
            "refund_amount": float(ret.refund_amount),
            "reason": ret.reason,
            "created_by": ret.created_by,
            "created_by_name": creator_name,
            "created_at": ret.created_at.isoformat(),
            "zalopay_m_refund_id": ret.zalopay_m_refund_id,
            "zalopay_refund_id": ret.zalopay_refund_id,
            "zalopay_refund_status": ret.zalopay_refund_status,
        }
