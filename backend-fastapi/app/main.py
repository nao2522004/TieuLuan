import time
import uuid
import os
os.environ["TZ"] = "UTC"

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import BusinessException
from app.core.middleware import trace_id_middleware
from app.modules.health.router import router as health_router
from app.modules.auth.router import router as auth_router
from app.modules.products.router import router as product_router

app = FastAPI(
    title="Store Management API - FastAPI",
    description="API quản lý cửa hàng tiện lợi mini (Đảm bảo 100% API Contract & Response Format đồng nhất với NestJS)",
    version="1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(trace_id_middleware)

@app.exception_handler(BusinessException)
async def business_exception_handler(request: Request, exc: BusinessException):
    """Xử lý lỗi nghiệp vụ BusinessException tùy biến."""
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "trace_id": trace_id
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Bắt lỗi validate Pydantic và map thành 400 Bad Request với format string trùng NestJS."""
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    
    error_messages = []
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        msg = error["msg"]
        error_messages.append(f"{field_path}: {msg}" if field_path else msg)
        
    formatted_message = ", ".join(error_messages)

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": formatted_message
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "trace_id": trace_id
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Bắt lỗi HTTP tiêu chuẩn (404, 401, 403...)."""
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    
    code_map = {
        400: "VALIDATION_ERROR",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        429: "RATE_LIMIT_EXCEEDED"
    }
    code = code_map.get(exc.status_code, "INTERNAL_ERROR")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": str(exc.detail)
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "trace_id": trace_id
        }
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    """Bắt lỗi không mong muốn (500)."""
    trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Đã có lỗi xảy ra ở hệ thống. Vui lòng thử lại sau."
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "trace_id": trace_id
        }
    )

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(product_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
