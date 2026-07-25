import time
from collections import defaultdict
from fastapi import Request
from app.core.exceptions import BusinessException

_hits: dict[str, list[float]] = defaultdict(list)
LIMIT = 5
WINDOW_SECONDS = 60


async def login_rate_limiter(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - WINDOW_SECONDS

    hits = [t for t in _hits[ip] if t > window_start]
    if len(hits) >= LIMIT:
        raise BusinessException(
            "RATE_LIMIT_EXCEEDED", 429, "ThrottlerException: Too Many Requests"
        )

    hits.append(now)
    _hits[ip] = hits