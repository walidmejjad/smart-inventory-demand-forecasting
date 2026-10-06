from datetime import datetime
from decimal import Decimal
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas._base import InputSchema
from app.schemas.product import ReferenceId


class SaleItemCreate(InputSchema):
    product_id: ReferenceId
    quantity: Annotated[int, Field(gt=0, le=2147483647, strict=True)]


class SaleCreate(InputSchema):
    items: Annotated[list[SaleItemCreate], Field(min_length=1)]

    @model_validator(mode="after")
    def reject_duplicate_products(self) -> Self:
        product_ids = [item.product_id for item in self.items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Duplicate product IDs are not allowed; use one item per product")
        return self


class SaleItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class SaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: int
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    items: list[SaleItemResponse]
