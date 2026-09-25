from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.category import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])
DatabaseSession = Annotated[Session, Depends(get_db)]
ResourceId = Annotated[int, Path(gt=0)]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: DatabaseSession) -> CategoryResponse:
    return CategoryResponse.model_validate(CategoryService(db).create(data))


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: DatabaseSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[CategoryResponse]:
    return [
        CategoryResponse.model_validate(item)
        for item in CategoryService(db).list(offset, limit)
    ]


@router.get("/{id}", response_model=CategoryResponse)
def get_category(id: ResourceId, db: DatabaseSession) -> CategoryResponse:
    return CategoryResponse.model_validate(CategoryService(db).get(id))


@router.put("/{id}", response_model=CategoryResponse)
def update_category(
    id: ResourceId, data: CategoryUpdate, db: DatabaseSession
) -> CategoryResponse:
    """Update supplied fields; nullable fields can be cleared with null."""
    return CategoryResponse.model_validate(CategoryService(db).update(id, data))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(id: ResourceId, db: DatabaseSession) -> Response:
    CategoryService(db).delete(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
