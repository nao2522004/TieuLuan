import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.core.exceptions import BusinessException
from app.modules.zalopay.hmac_util import hmac_sha256
from app.modules.zalopay.schemas import (
    CancelZaloPayOrderDto,
    CreateZaloPayOrderDto,
    QueryRefundStatusDto,
    QueryZaloPayOrderDto,
    RefundZaloPayOrderDto,
)

logger = logging.getLogger("ZaloPayService")

_VN_OFFSET = timedelta(hours=7)


def _now_ms() -> int:
    return int(time.time() * 1000)


class ZaloPayService:
    def __init__(self) -> None:
        self.app_id = settings.ZALOPAY_APP_ID
        self.key1 = settings.ZALOPAY_MAC_KEY
        self.key2 = settings.ZALOPAY_REFUND_KEY

        create_url = settings.ZALOPAY_CREATE_ORDER_URL
        self.endpoint = create_url.rsplit("/", 1)[0]

        server_url = settings.ZALOPAY_SERVER_URL
        self.callback_url = f"{server_url}/payment/zalopay/callback"

    def generate_app_trans_id(self) -> str:
        vn_time = datetime.now(timezone.utc) + _VN_OFFSET
        return f"{vn_time:%y%m%d}_{_now_ms()}"

    def generate_m_refund_id(self) -> str:
        vn_time = datetime.now(timezone.utc) + _VN_OFFSET
        return f"{vn_time:%y%m%d}_{self.app_id}_{_now_ms()}"

    async def create_order(self, dto: CreateZaloPayOrderDto) -> Dict[str, Any]:
        app_trans_id = self.generate_app_trans_id()
        app_time = _now_ms()
        embed_data = _json_dumps(dto.embed_data or {})
        item = _json_dumps(dto.item or [])

        hmac_input = "|".join(
            str(v)
            for v in [
                self.app_id,
                app_trans_id,
                dto.app_user,
                dto.amount,
                app_time,
                embed_data,
                item,
            ]
        )
        mac = hmac_sha256(hmac_input, self.key1)

        payload = {
            "app_id": int(self.app_id),
            "app_user": dto.app_user,
            "app_trans_id": app_trans_id,
            "app_time": app_time,
            "amount": dto.amount,
            "description": dto.description,
            "item": item,
            "embed_data": embed_data,
            "callback_url": self.callback_url,
            "mac": mac,
        }

        result = await self._post("/create", payload, "createOrder")
        return {**result, "app_trans_id": app_trans_id}

    async def query_order(self, dto: QueryZaloPayOrderDto) -> Dict[str, Any]:
        hmac_input = f"{self.app_id}|{dto.app_trans_id}|{self.key1}"
        mac = hmac_sha256(hmac_input, self.key1)

        payload = {
            "app_id": int(self.app_id),
            "app_trans_id": dto.app_trans_id,
            "mac": mac,
        }
        return await self._post("/query", payload, "queryOrder")

    async def cancel_order(self, dto: CancelZaloPayOrderDto) -> Dict[str, Any]:
        hmac_input = f"{self.app_id}|{dto.app_trans_id}|{self.key1}"
        mac = hmac_sha256(hmac_input, self.key1)

        payload = {
            "app_id": int(self.app_id),
            "app_trans_id": dto.app_trans_id,
            "mac": mac,
        }
        return await self._post("/cancel", payload, "cancelOrder")

    async def refund(self, dto: RefundZaloPayOrderDto) -> Dict[str, Any]:
        m_refund_id = self.generate_m_refund_id()
        timestamp = _now_ms()

        if dto.refund_fee_amount is not None:
            hmac_input = "|".join(
                str(v)
                for v in [
                    self.app_id,
                    dto.zp_trans_id,
                    dto.amount,
                    dto.refund_fee_amount,
                    dto.description,
                    timestamp,
                ]
            )
        else:
            hmac_input = "|".join(
                str(v)
                for v in [
                    self.app_id,
                    dto.zp_trans_id,
                    dto.amount,
                    dto.description,
                    timestamp,
                ]
            )

        mac = hmac_sha256(hmac_input, self.key1)

        payload: Dict[str, Any] = {
            "app_id": int(self.app_id),
            "m_refund_id": m_refund_id,
            "zp_trans_id": dto.zp_trans_id,
            "amount": dto.amount,
            "timestamp": timestamp,
            "description": dto.description,
            "mac": mac,
        }
        if dto.refund_fee_amount is not None:
            payload["refund_fee_amount"] = dto.refund_fee_amount

        result = await self._post("/refund", payload, "refund")
        return {**result, "m_refund_id": m_refund_id}

    async def query_refund_status(self, dto: QueryRefundStatusDto) -> Dict[str, Any]:
        timestamp = _now_ms()
        hmac_input = f"{self.app_id}|{dto.m_refund_id}|{timestamp}"
        mac = hmac_sha256(hmac_input, self.key1)

        payload = {
            "app_id": int(self.app_id),
            "m_refund_id": dto.m_refund_id,
            "timestamp": timestamp,
            "mac": mac,
        }
        return await self._post("/query_refund", payload, "queryRefundStatus")

    def verify_callback(self, data: str, req_mac: str) -> bool:
        mac = hmac_sha256(data, self.key2)
        return mac == req_mac

    async def _post(
        self, path: str, payload: Dict[str, Any], op_name: str
    ) -> Dict[str, Any]:
        url = f"{self.endpoint}{path}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            logger.error(f"ZaloPay {op_name} failed: {exc.response.text}")
            raise
        except Exception as exc:
            logger.error(f"ZaloPay {op_name} failed: {exc}")
            raise


def _json_dumps(value: Any) -> str:
    import json

    return json.dumps(value, ensure_ascii=False)


_zalopay_service: Optional[ZaloPayService] = None


def get_zalopay_service() -> ZaloPayService:
    global _zalopay_service
    if _zalopay_service is None:
        _zalopay_service = ZaloPayService()
    return _zalopay_service
