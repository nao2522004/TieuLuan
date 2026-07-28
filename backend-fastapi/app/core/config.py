import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    PORT: int = Field(default=8000)
    TZ: str = Field(default="UTC")

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5434/store_fastapi"
    )
    REDIS_URL: str = Field(default="redis://localhost:6381")
    REDIS_CACHE_TTL: int = Field(default=3600)

    JWT_ACCESS_SECRET: str = Field(default="super_secret_jwt_key_store_fastapi_2026")
    JWT_REFRESH_SECRET: str = Field(
        default="super_secret_refresh_jwt_key_store_fastapi_2026"
    )
    JWT_SECRET: str = Field(default="super_secret_jwt_key_store_fastapi_2026")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRATION: int = Field(default=3600)
    REFRESH_TOKEN_EXPIRATION: int = Field(default=604800)

    PRODUCT_EXPIRY_ALERT_DAYS: int = Field(default=7)

    ENVIRONMENT: str = Field(default="development")

    ZALOPAY_APP_ID: str = Field(default="2553")
    ZALOPAY_MAC_KEY: str = Field(default="PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL")
    ZALOPAY_REFUND_KEY: str = Field(default="kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz")
    ZALOPAY_CREATE_ORDER_URL: str = Field(
        default="https://sb-openapi.zalopay.vn/v2/create"
    )
    ZALOPAY_QUERY_ORDER_URL: str = Field(
        default="https://sb-openapi.zalopay.vn/v2/query"
    )
    ZALOPAY_SERVER_URL: str = Field(
        default="https://clash-washtub-smashing.ngrok-free.dev"
    )
    ZALOPAY_CLIENT_URL: str = Field(default="http://localhost:3000")


settings = Settings()
