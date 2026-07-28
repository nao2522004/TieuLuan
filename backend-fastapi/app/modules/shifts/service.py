import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.exceptions import BusinessException
from app.modules.auth.dependencies import AuthUser
from app.modules.branches.crud import BranchCRUD
from app.modules.branches.models import Branch
from app.modules.orders.models import Order, OrderItem
from app.modules.returns.models import Return
from app.modules.shifts.crud import ShiftCRUD
from app.modules.shifts.models import Shift, ShiftUser
from app.modules.shifts.schemas import CloseShiftDto, OpenShiftDto, UpdateClosingDto
from app.modules.users.service import UserService


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt is not None else None


class ShiftsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = ShiftCRUD(db)
        self.branch_crud = BranchCRUD(db)
        self.user_service = UserService(db)

    # ------------------------------------------------------------------ #
    # OPEN
    # ------------------------------------------------------------------ #
    async def open(self, dto: OpenShiftDto, user: AuthUser) -> Dict[str, Any]:
        if "admin" not in user.roles and "leader" not in user.roles:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Chỉ Trưởng ca hoặc Quản trị viên mới được quyền mở ca làm việc.",
            )

        branch_id = user.branch_id if user.branch_id is not None else dto.branch_id
        if not branch_id:
            raise BusinessException(
                "SHIFT_BRANCH_REQUIRED",
                400,
                "branch_id: bắt buộc khi tài khoản không gắn với 1 chi nhánh cụ thể",
            )

        branch = await self.branch_crud.get_by_id(branch_id)
        if not branch:
            raise BusinessException(
                "BRANCH_NOT_FOUND", 404, "Không tìm thấy chi nhánh."
            )

        existing_open = await self.crud.get_open_by_branch(branch_id)
        if existing_open:
            raise self._already_open_error()

        cashier_ids = dto.cashier_ids or []
        unique_ids = list(dict.fromkeys(cashier_ids))
        if len(unique_ids) != len(cashier_ids):
            raise BusinessException(
                "SHIFT_CASHIERS_DUPLICATE",
                400,
                "Danh sách ID thu ngân không được trùng lặp.",
            )

        cashiers = []
        if unique_ids:
            cashiers = await self.user_service.find_by_ids(unique_ids)
            if len(cashiers) != len(unique_ids):
                raise BusinessException(
                    "SHIFT_CASHIERS_INVALID",
                    400,
                    "Một hoặc nhiều thu ngân không tồn tại trong hệ thống.",
                )

            for cashier in cashiers:
                if not cashier.is_active:
                    raise BusinessException(
                        "SHIFT_CASHIER_INACTIVE",
                        400,
                        f'Thu ngân "{cashier.full_name}" hiện đã bị khóa tài khoản.',
                    )
                has_valid_role = any(
                    r.code in ("cashier", "leader") for r in (cashier.roles or [])
                )
                if not has_valid_role:
                    raise BusinessException(
                        "SHIFT_CASHIER_ROLE_INVALID",
                        400,
                        f'Người dùng "{cashier.full_name}" không có vai trò thu ngân hoặc trưởng ca.',
                    )
                if cashier.branch_id != branch_id:
                    raise BusinessException(
                        "SHIFT_CASHIER_BRANCH_INVALID",
                        400,
                        f'Thu ngân "{cashier.full_name}" thuộc chi nhánh khác.',
                    )

        shift = Shift(
            branch_id=branch_id,
            user_id=user.id,
            opening_cash=dto.opening_cash,
            note=dto.note,
        )
        shift.shift_users = [ShiftUser(user_id=c.id) for c in cashiers]

        try:
            saved = await self.crud.save_new(shift)
        except Exception as err:
            if self._is_unique_violation(err):
                raise self._already_open_error()
            raise

        shift_with_users = await self.crud.get_with_users(saved.id)

        return self._to_dto(shift_with_users or saved, branch.name, user.full_name)

    async def close(
        self, shift_id: int, dto: CloseShiftDto, user: AuthUser
    ) -> Dict[str, Any]:
        shift = await self.crud.lock_by_id(shift_id)
        if not shift:
            raise BusinessException(
                "SHIFT_NOT_FOUND", 404, "Không tìm thấy ca làm việc."
            )

        if "admin" not in user.roles and shift.user_id != user.id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Bạn không có quyền đóng ca làm việc này (chỉ Trưởng ca đã mở ca hoặc "
                "Admin mới được phép đóng).",
            )
        if shift.closed_at:
            raise BusinessException(
                "SHIFT_ALREADY_CLOSED", 409, "Ca làm việc này đã được đóng trước đó."
            )

        cash_revenue = await self._cash_revenue_for_shift(shift_id)
        returns_totals = await self._returns_totals_by_shift(shift_id)

        shift.closing_cash = dto.closing_cash
        shift.expected_cash = (
            Decimal(shift.opening_cash) + cash_revenue - returns_totals["cash"]
        )
        shift.note = dto.note if dto.note is not None else shift.note
        shift.closed_at = datetime.now(timezone.utc)

        saved = await self.crud.save(shift)
        shift_with_users = await self.crud.get_with_users(saved.id)

        if saved.user_id == user.id:
            user_full_name: Optional[str] = user.full_name
        else:
            names = await self.user_service.find_names_by_ids([saved.user_id])
            user_full_name = names.get(saved.user_id)

        branch_names = await self._find_branch_names([saved.branch_id])

        return self._to_dto(
            shift_with_users or saved,
            branch_names.get(saved.branch_id),
            user_full_name,
        )

    # ------------------------------------------------------------------ #
    # LIST
    # ------------------------------------------------------------------ #
    async def find_all(
        self,
        page: int,
        limit: int,
        user: AuthUser,
        branch_id: Optional[int],
        user_id: Optional[int],
        status_filter: Optional[str],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        conditions: list = []

        if "admin" not in user.roles:
            if user.branch_id:
                conditions.append(Shift.branch_id == user.branch_id)
            else:
                conditions.append(Shift.user_id == user.id)
        elif branch_id:
            conditions.append(Shift.branch_id == branch_id)

        if user_id:
            conditions.append(Shift.user_id == user_id)

        if status_filter == "open":
            conditions.append(Shift.closed_at.is_(None))
        elif status_filter == "closed":
            conditions.append(Shift.closed_at.isnot(None))

        rows, total_items = await self.crud.count_and_list(conditions, page, limit)

        branch_ids = list({r.branch_id for r in rows})
        user_ids = list({r.user_id for r in rows})
        branch_names = await self._find_branch_names(branch_ids)
        user_names = await self.user_service.find_names_by_ids(user_ids)

        data = [
            self._to_dto(s, branch_names.get(s.branch_id), user_names.get(s.user_id))
            for s in rows
        ]

        total_pages = math.ceil(total_items / limit) if limit else 0
        meta = {
            "current_page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages,
        }
        return data, meta

    async def find_one_detail(self, shift_id: int, user: AuthUser) -> Dict[str, Any]:
        shift = await self.crud.get_with_users(shift_id)
        if not shift:
            raise BusinessException(
                "SHIFT_NOT_FOUND", 404, "Không tìm thấy ca làm việc."
            )

        if "admin" not in user.roles:
            if user.branch_id:
                if shift.branch_id != user.branch_id:
                    raise BusinessException(
                        "FORBIDDEN",
                        403,
                        "Bạn không có quyền xem ca làm việc của chi nhánh khác.",
                    )
            elif shift.user_id != user.id:
                raise BusinessException(
                    "FORBIDDEN", 403, "Bạn không có quyền xem ca làm việc này."
                )

        orders_stmt = (
            select(Order)
            .where(Order.shift_id == shift_id, Order.deleted_at.is_(None))
            .order_by(Order.id.asc())
        )
        orders = list((await self.db.execute(orders_stmt)).scalars().all())

        orders_count = 0
        cash_total = Decimal("0")
        card_total = Decimal("0")
        transfer_total = Decimal("0")
        for o in orders:
            if o.status != "completed":
                continue
            orders_count += 1
            amount = Decimal(o.total_amount)
            if o.payment_method == "cash":
                cash_total += amount
            elif o.payment_method == "card":
                card_total += amount
            elif o.payment_method == "transfer":
                transfer_total += amount

        return_rows = await self._return_rows_for_shift(shift_id)

        returns_totals = {
            "cash": Decimal("0"),
            "card": Decimal("0"),
            "transfer": Decimal("0"),
        }
        order_refunds_map: Dict[int, Decimal] = {}

        for r in return_rows:
            key = r["payment_method"]
            if key in returns_totals:
                returns_totals[key] += r["refund_amount"]
            order_refunds_map[r["order_id"]] = (
                order_refunds_map.get(r["order_id"], Decimal("0")) + r["refund_amount"]
            )

        live_expected_cash = (
            Decimal(shift.opening_cash) + cash_total - returns_totals["cash"]
        )

        creator_ids = list(
            {o.created_by for o in orders} | {r["created_by"] for r in return_rows}
        )
        creator_names = await self.user_service.find_names_by_ids(creator_ids)

        order_summaries = [
            {
                "id": o.id,
                "created_by": o.created_by,
                "created_by_name": creator_names.get(o.created_by),
                "payment_method": o.payment_method,
                "payment_status": o.payment_status,
                "status": o.status,
                "total_amount": float(o.total_amount),
                "refunded_amount": float(order_refunds_map.get(o.id, Decimal("0"))),
                "created_at": _iso(o.created_at),
            }
            for o in orders
        ]

        return_summaries = [
            {
                "id": r["id"],
                "order_id": r["order_id"],
                "order_item_id": r["order_item_id"],
                "product_name": r["product_name"],
                "quantity": r["quantity"],
                "refund_amount": float(r["refund_amount"]),
                "payment_method": r["payment_method"],
                "reason": r["reason"],
                "created_by": r["created_by"],
                "created_by_name": creator_names.get(r["created_by"]),
                "created_at": _iso(r["created_at"]),
            }
            for r in return_rows
        ]

        branch_names = await self._find_branch_names([shift.branch_id])
        user_names = await self.user_service.find_names_by_ids([shift.user_id])

        base = self._to_dto(
            shift, branch_names.get(shift.branch_id), user_names.get(shift.user_id)
        )
        base.update(
            {
                "orders_count": orders_count,
                "cash_orders_total": float(cash_total),
                "card_orders_total": float(card_total),
                "transfer_orders_total": float(transfer_total),
                "cash_returns_total": float(returns_totals["cash"]),
                "card_returns_total": float(returns_totals["card"]),
                "transfer_returns_total": float(returns_totals["transfer"]),
                "live_expected_cash": float(live_expected_cash),
                "orders": order_summaries,
                "returns": return_summaries,
            }
        )
        return base

    async def correct_closed(
        self, shift_id: int, dto: UpdateClosingDto, user: AuthUser
    ) -> Dict[str, Any]:
        shift = await self.crud.lock_by_id(shift_id)
        if not shift:
            raise BusinessException(
                "SHIFT_NOT_FOUND", 404, "Không tìm thấy ca làm việc."
            )
        if not shift.closed_at:
            raise BusinessException(
                "SHIFT_NOT_CLOSED",
                400,
                "Ca làm việc chưa được đóng, không thể sửa thông tin đóng ca.",
            )
        if "admin" not in user.roles and shift.user_id != user.id:
            raise BusinessException(
                "FORBIDDEN",
                403,
                "Chỉ Admin hoặc Trưởng ca đã mở ca mới được phép sửa thông tin đóng ca.",
            )

        # exclude_unset để phân biệt "không truyền" (giữ nguyên) vs "truyền rỗng" (set null)
        update_data = dto.model_dump(exclude_unset=True)

        if "closing_cash" in update_data:
            cash_revenue = await self._cash_revenue_for_shift(shift_id)
            returns_totals = await self._returns_totals_by_shift(shift_id)
            expected_cash = (
                Decimal(shift.opening_cash) + cash_revenue - returns_totals["cash"]
            )
            shift.closing_cash = update_data["closing_cash"]
            shift.expected_cash = expected_cash

        if "note" in update_data:
            shift.note = update_data["note"] or None

        saved = await self.crud.save(shift)
        shift_with_users = await self.crud.get_with_users(saved.id)

        branch_names = await self._find_branch_names([saved.branch_id])
        user_names = await self.user_service.find_names_by_ids([saved.user_id])

        return self._to_dto(
            shift_with_users or saved,
            branch_names.get(saved.branch_id),
            user_names.get(saved.user_id),
        )

    async def find_open_shift_for_branch(self, branch_id: int) -> Optional[Shift]:
        shift = await self.crud.get_open_by_branch(branch_id)
        if not shift:
            return None
        return await self.crud.get_with_users(shift.id)

    async def is_user_in_shift(self, user_id: int, shift_id: int) -> bool:
        count = await self.crud.count_users_in_shift(user_id, shift_id)
        return count > 0

    async def _cash_revenue_for_shift(self, shift_id: int) -> Decimal:
        stmt = select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.shift_id == shift_id,
            Order.payment_method == "cash",
            Order.status == "completed",
            Order.deleted_at.is_(None),
        )
        result = (await self.db.execute(stmt)).scalar_one()
        return Decimal(result)

    async def _returns_totals_by_shift(self, shift_id: int) -> Dict[str, Decimal]:
        stmt = (
            select(
                Order.payment_method, func.coalesce(func.sum(Return.refund_amount), 0)
            )
            .join(OrderItem, OrderItem.id == Return.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.shift_id == shift_id,
                Order.status == "completed",
                Order.deleted_at.is_(None),
            )
            .group_by(Order.payment_method)
        )
        rows = (await self.db.execute(stmt)).all()
        totals = {"cash": Decimal("0"), "card": Decimal("0"), "transfer": Decimal("0")}
        for payment_method, total in rows:
            if payment_method in totals:
                totals[payment_method] = Decimal(total)
        return totals

    async def _return_rows_for_shift(self, shift_id: int) -> List[Dict[str, Any]]:
        stmt = (
            select(
                Return.id,
                Order.id.label("order_id"),
                OrderItem.id.label("order_item_id"),
                OrderItem.product_name,
                Return.quantity,
                Return.refund_amount,
                Order.payment_method,
                Return.reason,
                Return.created_by,
                Return.created_at,
            )
            .join(OrderItem, OrderItem.id == Return.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.shift_id == shift_id,
                Order.status == "completed",
                Order.deleted_at.is_(None),
            )
            .order_by(Return.id.asc())
        )
        rows = (await self.db.execute(stmt)).all()
        return [
            {
                "id": r.id,
                "order_id": r.order_id,
                "order_item_id": r.order_item_id,
                "product_name": r.product_name,
                "quantity": r.quantity,
                "refund_amount": Decimal(r.refund_amount),
                "payment_method": r.payment_method,
                "reason": r.reason,
                "created_by": r.created_by,
                "created_at": r.created_at,
            }
            for r in rows
        ]

    async def _find_branch_names(self, branch_ids: List[int]) -> Dict[int, str]:
        unique_ids = list({b for b in branch_ids if b is not None})
        if not unique_ids:
            return {}
        stmt = select(Branch.id, Branch.name).where(Branch.id.in_(unique_ids))
        rows = (await self.db.execute(stmt)).all()
        return {r.id: r.name for r in rows}

    @staticmethod
    def _already_open_error() -> BusinessException:
        return BusinessException(
            "SHIFT_ALREADY_OPEN",
            409,
            "Chi nhánh đang có 1 ca làm việc chưa đóng, không thể mở ca mới.",
        )

    @staticmethod
    def _is_unique_violation(err: Exception) -> bool:
        orig = getattr(err, "orig", None)
        sqlstate = getattr(orig, "sqlstate", None)
        return sqlstate == "23505"

    def _to_dto(
        self,
        shift: Shift,
        branch_name: Optional[str] = None,
        user_full_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        closing_cash = (
            float(shift.closing_cash) if shift.closing_cash is not None else None
        )
        expected_cash = (
            float(shift.expected_cash) if shift.expected_cash is not None else None
        )

        cashiers = [
            {
                "id": su.user_id,
                "full_name": (
                    su.user.full_name if su.user else f"Thu ngân #{su.user_id}"
                ),
            }
            for su in (shift.shift_users or [])
        ]

        return {
            "id": shift.id,
            "branch_id": shift.branch_id,
            "branch_name": branch_name,
            "user_id": shift.user_id,
            "user_full_name": user_full_name,
            "opening_cash": float(shift.opening_cash),
            "closing_cash": closing_cash,
            "expected_cash": expected_cash,
            "cash_difference": (
                closing_cash - expected_cash
                if closing_cash is not None and expected_cash is not None
                else None
            ),
            "note": shift.note,
            "opened_at": _iso(shift.opened_at),
            "closed_at": _iso(shift.closed_at),
            "cashiers": cashiers,
        }
