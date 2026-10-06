from sqlalchemy import func, select

from app.models import Product
from app.repositories._base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    model = Product

    def get_by_sku(self, sku: str) -> Product | None:
        return self.db.scalar(select(Product).where(Product.sku == sku))

    def list_low_stock(self) -> list[Product]:
        statement = (
            select(Product)
            .where(Product.quantity_in_stock <= Product.reorder_level)
            .order_by(Product.id)
        )
        return list(self.db.scalars(statement))

    def get_stock_alert_counts(self) -> tuple[int, int]:
        statement = select(
            func.count().filter(Product.quantity_in_stock > 0),
            func.count().filter(Product.quantity_in_stock == 0),
        ).where(Product.quantity_in_stock <= Product.reorder_level)
        low_stock_count, out_of_stock_count = self.db.execute(statement).one()
        return low_stock_count, out_of_stock_count

    def get_for_sale(self, product_ids: list[int]) -> list[Product]:
        # Consistent lock order prevents deadlocks between overlapping sales.
        statement = (
            select(Product).where(Product.id.in_(product_ids)).order_by(Product.id)
            .with_for_update().execution_options(populate_existing=True)
        )
        return list(self.db.scalars(statement))
