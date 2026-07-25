from datetime import datetime, timezone
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


def _now_iso_z() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


class PaginationMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_page: int = Field(..., examples=[1])
    limit: int = Field(..., examples=[10])
    total_items: int = Field(..., examples=[150])
    total_pages: int = Field(..., examples=[15])


class ApiSuccessResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(populate_by_name=True)

    success: bool = Field(default=True)
    data: T
    meta: Optional[PaginationMeta] = None
    timestamp: str = Field(default_factory=_now_iso_z)


class ErrorDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., examples=["VALIDATION_ERROR"])
    message: str = Field(..., examples=["email: must be a valid email"])


class ApiErrorResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: bool = Field(default=False)
    error: ErrorDetails
    timestamp: str = Field(default_factory=_now_iso_z)
    trace_id: str = Field(
        ...,
        examples=["req-550e8400-e29b-41d4-a716-446655440000"],
    )