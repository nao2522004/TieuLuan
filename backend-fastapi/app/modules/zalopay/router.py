import json
import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import ApiSuccessResponse
from app.db.session import get_db
from app.modules.auth.dependencies import AuthUser, get_current_user
from app.modules.orders.models import Order, OrderItem
from app.modules.products.batch_consumption_service import BatchConsumptionService
from app.modules.products.service import ProductService
from app.modules.returns.models import Return
from app.modules.zalopay.schemas import (
    CancelZaloPayOrderDto,
    CreateZaloPayOrderDto,
    QueryRefundStatusDto,
    QueryZaloPayOrderDto,
    RefundZaloPayOrderDto,
    ZaloPayCallbackDto,
)
from app.modules.zalopay.service import ZaloPayService, get_zalopay_service

logger = logging.getLogger("ZaloPayController")

router = APIRouter(prefix="/payment/zalopay", tags=["zalopay"])


@router.post(
    "/create-order",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Tạo đơn hàng ZaloPay trực tiếp",
)
async def create_order(
    dto: CreateZaloPayOrderDto,
    _user: AuthUser = Depends(get_current_user),
    zalopay: ZaloPayService = Depends(get_zalopay_service),
):
    data = await zalopay.create_order(dto)
    return ApiSuccessResponse(data=data)


@router.post(
    "/query-order",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Truy vấn trạng thái đơn hàng ZaloPay và cập nhật DB",
)
async def query_order(
    dto: QueryZaloPayOrderDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
    zalopay: ZaloPayService = Depends(get_zalopay_service),
):
    result = await zalopay.query_order(dto)

    # Nếu thanh toán thành công (return_code === 1)
    if result.get("return_code") == 1:
        app_trans_id = dto.app_trans_id
        zp_trans_id = str(result.get("zp_trans_id"))

        stmt = (
            select(Order)
            .where(Order.zalopay_app_trans_id == app_trans_id)
            .with_for_update()
        )
        order = (await db.execute(stmt)).scalars().first()

        if order and order.payment_status != "paid":
            order.payment_status = "paid"
            order.zalopay_zp_trans_id = zp_trans_id
            await db.commit()
            logger.info(f"Order ID={order.id} marked as PAID via queryOrder.")
        else:
            await db.rollback()

    return ApiSuccessResponse(data=result)


@router.post(
    "/cancel-order",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Hủy đơn hàng ZaloPay và hoàn lại tồn kho",
)
async def cancel_order(
    dto: CancelZaloPayOrderDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
    zalopay: ZaloPayService = Depends(get_zalopay_service),
):
    result = await zalopay.cancel_order(dto)

    if result.get("return_code") == 1:
        app_trans_id = dto.app_trans_id
        batch_service = BatchConsumptionService(db)
        product_service = ProductService(db)

        stmt = (
            select(Order)
            .where(Order.zalopay_app_trans_id == app_trans_id)
            .with_for_update()
        )
        order = (await db.execute(stmt)).scalars().first()

        updated_order = None
        item_product_ids: list[int] = []

        if order and order.status != "cancelled":
            items_stmt = select(OrderItem).where(OrderItem.order_id == order.id)
            order_items = list((await db.execute(items_stmt)).scalars().all())
            sorted_items = sorted(order_items, key=lambda it: it.product_id)

            for item in sorted_items:
                await batch_service.restore_exact_batches(item.id, item.product_id)
                item_product_ids.append(item.product_id)

            order.status = "cancelled"
            await db.commit()
            await db.refresh(order)
            updated_order = order
        elif order:
            updated_order = order
            await db.rollback()
        else:
            await db.rollback()

        # Evict cache sau khi transaction
        for product_id in item_product_ids:
            try:
                await product_service.evict_cache_for_product(product_id)
            except Exception as exc:
                logger.warning(
                    f"Failed to evict cache for product ID={product_id}: {exc}"
                )

        if updated_order and item_product_ids:
            logger.info(
                f"Order ID={updated_order.id} cancelled due to ZaloPay cancellation."
            )

    return ApiSuccessResponse(data=result)


