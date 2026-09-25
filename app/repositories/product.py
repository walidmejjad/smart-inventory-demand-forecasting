from sqlalchemy import select

from app.models import Product
from app.repositories._base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    model = Product

    def get_by_sku(self, sku: str) -> Product | None:
        return self.db.scalar(select(Product).where(Product.sku == sku))
