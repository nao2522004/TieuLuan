from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CreateCategoryDto(BaseModel):
    model_config = ConfigDict(extra="forbid")  # chống Mass Assignment (Mục 4 ruleset)

    name: str = Field(..., min_length=1, max_length=150, examples=["Đồ uống"])
    description: Optional[str] = Field(
        None, max_length=255, examples=["Nước ngọt, bia, nước suối..."]
    )
    is_active: Optional[bool] = Field(default=True, examples=[True])


class UpdateCategoryDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class CategoryDto(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: str
    updated_at: str
