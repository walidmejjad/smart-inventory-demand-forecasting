from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.movement_type import MovementType

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.sale import Sale
    from app.models.user import User


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint(
            "quantity_change <> 0", name="ck_inventory_movements_quantity_nonzero"
        ),
        CheckConstraint(
            "movement_type <> 'SALE' OR (quantity_change < 0 AND sale_id IS NOT NULL)",
            name="ck_inventory_movements_sale_reference_and_quantity",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    movement_type: Mapped[MovementType] = mapped_column(
        Enum(MovementType, name="inventory_movement_type", validate_strings=True),
        nullable=False,
        index=True,
    )
    quantity_change: Mapped[int] = mapped_column(nullable=False)
    sale_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales.id", ondelete="RESTRICT"), index=True
    )
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    product: Mapped[Product] = relationship()
    sale: Mapped[Sale | None] = relationship()
    created_by: Mapped[User] = relationship()
