import logging
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("RedisService")

_client: Optional[aioredis.Redis] = None


def get_redis_client() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _client


class RedisService:
    def __init__(self):
        self._client = get_redis_client()

    async def get(self, key: str) -> Optional[str]:
        try:
            return await self._client.get(key)
        except Exception as e:
            logger.warning(f"Redis GET lỗi (fallback DB): {e}")
            return None

    async def set(self, key: str, value: str, ttl_seconds: int) -> None:
        try:
            await self._client.set(key, value, ex=ttl_seconds)
        except Exception as e:
            logger.warning(f"Redis SET lỗi (bỏ qua cache): {e}")

    async def delete(self, *keys: str) -> None:
        if not keys:
            return
        try:
            await self._client.delete(*keys)
        except Exception as e:
            logger.warning(f"Redis DEL lỗi: {e}")

    async def keys(self, pattern: str) -> list[str]:
        try:
            return await self._client.keys(pattern)
        except Exception as e:
            logger.warning(f"Redis KEYS lỗi: {e}")
            return []

    async def exists(self, key: str) -> bool:
        try:
            return bool(await self._client.exists(key))
        except Exception as e:
            logger.warning(f"Redis EXISTS lỗi: {e}")
            return False


# Singleton instance dùng trong Depends()
_redis_service: Optional[RedisService] = None


def get_redis() -> RedisService:
    global _redis_service
    if _redis_service is None:
        _redis_service = RedisService()
    return _redis_service
