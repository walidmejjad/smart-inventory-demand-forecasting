from sqlalchemy import select

from app.models import Category, Product
from app.repositories._base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    model = Category

    def get_by_name(self, name: str) -> Category | None:
        return self.db.scalar(select(Category).where(Category.name == name))

    def has_products(self, category_id: int) -> bool:
        statement = select(Product.id).where(Product.category_id == category_id).limit(1)
        return self.db.scalar(statement) is not None
