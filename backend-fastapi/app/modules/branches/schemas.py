from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CreateBranchDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=150, examples=["Chi nhánh Quận 1"])
    address: Optional[str] = Field(
        None, max_length=255, examples=["123 Lê Lợi, Q.1, TP.HCM"]
    )
    phone: Optional[str] = Field(None, max_length=20, examples=["028-1234-5678"])
    is_active: Optional[bool] = Field(default=True, examples=[True])
    bank_bin: Optional[str] = Field(
        None,
        max_length=10,
        examples=["970422"],
        description="Mã BIN ngân hàng theo chuẩn Napas (VD: 970422 = MB Bank)",
    )
    bank_account_no: Optional[str] = Field(None, max_length=30, examples=["0123456789"])
    bank_account_name: Optional[str] = Field(
        None,
        max_length=150,
        examples=["NGUYEN VAN A"],
        description="Tên chủ tài khoản, không dấu, đúng chuẩn VietQR",
    )


class UpdateBranchDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, min_length=1, max_length=150)
    address: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    bank_bin: Optional[str] = Field(None, max_length=10)
    bank_account_no: Optional[str] = Field(None, max_length=30)
    bank_account_name: Optional[str] = Field(None, max_length=150)


class BranchDto(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    bank_bin: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_account_name: Optional[str] = None
    created_at: str
    updated_at: str
