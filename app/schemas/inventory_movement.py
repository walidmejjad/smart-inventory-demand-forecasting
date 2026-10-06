from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import MovementType


class InventoryMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    movement_type: MovementType
    quantity_change: int
    sale_id: int | None
    created_by_id: int
    created_at: datetime
