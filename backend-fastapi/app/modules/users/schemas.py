from typing import List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

RoleCode = Literal["admin", "leader", "cashier"]


class CreateUserDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(..., min_length=1, max_length=150, examples=["Nguyễn Văn A"])
    email: EmailStr = Field(..., examples=["cashier3@store.local"])
    password: str = Field(..., min_length=6, examples=["MatKhau@123"])
    branch_id: Optional[int] = Field(None, gt=0)
    role_codes: Optional[List[RoleCode]] = Field(None, min_length=1)


class UpdateUserDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    branch_id: Optional[int] = Field(None, gt=0)
    role_codes: Optional[List[RoleCode]] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class ChangePasswordDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


class ResetPasswordDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    new_password: str = Field(..., min_length=6)
