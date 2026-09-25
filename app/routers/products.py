from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.product import ProductService

router = APIRouter(prefix="/products", tags=["Products"])
DatabaseSession = Annotated[Session, Depends(get_db)]
ResourceId = Annotated[int, Path(gt=0)]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DatabaseSession) -> ProductResponse:
    return ProductResponse.model_validate(ProductService(db).create(data))


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: DatabaseSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[ProductResponse]:
    return [
        ProductResponse.model_validate(item)
        for item in ProductService(db).list(offset, limit)
    ]


@router.get("/{id}", response_model=ProductResponse)
def get_product(id: ResourceId, db: DatabaseSession) -> ProductResponse:
    return ProductResponse.model_validate(ProductService(db).get(id))


@router.put("/{id}", response_model=ProductResponse)
def update_product(
    id: ResourceId, data: ProductUpdate, db: DatabaseSession
) -> ProductResponse:
    """Update supplied fields; nullable fields can be cleared with null."""
    return ProductResponse.model_validate(ProductService(db).update(id, data))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(id: ResourceId, db: DatabaseSession) -> Response:
    ProductService(db).delete(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
