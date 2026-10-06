from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import MovementType
from app.schemas.inventory_movement import InventoryMovementResponse
from app.security.dependencies import require_authenticated_user
from app.services.inventory_movement import InventoryMovementService

router = APIRouter(
    prefix="/inventory-movements",
    tags=["Inventory Movements"],
    dependencies=[Depends(require_authenticated_user)],
)
DatabaseSession = Annotated[Session, Depends(get_db)]
ResourceId = Annotated[int, Path(gt=0)]


@router.get("", response_model=list[InventoryMovementResponse])
def list_inventory_movements(
    db: DatabaseSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    product_id: Annotated[int | None, Query(gt=0)] = None,
    movement_type: MovementType | None = None,
    sale_id: Annotated[int | None, Query(gt=0)] = None,
) -> list[InventoryMovementResponse]:
    movements = InventoryMovementService(db).list(
        offset, limit, product_id=product_id, movement_type=movement_type, sale_id=sale_id
    )
    return [InventoryMovementResponse.model_validate(movement) for movement in movements]


@router.get("/{movement_id}", response_model=InventoryMovementResponse)
def get_inventory_movement(
    movement_id: ResourceId, db: DatabaseSession
) -> InventoryMovementResponse:
    return InventoryMovementResponse.model_validate(
        InventoryMovementService(db).get(movement_id)
    )
