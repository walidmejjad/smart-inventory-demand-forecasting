from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    model: type[ModelType]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, resource_id: int) -> ModelType | None:
        return self.db.get(self.model, resource_id)

    def list(self, offset: int = 0, limit: int = 100) -> list[ModelType]:
        primary_key = self.model.__table__.primary_key.columns
        statement = select(self.model).order_by(*primary_key).offset(offset).limit(limit)
        return list(self.db.scalars(statement))

    def create(self, values: dict[str, Any]) -> ModelType:
        resource = self.model(**values)
        self.db.add(resource)
        return self._save(resource)

    def update(self, resource: ModelType, values: dict[str, Any]) -> ModelType:
        if not values:
            return resource
        for name, value in values.items():
            setattr(resource, name, value)
        return self._save(resource)

    def _save(self, resource: ModelType) -> ModelType:
        try:
            self.db.commit()
            self.db.refresh(resource)
        except SQLAlchemyError:
            self.db.rollback()
            raise
        return resource

    def delete(self, resource: ModelType) -> None:
        try:
            self.db.delete(resource)
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise
