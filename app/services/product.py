from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Product
from app.repositories.category import CategoryRepository
from app.repositories.product import ProductRepository
from app.repositories.supplier import SupplierRepository
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    def __init__(self, db: Session) -> None:
        self.repository = ProductRepository(db)
        self.categories = CategoryRepository(db)
        self.suppliers = SupplierRepository(db)

    def get(self, product_id: int) -> Product:
        product = self.repository.get(product_id)
        if product is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
        return product

    def list(self, offset: int = 0, limit: int = 100) -> list[Product]:
        return self.repository.list(offset, limit)

    def _validate_references(self, category_id: int, supplier_id: int) -> None:
        if self.categories.get(category_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
        if self.suppliers.get(supplier_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found")

    def create(self, data: ProductCreate) -> Product:
        self._validate_references(data.category_id, data.supplier_id)
        if self.repository.get_by_sku(data.sku) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Product SKU already exists")
        return self.repository.create(data.model_dump())

    def update(self, product_id: int, data: ProductUpdate) -> Product:
        product = self.get(product_id)
        values = data.model_dump(exclude_unset=True)
        self._validate_references(
            values.get("category_id", product.category_id),
            values.get("supplier_id", product.supplier_id),
        )
        if "sku" in values:
            existing = self.repository.get_by_sku(values["sku"])
            if existing is not None and existing.id != product.id:
                raise HTTPException(status.HTTP_409_CONFLICT, "Product SKU already exists")
        return self.repository.update(product, values)

    def delete(self, product_id: int) -> None:
        self.repository.delete(self.get(product_id))