@router.post(
    "/refund",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Hoàn tiền giao dịch ZaloPay và cập nhật Return record",
)
async def refund(
    dto: RefundZaloPayOrderDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
    zalopay: ZaloPayService = Depends(get_zalopay_service),
):
    result = await zalopay.refund(dto)

    if result.get("return_code") == 1 and dto.return_id:
        return_id = dto.return_id
        m_refund_id = result.get("m_refund_id")
        refund_id = str(result.get("refund_id") or "")

        await db.execute(
            update(Return)
            .where(Return.id == return_id)
            .values(
                zalopay_m_refund_id=m_refund_id,
                zalopay_refund_id=refund_id,
                zalopay_refund_status="pending",
            )
        )
        await db.commit()
        logger.info(
            f"Return ID={return_id} updated with ZaloPay m_refund_id={m_refund_id} (status: pending)."
        )

    return ApiSuccessResponse(data=result)


@router.post(
    "/query-refund-status",
    status_code=status.HTTP_200_OK,
    response_model=ApiSuccessResponse[dict],
    summary="Truy vấn trạng thái hoàn tiền ZaloPay và cập nhật Return",
)
async def query_refund_status(
    dto: QueryRefundStatusDto,
    db: AsyncSession = Depends(get_db),
    _user: AuthUser = Depends(get_current_user),
    zalopay: ZaloPayService = Depends(get_zalopay_service),
):
    result = await zalopay.query_refund_status(dto)
    m_refund_id = dto.m_refund_id

    if result.get("return_code") == 1:
        await db.execute(
            update(Return)
            .where(Return.zalopay_m_refund_id == m_refund_id)
            .values(zalopay_refund_status="success")
        )
        await db.commit()
        logger.info(f"Return with m_refund_id={m_refund_id} marked as refund success.")
    elif result.get("return_code") == 2:
        await db.execute(
            update(Return)
            .where(Return.zalopay_m_refund_id == m_refund_id)
            .values(zalopay_refund_status="failed")
        )
        await db.commit()
        logger.info(f"Return with m_refund_id={m_refund_id} marked as refund failed.")

    return ApiSuccessResponse(data=result)


@router.post(
    "/callback",
    status_code=status.HTTP_200_OK,
    summary="Webhook nhận kết quả thanh toán từ ZaloPay",
)
async def callback(
    body: ZaloPayCallbackDto,
    db: AsyncSession = Depends(get_db),
    zalopay: ZaloPayService = Depends(get_zalopay_service),
):
    is_valid = zalopay.verify_callback(body.data, body.mac)

    if not is_valid:
        logger.warning("Invalid ZaloPay callback MAC")
        return {"return_code": -1, "return_message": "mac not equal"}

    try:
        order_data = json.loads(body.data)
        app_trans_id = order_data.get("app_trans_id")
        zp_trans_id = str(order_data.get("zp_trans_id"))

        logger.info(
            f"Callback OK - app_trans_id={app_trans_id}, "
            f"amount={order_data.get('amount')}, zp_trans_id={zp_trans_id}"
        )

        stmt = (
            select(Order)
            .where(Order.zalopay_app_trans_id == app_trans_id)
            .with_for_update()
        )
        order = (await db.execute(stmt)).scalars().first()

        if not order:
            raise ValueError(f"Order not found for zalopayAppTransId={app_trans_id}")

        if order.payment_status == "paid":
            logger.info(f"Order ID={order.id} is already paid. Skipping.")
            await db.rollback()
        else:
            order.payment_status = "paid"
            order.zalopay_zp_trans_id = zp_trans_id
            await db.commit()
            logger.info(f"Order ID={order.id} payment status updated to paid.")

        return {"return_code": 1, "return_message": "success"}
    except Exception as error:
        await db.rollback()
        logger.error(f"Callback processing error: {error}")
        return {"return_code": 0, "return_message": str(error)}
