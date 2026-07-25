import re
from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional
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

    refresh_token: str = Field(..., description="Refresh Token JWT")

    @model_validator(mode="after")
    def _validate(self):
        if not self.refresh_token or not self.refresh_token.strip():
            raise BusinessException(
                "VALIDATION_ERROR", 400, "refresh_token: không được để trống"
            )
        return self


class UserAuthPayload(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


class LoginResponseDto(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: UserAuthPayload