from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import InventoryMovement, MovementType
from app.repositories.inventory_movement import InventoryMovementRepository


class InventoryMovementService:
    def __init__(self, db: Session) -> None:
        self.repository = InventoryMovementRepository(db)

    def get(self, movement_id: int) -> InventoryMovement:
        movement = self.repository.get(movement_id)
        if movement is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Inventory movement not found")
        return movement

    def list(
        self, offset: int = 0, limit: int = 100, *,
        product_id: int | None = None,
        movement_type: MovementType | None = None,
        sale_id: int | None = None,
    ) -> list[InventoryMovement]:
        return self.repository.list(
            offset, limit, product_id=product_id, movement_type=movement_type, sale_id=sale_id
        )
