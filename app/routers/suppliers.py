from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.services.supplier import SupplierService

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])
DatabaseSession = Annotated[Session, Depends(get_db)]
ResourceId = Annotated[int, Path(gt=0)]


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(data: SupplierCreate, db: DatabaseSession) -> SupplierResponse:
    return SupplierResponse.model_validate(SupplierService(db).create(data))


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    db: DatabaseSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[SupplierResponse]:
    return [
        SupplierResponse.model_validate(item)
        for item in SupplierService(db).list(offset, limit)
    ]


@router.get("/{id}", response_model=SupplierResponse)
def get_supplier(id: ResourceId, db: DatabaseSession) -> SupplierResponse:
    return SupplierResponse.model_validate(SupplierService(db).get(id))


@router.put("/{id}", response_model=SupplierResponse)
def update_supplier(
    id: ResourceId, data: SupplierUpdate, db: DatabaseSession
) -> SupplierResponse:
    """Update supplied fields; nullable fields can be cleared with null."""
    return SupplierResponse.model_validate(SupplierService(db).update(id, data))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(id: ResourceId, db: DatabaseSession) -> Response:
    SupplierService(db).delete(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
