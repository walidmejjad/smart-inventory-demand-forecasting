from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Sale


class SaleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, sale_id: int) -> Sale | None:
        statement = select(Sale).where(Sale.id == sale_id).options(selectinload(Sale.items))
        return self.db.scalar(statement)

    def list(self, offset: int = 0, limit: int = 100) -> list[Sale]:
        statement = (
            select(Sale).options(selectinload(Sale.items))
            .order_by(Sale.id).offset(offset).limit(limit)
        )
        return list(self.db.scalars(statement))

    def add(self, sale: Sale) -> None:
        """Stage the sale and its items; the service owns the transaction."""
        self.db.add(sale)
