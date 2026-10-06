from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models import Category, Product, Sale, SaleItem, Supplier


class DashboardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_inventory_totals(self) -> RowMapping:
        statement = select(
            func.count(Product.id).label("total_products"),
            func.coalesce(func.sum(Product.quantity_in_stock), 0).label("total_units_in_stock"),
        )
        return self.db.execute(statement).mappings().one()

    def get_catalog_counts(self) -> RowMapping:
        statement = select(
            select(func.count()).select_from(Category).scalar_subquery().label("total_categories"),
            select(func.count()).select_from(Supplier).scalar_subquery().label("total_suppliers"),
        )
        return self.db.execute(statement).mappings().one()

    def get_sales_totals(self) -> RowMapping:
        # Aggregate sales separately from items so multi-item sales count only once.
        statement = select(
            func.count(Sale.id).label("total_sales"),
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")).label("total_revenue"),
        )
        return self.db.execute(statement).mappings().one()

    def get_total_units_sold(self) -> int:
        return self.db.scalar(select(func.coalesce(func.sum(SaleItem.quantity), 0)))

    def recent_sales(self, limit: int) -> list[RowMapping]:
        statement = (
            select(
                Sale.id.label("sale_id"), Sale.total_amount, Sale.created_by_id, Sale.created_at,
                func.count(SaleItem.id).label("item_count"),
            )
            .outerjoin(SaleItem, SaleItem.sale_id == Sale.id)
            .group_by(Sale.id, Sale.total_amount, Sale.created_by_id, Sale.created_at)
            .order_by(Sale.created_at.desc(), Sale.id.desc())
            .limit(limit)
        )
        return list(self.db.execute(statement).mappings())

    def top_products(self, limit: int) -> list[RowMapping]:
        units_sold = func.sum(SaleItem.quantity).label("units_sold")
        statement = (
            select(
                Product.id.label("product_id"), Product.name, Product.sku, units_sold,
                func.sum(SaleItem.subtotal).label("sales_revenue"),
            )
            .join(SaleItem, SaleItem.product_id == Product.id)
            .group_by(Product.id, Product.name, Product.sku)
            .order_by(units_sold.desc(), Product.id)
            .limit(limit)
        )
        return list(self.db.execute(statement).mappings())
