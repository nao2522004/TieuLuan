import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.vietqr import (
    VietQrParams,
    build_viet_qr_payload,
    generate_viet_qr_base64,
    generate_viet_qr_image,
)
from app.core.exceptions import BusinessException
from app.modules.auth.dependencies import AuthUser
from app.modules.branches.crud import BranchCRUD
from app.modules.expiry_pricing.service import ExpiryPricingService
from app.modules.orders.crud import OrderCRUD
from app.modules.orders.models import Order, OrderItem, OrderItemBatch
from app.modules.orders.schemas import CreateOrderDto, QueryOrderDto
from app.modules.products.batch_consumption_service import BatchConsumptionService
from app.modules.products.crud import ProductCRUD
from app.modules.products.service import ProductService
from app.modules.promotions.service import PromotionService
from app.modules.shifts.service import ShiftsService
from app.modules.zalopay.schemas import CreateZaloPayOrderDto
from app.modules.zalopay.service import get_zalopay_service


def _parse_vn_date(value: str, end_of_day: bool) -> datetime:
    suffix = "T23:59:59+07:00" if end_of_day else "T00:00:00+07:00"
    return datetime.fromisoformat(value + suffix)


class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = OrderCRUD(db)
        self.product_crud = ProductCRUD(db)
        self.branch_crud = BranchCRUD(db)
        self.shifts_service = ShiftsService(db)
        self.product_service = ProductService(db)
        self.batch_service = BatchConsumptionService(db)
        self.promotion_service = PromotionService(db)
        self.expiry_pricing = ExpiryPricingService(db)

    async def create(self, dto: CreateOrderDto, user: AuthUser) -> Dict[str, Any]:
        open_shift = await self.shifts_service.require_active_shift(user)

        is_transfer = dto.payment_method == "transfer"
        payment_status = "pending" if is_transfer else "paid"

        branch = None
        bank_bin: Optional[str] = None
        bank_account_no: Optional[str] = None

        if is_transfer:
            branch = await self.branch_crud.get_by_id(open_shift.branch_id)
            bank_bin = branch.bank_bin if branch else None
            bank_account_no = branch.bank_account_no if branch else None
            if not branch or not bank_bin or not bank_account_no:
                raise BusinessException(
                    "ORDER_BRANCH_NO_BANK_INFO",
                    400,
                    "Chi nhánh chưa cấu hình thông tin ngân hàng để nhận chuyển khoản.",
                )

        sorted_items = sorted(dto.items, key=lambda i: i.product_id)

        line_items: List[Dict[str, Any]] = []
        for item in sorted_items:
            product = await self.product_crud.get_by_id(item.product_id)
            if not product or product.branch_id != open_shift.branch_id:
                raise BusinessException(
                    "PRODUCT_NOT_FOUND",
                    404,
                    f"Không tìm thấy sản phẩm id={item.product_id} trong chi "
                    "nhánh của ca đang mở.",
                )

            # Trừ kho FEFO — row-lock products trước, product_batches
            consumed_batches = await self.batch_service.consume_fefo(
                item.product_id, item.quantity
            )

            sale_price = float(product.sale_price)
            line_total = 0.0
            for cb in consumed_batches:
                pricing = await self.expiry_pricing.compute_effective_price(
                    sale_price, cb["expiry_date"]
                )
                line_total += pricing["effective_price"] * cb["quantity_taken"]
            line_total = round(line_total, 2)

            original_total = sale_price * item.quantity
            is_discounted = line_total < original_total
            unit_price = round(line_total / item.quantity, 2) if item.quantity else 0.0
            blended_discount_percent = (
                round(((original_total - line_total) / original_total) * 100, 2)
                if is_discounted and original_total > 0
                else None
            )

            line_items.append(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                    "original_unit_price": sale_price if is_discounted else None,
                    "discount_percent": blended_discount_percent,
                    "consumed_batches": consumed_batches,
                }
            )

        subtotal = sum(li["unit_price"] * li["quantity"] for li in line_items)

        discount_amount = (
            float(dto.discount_amount) if dto.discount_amount is not None else 0.0
        )
        applied_code = applied_type = applied_value = None

        if dto.promotion_code:
            result = await self.promotion_service.validate_and_calculate_discount(
                dto.promotion_code, subtotal
            )
            if not result["valid"]:
                raise BusinessException(
                    "PROMOTION_INVALID",
                    400,
                    result.get("reason") or "Mã khuyến mãi không hợp lệ.",
                )
            discount_amount = result["discount_amount"]
            applied_code = dto.promotion_code.strip().upper()
            applied_type = result.get("promotion_type")
            applied_value = result.get("promotion_value")

        total_amount = subtotal - discount_amount

        order = Order(
            branch_id=open_shift.branch_id,
            shift_id=open_shift.id,
            created_by=user.id,
            status="completed",
            payment_method=dto.payment_method,
            payment_status=payment_status,
            discount_amount=discount_amount,
            total_amount=total_amount,
            promotion_code=applied_code,
            promotion_type=applied_type,
            promotion_value=applied_value,
        )
        self.db.add(order)
        await self.db.flush()

        saved_items: List[OrderItem] = []
        for li in line_items:
            oi = OrderItem(
                order_id=order.id,
                product_id=li["product_id"],
                product_name=li["product_name"],
                quantity=li["quantity"],
                unit_price=li["unit_price"],
                original_unit_price=li["original_unit_price"],
                expiry_discount_percent=li["discount_percent"],
            )
            self.db.add(oi)
            await self.db.flush()
            saved_items.append(oi)

            for cb in li["consumed_batches"]:
                self.db.add(
                    OrderItemBatch(
                        order_item_id=oi.id,
                        batch_id=cb["batch_id"],
                        quantity_taken=cb["quantity_taken"],
                    )
                )

        await self.db.commit()
        await self.db.refresh(order)
        for it in saved_items:
            await self.db.refresh(it)

        for item in sorted_items:
            try:
                await self.product_service.evict_cache_for_product(item.product_id)
            except Exception:
                pass

        qr_content = qr_code = None
        if is_transfer:
            try:
                zalopay_service = get_zalopay_service()
                zalo_dto = CreateZaloPayOrderDto(
                    app_user=str(user.id),
                    amount=int(round(total_amount)),
                    description=f"DH{order.id}",
                    embed_data={"order_id": order.id},
                    item=[
                        {
                            "id": oi.product_id,
                            "quantity": oi.quantity,
                            "price": float(oi.unit_price),
                        }
                        for oi in saved_items
                    ],
                )
                zp_res = await zalopay_service.create_order(zalo_dto)
                app_trans_id = zp_res.get("app_trans_id")
                order_url = zp_res.get("order_url") or ""

                if app_trans_id:
                    order.zalopay_app_trans_id = app_trans_id
                    await self.db.commit()
                    await self.db.refresh(order)

                if order_url:
                    qr_content = order_url
                    qr_code = generate_viet_qr_image(order_url)
            except Exception as exc:
                for oi in saved_items:
                    await self.batch_service.restore_exact_batches(oi.id, oi.product_id)

                order.status = "cancelled"
                await self.db.commit()
                await self.db.refresh(order)

                for item in sorted_items:
                    try:
                        await self.product_service.evict_cache_for_product(
                            item.product_id
                        )
                    except Exception:
                        pass

                raise BusinessException(
                    "ZALOPAY_CREATE_ERROR",
                    500,
                    f"Không thể tạo giao dịch ZaloPay: {exc}",
                )

        return await self._to_dto(order, saved_items, qr_content, qr_code)

    async def confirm_payment(self, order_id: int, user: AuthUser) -> Dict[str, Any]:
        order = await self.crud.lock_by_id(order_id)
        if not order:
            raise BusinessException("ORDER_NOT_FOUND", 404, "Không tìm thấy đơn hàng.")

        if order.payment_method != "transfer":
            raise BusinessException(
                "ORDER_NOT_TRANSFER_PAYMENT",
                400,
                "Đơn hàng này không dùng hình thức chuyển khoản, không cần xác "
                "nhận thanh toán.",
            )
        if order.payment_status == "paid":
            raise BusinessException(
                "ORDER_ALREADY_PAID",
                409,
                "Đơn hàng này đã được xác nhận thanh toán trước đó.",
            )
        if "admin" not in user.roles and order.created_by != user.id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Bạn không có quyền xác nhận thanh toán cho đơn hàng này.",
            )

        order.payment_status = "paid"
        await self.db.commit()
        await self.db.refresh(order)

        items = await self.crud.get_items(order_id)
        return await self._to_dto(order, items)

    async def find_all(
        self, query: QueryOrderDto, user: AuthUser
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        conditions: list = [Order.deleted_at.is_(None)]

        branch_id = self._resolve_branch_filter(user, query.branch_id)
        if branch_id:
            conditions.append(Order.branch_id == branch_id)
        if query.status:
            conditions.append(Order.status == query.status)
        if query.payment_status:
            conditions.append(Order.payment_status == query.payment_status)
        if query.from_date:
            conditions.append(
                Order.created_at >= _parse_vn_date(query.from_date, False)
            )
        if query.to_date:
            conditions.append(Order.created_at <= _parse_vn_date(query.to_date, True))

        if "admin" not in user.roles:
            conditions.append(Order.created_by == user.id)
        elif query.created_by:
            conditions.append(Order.created_by == query.created_by)

        rows, total = await self.crud.count_and_list(
            conditions, query.page, query.limit
        )

        data = []
        for order in rows:
            items = await self.crud.get_items(order.id)
            data.append(await self._to_dto(order, items))

        meta = {
            "current_page": query.page,
            "limit": query.limit,
            "total_items": total,
            "total_pages": math.ceil(total / query.limit) if query.limit else 0,
        }
        return data, meta

    async def find_one(self, order_id: int) -> Dict[str, Any]:
        order = await self.crud.get_by_id(order_id)
        if not order:
            raise BusinessException("ORDER_NOT_FOUND", 404, "Không tìm thấy đơn hàng.")

        items = await self.crud.get_items(order_id)
        item_ids = [i.id for i in items]
        returns_map = await self.crud.get_returned_quantities(item_ids)
        batches_map = await self.crud.get_item_batches(item_ids)

        return await self._to_dto(
            order, items, returns_map=returns_map, batches_map=batches_map
        )

    async def assert_branch_access(self, order_id: int, user: AuthUser) -> None:
        order = await self.crud.get_by_id(order_id, include_deleted=True)
        if not order:
            raise BusinessException("ORDER_NOT_FOUND", 404, "Không tìm thấy đơn hàng.")
        if "admin" not in user.roles and user.branch_id != order.branch_id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Bạn không có quyền thao tác với đơn hàng của chi nhánh khác.",
            )

    async def cancel(self, order_id: int, user: AuthUser) -> Dict[str, Any]:
        pre_check = await self.crud.get_by_id(order_id)
        if not pre_check:
            raise BusinessException("ORDER_NOT_FOUND", 404, "Không tìm thấy đơn hàng.")

        await self.shifts_service.require_active_shift(user, pre_check.branch_id)

        if pre_check.status == "cancelled":
            raise BusinessException(
                "ORDER_ALREADY_CANCELLED",
                409,
                "Đơn hàng này đã được hủy trước đó.",
            )
        if "admin" not in user.roles and pre_check.created_by != user.id:
            raise BusinessException(
                "FORBIDDEN", 403, "Bạn không có quyền hủy đơn hàng này."
            )

        order = await self.crud.lock_by_id(order_id)
        if not order:
            raise BusinessException("ORDER_NOT_FOUND", 404, "Không tìm thấy đơn hàng.")
        if order.status == "cancelled":
            raise BusinessException(
                "ORDER_ALREADY_CANCELLED",
                409,
                "Đơn hàng này đã được hủy trước đó.",
            )

        items = await self.crud.get_items(order_id)
        sorted_items = sorted(items, key=lambda i: i.product_id)

        for item in sorted_items:
            await self.batch_service.restore_exact_batches(item.id, item.product_id)

        order.status = "cancelled"
        await self.db.commit()
        await self.db.refresh(order)

        for item in items:
            try:
                await self.product_service.evict_cache_for_product(item.product_id)
            except Exception:
                pass

        return await self._to_dto(order, items)

    def _resolve_branch_filter(
        self, user: AuthUser, query_branch_id: Optional[int]
    ) -> Optional[int]:
        if "admin" not in user.roles:
            return user.branch_id
        return query_branch_id

    async def _to_dto(
        self,
        order: Order,
        items: List[OrderItem],
        qr_content: Optional[str] = None,
        qr_code: Optional[str] = None,
        returns_map: Optional[Dict[int, int]] = None,
        batches_map: Optional[Dict[int, List[Dict[str, Any]]]] = None,
    ) -> Dict[str, Any]:
        return {
            "id": order.id,
            "branch_id": order.branch_id,
            "shift_id": order.shift_id,
            "created_by": order.created_by,
            "status": order.status,
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "discount_amount": float(order.discount_amount),
            "total_amount": float(order.total_amount),
            "items": [
                {
                    "id": it.id,
                    "product_id": it.product_id,
                    "product_name": it.product_name,
                    "quantity": it.quantity,
                    "returned_quantity": (returns_map or {}).get(it.id, 0),
                    "unit_price": float(it.unit_price),
                    "original_unit_price": (
                        float(it.original_unit_price)
                        if it.original_unit_price is not None
                        else None
                    ),
                    "discount_percent": (
                        float(it.expiry_discount_percent)
                        if it.expiry_discount_percent is not None
                        else None
                    ),
                    "batches": (batches_map or {}).get(it.id, []),
                }
                for it in items
            ],
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat(),
            "qr_content": qr_content,
            "qr_code": qr_code,
            "zalopay_app_trans_id": order.zalopay_app_trans_id,
            "zalopay_zp_trans_id": order.zalopay_zp_trans_id,
            "promotion_code": order.promotion_code,
            "promotion_type": order.promotion_type,
            "promotion_value": (
                float(order.promotion_value)
                if order.promotion_value is not None
                else None
            ),
        }
