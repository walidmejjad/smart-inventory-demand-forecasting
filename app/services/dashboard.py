from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    InventorySummaryResponse,
    RecentSaleResponse,
    SalesSummaryResponse,
    TopProductResponse,
)
from app.services.alerts import AlertService


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.repository = DashboardRepository(db)
        self.alerts = AlertService(db)

    def inventory_summary(self) -> InventorySummaryResponse:
        return InventorySummaryResponse(
            **self.repository.get_inventory_totals(),
            **self.alerts.summary().model_dump(),
        )

    def summary(self) -> DashboardSummaryResponse:
        inventory = self.inventory_summary()
        catalog = self.repository.get_catalog_counts()
        sales = self.repository.get_sales_totals()
        return DashboardSummaryResponse(
            **inventory.model_dump(), **catalog,
            total_sales_count=sales["total_sales"], total_revenue=sales["total_revenue"],
        )

    def recent_sales(self, limit: int) -> list[RecentSaleResponse]:
        return [
            RecentSaleResponse.model_validate(sale)
            for sale in self.repository.recent_sales(limit)
        ]

    def top_products(self, limit: int) -> list[TopProductResponse]:
        return [
            TopProductResponse.model_validate(product)
            for product in self.repository.top_products(limit)
        ]

    def sales_summary(self) -> SalesSummaryResponse:
        sales = self.repository.get_sales_totals()
        average = (
            (sales["total_revenue"] / sales["total_sales"]).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP,
            )
            if sales["total_sales"] else Decimal("0.00")
        )
        return SalesSummaryResponse(
            **sales, average_sale_value=average,
            total_units_sold=self.repository.get_total_units_sold(),
        )
