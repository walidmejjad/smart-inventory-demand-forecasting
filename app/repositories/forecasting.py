from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models import Sale, SaleItem


class ForecastingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def daily_demand(self, product_id: int, end_date: date) -> list[RowMapping]:
        # PostgreSQL timestamptz must be converted before extracting its UTC date.
        timestamp = Sale.created_at
        if self.db.get_bind().dialect.name == "postgresql":
            timestamp = func.timezone("UTC", Sale.created_at)
        day = func.date(timestamp)
        cutoff = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
        statement = (
            select(day.label("date"), func.sum(SaleItem.quantity).label("quantity_sold"))
            .select_from(SaleItem)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(SaleItem.product_id == product_id, Sale.created_at < cutoff)
            .group_by(day)
            .order_by(day)
        )
        return list(self.db.execute(statement).mappings())
