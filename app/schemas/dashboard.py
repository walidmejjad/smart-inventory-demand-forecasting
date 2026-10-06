from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.alerts import AlertSummaryResponse


class InventorySummaryResponse(AlertSummaryResponse):
    total_products: int
    total_units_in_stock: int


class DashboardSummaryResponse(InventorySummaryResponse):
    total_categories: int
    total_suppliers: int
    total_sales_count: int
    total_revenue: Decimal


class RecentSaleResponse(BaseModel):
    sale_id: int
    total_amount: Decimal
    created_by_id: int
    created_at: datetime
    item_count: int = Field(description="Number of sale-item lines, not units sold.")


class TopProductResponse(BaseModel):
    product_id: int
    name: str
    sku: str
    units_sold: int
    sales_revenue: Decimal


class SalesSummaryResponse(BaseModel):
    total_sales: int
    total_revenue: Decimal
    average_sale_value: Decimal = Field(
        description="Total revenue divided by sales count, rounded half up to two decimals."
    )
    total_units_sold: int
