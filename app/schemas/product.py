from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas._base import InputSchema, UpdateSchema

ProductName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
]
ProductSKU = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
ProductPrice = Annotated[
    Decimal, Field(ge=0, max_digits=12, decimal_places=2, allow_inf_nan=False)
]
StockCount = Annotated[int, Field(ge=0, strict=True)]
ReferenceId = Annotated[int, Field(gt=0, strict=True)]


class ProductCreate(InputSchema):
    name: ProductName
    sku: ProductSKU
    description: str | None = None
    price: ProductPrice
    quantity_in_stock: StockCount = 0
    reorder_level: StockCount = 0
    category_id: ReferenceId
    supplier_id: ReferenceId


class ProductUpdate(UpdateSchema):
    non_nullable_fields = frozenset(
        {"name", "sku", "price", "quantity_in_stock", "reorder_level",
         "category_id", "supplier_id"}
    )

    name: ProductName | None = None
    sku: ProductSKU | None = None
    description: str | None = None
    price: ProductPrice | None = None
    quantity_in_stock: StockCount | None = None
    reorder_level: StockCount | None = None
    category_id: ReferenceId | None = None
    supplier_id: ReferenceId | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    description: str | None
    price: Decimal
    quantity_in_stock: int
    reorder_level: int
    category_id: int
    supplier_id: int
    created_at: datetime
    updated_at: datetime
