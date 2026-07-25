import re
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.core.exceptions import BusinessException

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., examples=["admin@store.local"])
    password: str = Field(..., examples=["Admin@123"])

    @model_validator(mode="after")
    def _validate(self):
        errors = []
        if not self.email or not self.email.strip():
            errors.append("email: không được để trống")
        elif not _EMAIL_RE.match(self.email):
            errors.append("email: phải là email hợp lệ")

        if not self.password or not self.password.strip():
            errors.append("password: không được để trống")

        if errors:
            raise BusinessException("VALIDATION_ERROR", 400, ", ".join(errors))
        return self


class RefreshTokenDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(..., description="Refresh token dạng hex 96 ký tự")

    @model_validator(mode="after")
    def _validate(self):
        if not self.refresh_token or not self.refresh_token.strip():
            raise BusinessException(
                "VALIDATION_ERROR", 400, "refresh_token: không được để trống"
            )
        return self


class PublicUserDto(BaseModel):
    id: int = Field(..., examples=[1])
    full_name: str = Field(..., examples=["Quản trị viên"])
    email: str = Field(..., examples=["admin@store.local"])
    roles: List[str] = Field(
        ...,
        examples=[["admin"]],
        description="Danh sách roles của user — 1 user có thể có nhiều role đồng thời.",
    )
    is_active: bool = Field(..., examples=[True])
    branch_id: Optional[int] = Field(
        None,
        examples=[1],
        description="ID chi nhánh — null nếu là admin toàn hệ thống.",
    )
    created_at: str = Field(..., examples=["2026-07-11T10:00:00.000Z"])


class LoginDataDto(BaseModel):
    user: PublicUserDto
    access_token: str = Field(..., examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."])
    refresh_token: str = Field(..., examples=["9f1c2e4b7a...(hex 96 ký tự)"])


class RefreshResultDto(BaseModel):
    access_token: str
    refresh_token: str


class MessageResultDto(BaseModel):
    message: str
