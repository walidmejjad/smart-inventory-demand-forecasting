from sqlalchemy.orm import Session

from app.repositories.product import ProductRepository
from app.schemas.alerts import AlertSummaryResponse, StockAlertResponse


class AlertService:
    def __init__(self, db: Session) -> None:
        self.repository = ProductRepository(db)

    def list_low_stock(self) -> list[StockAlertResponse]:
        return [
            StockAlertResponse(
                product_id=product.id,
                name=product.name,
                sku=product.sku,
                quantity_in_stock=product.quantity_in_stock,
                reorder_level=product.reorder_level,
                status="OUT_OF_STOCK" if product.quantity_in_stock == 0 else "LOW_STOCK",
            )
            for product in self.repository.list_low_stock()
        ]

    def summary(self) -> AlertSummaryResponse:
        low_stock_count, out_of_stock_count = self.repository.get_stock_alert_counts()
        return AlertSummaryResponse(
            low_stock_count=low_stock_count,
            out_of_stock_count=out_of_stock_count,
        )
