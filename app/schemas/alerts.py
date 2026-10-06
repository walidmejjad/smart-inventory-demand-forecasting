from typing import Literal

from pydantic import BaseModel, Field


class StockAlertResponse(BaseModel):
    product_id: int
    name: str
    sku: str
    quantity_in_stock: int
    reorder_level: int
    status: Literal["LOW_STOCK", "OUT_OF_STOCK"]


class AlertSummaryResponse(BaseModel):
    low_stock_count: int = Field(
        description="Products with 0 < quantity_in_stock <= reorder_level."
    )
    out_of_stock_count: int = Field(
        description="Products with quantity_in_stock == 0."
    )
