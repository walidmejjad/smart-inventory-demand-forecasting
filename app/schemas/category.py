from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.schemas._base import InputSchema, UpdateSchema

CategoryName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]


class CategoryCreate(InputSchema):
    name: CategoryName
    description: str | None = None


class CategoryUpdate(UpdateSchema):
    non_nullable_fields = frozenset({"name"})

    name: CategoryName | None = None
    description: str | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
