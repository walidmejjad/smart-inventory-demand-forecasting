from sqlalchemy import select

from app.models import Product, Supplier
from app.repositories._base import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    model = Supplier

    def has_products(self, supplier_id: int) -> bool:
        statement = select(Product.id).where(Product.supplier_id == supplier_id).limit(1)
        return self.db.scalar(statement) is not None
