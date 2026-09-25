from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.schemas._base import InputSchema, UpdateSchema

SupplierName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
]
SupplierEmail = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=254)
]
SupplierPhone = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)
]


class SupplierCreate(InputSchema):
    name: SupplierName
    email: SupplierEmail | None = None
    phone: SupplierPhone | None = None
    address: str | None = None


class SupplierUpdate(UpdateSchema):
    non_nullable_fields = frozenset({"name"})

    name: SupplierName | None = None
    email: SupplierEmail | None = None
    phone: SupplierPhone | None = None
    address: str | None = None


class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    phone: str | None
    address: str | None
    created_at: datetime
    updated_at: datetime
