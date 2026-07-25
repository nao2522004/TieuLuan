from pydantic import BaseModel

class RoleDto(BaseModel):
    id: int
    code: str
    name: str
    description: str | None = None
    createdAt: str
    updatedAt: str