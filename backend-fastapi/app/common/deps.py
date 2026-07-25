from fastapi import Path
from app.core.exceptions import BusinessException


def valid_id(id: int = Path(..., ge=1)) -> int:
    return id
