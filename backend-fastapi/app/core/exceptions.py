import logging
from uuid import uuid4

from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("ExceptionFilter")


class AppException(Exception):
    """Lỗi nghiệp vụ - luôn có error_code riêng, KHÔNG bị đè thành INTERNAL_ERROR
    trừ khi thực sự không xác định được (Mục 5.1 - pass-through error code)."""

    def __init__(self, error_code: str, status_code: int, message: str):
        self.error_code = error_code
        self.status_code = status_code
        self.message = message


def _error_body(code: str, message: str, trace_id: str) -> dict:
    return {
        "success": False,
        "error": {"code": code, "message": message},
        "timestamp": _now_iso(),
        "trace_id": trace_id,
    }


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def _flatten_validation_errors(errors: list) -> str:
    """Map lỗi Pydantic sang format chung '<field>: <lý do>' (Mục 4 ruleset -
    KHÔNG để lộ format mảng loc/msg/type mặc định của Pydantic ra API)."""
    parts = []
    for err in errors:
        loc = err.get("loc", [])
        # bỏ phần "body"/"query"/"path" đầu tiên trong loc cho gọn
        field = ".".join(str(p) for p in loc if p not in ("body", "query", "path"))
        parts.append(f"{field}: {err.get('msg')}")
    return ", ".join(parts)


def register_exception_handlers(app) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        trace_id = getattr(request.state, "request_id", str(uuid4()))
        logger.warning(f"[{trace_id}] {request.method} {request.url.path} -> {exc.error_code}: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.error_code, exc.message, trace_id),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        trace_id = getattr(request.state, "request_id", str(uuid4()))
        message = _flatten_validation_errors(jsonable_encoder(exc.errors()))
        logger.warning(f"[{trace_id}] {request.method} {request.url.path} -> VALIDATION_ERROR: {message}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error_body("VALIDATION_ERROR", message, trace_id),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        trace_id = getattr(request.state, "request_id", str(uuid4()))
        code_map = {
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            429: "RATE_LIMIT_EXCEEDED",
        }
        code = code_map.get(exc.status_code, "INTERNAL_ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(code, str(exc.detail), trace_id),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        trace_id = getattr(request.state, "request_id", str(uuid4()))
        logger.error(f"[{trace_id}] {request.method} {request.url.path} -> {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                "INTERNAL_ERROR",
                "Đã có lỗi xảy ra ở hệ thống. Vui lòng thử lại sau.",
                trace_id,
            ),
        )