from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import InventoryMovement, MovementType


class InventoryMovementRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, movement_id: int) -> InventoryMovement | None:
        return self.db.get(InventoryMovement, movement_id)

    def list(
        self, offset: int = 0, limit: int = 100, *,
        product_id: int | None = None,
        movement_type: MovementType | None = None,
        sale_id: int | None = None,
    ) -> list[InventoryMovement]:
        statement = select(InventoryMovement)
        if product_id is not None:
            statement = statement.where(InventoryMovement.product_id == product_id)
        if movement_type is not None:
            statement = statement.where(InventoryMovement.movement_type == movement_type)
        if sale_id is not None:
            statement = statement.where(InventoryMovement.sale_id == sale_id)
        statement = statement.order_by(InventoryMovement.id).offset(offset).limit(limit)
        return list(self.db.scalars(statement))

    def add(self, movement: InventoryMovement) -> None:
        """Stage a movement without committing the sale's transaction."""
        self.db.add(movement)
