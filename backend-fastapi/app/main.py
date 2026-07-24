import os
os.environ["TZ"] = "UTC"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.exceptions import register_exception_handlers
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

# Đăng ký tất cả exception handlers từ exceptions.py
register_exception_handlers(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(product_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
