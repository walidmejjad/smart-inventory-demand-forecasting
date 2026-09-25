from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Supplier
from app.repositories.supplier import SupplierRepository
from app.schemas.supplier import SupplierCreate, SupplierUpdate


class SupplierService:
    def __init__(self, db: Session) -> None:
        self.repository = SupplierRepository(db)

    def get(self, supplier_id: int) -> Supplier:
        supplier = self.repository.get(supplier_id)
        if supplier is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found")
        return supplier

    def list(self, offset: int = 0, limit: int = 100) -> list[Supplier]:
        return self.repository.list(offset, limit)

    def create(self, data: SupplierCreate) -> Supplier:
        return self.repository.create(data.model_dump())

    def update(self, supplier_id: int, data: SupplierUpdate) -> Supplier:
        supplier = self.get(supplier_id)
        return self.repository.update(supplier, data.model_dump(exclude_unset=True))

    def delete(self, supplier_id: int) -> None:
        supplier = self.get(supplier_id)
        if self.repository.has_products(supplier_id):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Supplier is referenced by products"
            )
        self.repository.delete(supplier)
