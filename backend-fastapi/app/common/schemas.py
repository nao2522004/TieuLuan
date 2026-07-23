from typing import Generic, TypeVar, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field

T = TypeVar("T")

class PaginationMeta(BaseModel):
    current_page: int = Field(..., example=1)
    limit: int = Field(..., example=10)
    total_items: int = Field(..., example=150)
    total_pages: int = Field(..., example=15)

class ApiSuccessResponse(BaseModel, Generic[T]):
    """Standard Success Response Format - Tương thích 100% với ResponseInterceptor của NestJS"""
    success: bool = Field(default=True)
    data: T
    meta: Optional[PaginationMeta] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ErrorDetails(BaseModel):
    code: str = Field(..., example="VALIDATION_ERROR")
    message: str = Field(..., example="email: must be a valid email")

class ApiErrorResponse(BaseModel):
    """Standard Error Response Format - Tương thích 100% với AllExceptionsFilter của NestJS"""
    success: bool = Field(default=False)
    error: ErrorDetails
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    trace_id: str = Field(..., example="req-550e8400-e29b-41d4-a716-446655440000")
