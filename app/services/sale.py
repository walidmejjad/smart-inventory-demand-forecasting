from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import InventoryMovement, MovementType, Sale, SaleItem
from app.repositories.inventory_movement import InventoryMovementRepository
from app.repositories.product import ProductRepository
from app.repositories.sale import SaleRepository
from app.schemas.sale import SaleCreate, SaleResponse


class SaleService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SaleRepository(db)
        self.products = ProductRepository(db)
        self.movements = InventoryMovementRepository(db)

    def get(self, sale_id: int) -> Sale:
        sale = self.repository.get(sale_id)
        if sale is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Sale not found")
        return sale

    def list(self, offset: int = 0, limit: int = 100) -> list[Sale]:
        return self.repository.list(offset, limit)

    def create(self, data: SaleCreate, created_by_id: int) -> SaleResponse:
        # Authentication has already begun a transaction on this request's session.
        # Use that transaction and roll back on validation or persistence failures.
        try:
            products = {
                product.id: product
                for product in self.products.get_for_sale([item.product_id for item in data.items])
            }
            items = []
            for item in data.items:
                product = products.get(item.product_id)
                if product is None:
                    raise HTTPException(
                        status.HTTP_404_NOT_FOUND, f"Product not found: {item.product_id}"
                    )
                if product.quantity_in_stock < item.quantity:
                    raise HTTPException(
                        status.HTTP_409_CONFLICT,
                        f"Insufficient stock for product {product.id}",
                    )
                items.append(SaleItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price=product.price,
                    subtotal=product.price * item.quantity,
                ))

            total = sum((item.subtotal for item in items), Decimal("0.00"))
            if total > Decimal("9999999999999999999999.99"):
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Sale total is too large")
            sale = Sale(created_by_id=created_by_id, total_amount=total, items=items)
            self.repository.add(sale)
            # Every item has passed validation before any stock is changed.
            for item in items:
                products[item.product_id].quantity_in_stock -= item.quantity
                self.movements.add(InventoryMovement(
                    product_id=item.product_id,
                    movement_type=MovementType.SALE,
                    quantity_change=-item.quantity,
                    sale=sale,
                    created_by_id=created_by_id,
                ))
            self.db.flush()
            # Validate/materialize the response before committing; no reads after commit.
            response = SaleResponse.model_validate(sale)
            self.db.commit()
            return response
        except Exception:
            self.db.rollback()
            raise
