import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PORT: int = Field(default=8000)
    TZ: str = Field(default="UTC")

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5434/store_fastapi"
    )
    REDIS_URL: str = Field(default="redis://localhost:6381")

    JWT_SECRET: str = Field(default="super_secret_jwt_key_store_fastapi_2026")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRATION: int = Field(default=3600)  
    REFRESH_TOKEN_EXPIRATION: int = Field(default=604800)  # 7 days

    ENVIRONMENT: str = Field(default="development")

settings = Settings()
