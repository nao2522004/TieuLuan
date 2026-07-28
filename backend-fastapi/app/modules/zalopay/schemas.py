from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CreateZaloPayOrderDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_user: str = Field(..., min_length=1, examples=["user123"])
    amount: int = Field(..., ge=1, examples=[50000])
    description: str = Field(..., min_length=1, examples=["Thanh toan don hang #123"])
    embed_data: Optional[Dict[str, Any]] = Field(default=None)
    item: Optional[List[Any]] = Field(default=None)


class QueryZaloPayOrderDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_trans_id: str = Field(..., min_length=1, examples=["240715_12345678"])


class CancelZaloPayOrderDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_trans_id: str = Field(..., min_length=1, examples=["240715_12345678"])


class RefundZaloPayOrderDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zp_trans_id: str = Field(..., min_length=1, examples=["240715150000123"])
    amount: int = Field(..., ge=1, examples=[50000])
    description: str = Field(..., min_length=1, examples=["Hoan tien do loi san pham"])
    refund_fee_amount: Optional[int] = Field(default=None, ge=0)
    return_id: Optional[int] = Field(default=None)


class QueryRefundStatusDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    m_refund_id: str = Field(..., min_length=1, examples=["240715_2553_123456789"])


class ZaloPayCallbackDto(BaseModel):
    """Payload webhook thô từ ZaloPay Server - không cấu hình extra=forbid vì đây
    là dữ liệu từ bên thứ ba, phải xác thực bằng mac trước khi tin tưởng nội dung."""

    data: str
    mac: str
    type: Optional[int] = None
