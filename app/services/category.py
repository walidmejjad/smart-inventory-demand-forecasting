from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Category
from app.repositories.category import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, db: Session) -> None:
        self.repository = CategoryRepository(db)

    def get(self, category_id: int) -> Category:
        category = self.repository.get(category_id)
        if category is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
        return category

    def list(self, offset: int = 0, limit: int = 100) -> list[Category]:
        return self.repository.list(offset, limit)

    def create(self, data: CategoryCreate) -> Category:
        if self.repository.get_by_name(data.name) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Category name already exists")
        return self.repository.create(data.model_dump())

    def update(self, category_id: int, data: CategoryUpdate) -> Category:
        category = self.get(category_id)
        values = data.model_dump(exclude_unset=True)
        if "name" in values:
            existing = self.repository.get_by_name(values["name"])
            if existing is not None and existing.id != category.id:
                raise HTTPException(
                    status.HTTP_409_CONFLICT, "Category name already exists"
                )
        return self.repository.update(category, values)

    def delete(self, category_id: int) -> None:
        category = self.get(category_id)
        if self.repository.has_products(category_id):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Category is referenced by products"
            )
        self.repository.delete(category)
