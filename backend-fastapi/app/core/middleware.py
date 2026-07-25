import uuid
import time
import json
import logging
from pathlib import Path as FilePath
from fastapi import Request

logger = logging.getLogger("HTTP")
LOG_FILE = FilePath("app.log")


async def trace_id_middleware(request: Request, call_next):
    trace_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.trace_id = trace_id
    request.state.request_id = trace_id          # alias cho các service dùng request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = trace_id
    return response


async def http_logger_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    status = response.status_code
    level = "error" if status >= 500 else ("warn" if status >= 400 else "info")

    entry = {
        "level": level,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "requestId": getattr(request.state, "trace_id", None),
        "method": request.method,
        "url": str(request.url.path),
        "statusCode": status,
        "durationMs": duration_ms,
        "userAgent": request.headers.get("user-agent"),
        "ip": request.client.host if request.client else None,
    }

    line = json.dumps(entry, ensure_ascii=False)
    logger.info(line)

    # Ghi file app.log (bất đồng bộ nhẹ — fire-and-forget)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

    return response
