from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional

class LoginDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., description="Email đăng nhập", example="admin@store.local")
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự", example="Admin@123")

class RefreshTokenDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(..., description="Refresh Token JWT")

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
