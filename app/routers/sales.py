from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User
from app.schemas.sale import SaleCreate, SaleResponse
from app.security.dependencies import require_authenticated_user
from app.services.sale import SaleService

router = APIRouter(
    prefix="/sales", tags=["Sales"], dependencies=[Depends(require_authenticated_user)]
)
DatabaseSession = Annotated[Session, Depends(get_db)]
ResourceId = Annotated[int, Path(gt=0)]


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    data: SaleCreate,
    db: DatabaseSession,
    user: Annotated[User, Depends(require_authenticated_user)],
) -> SaleResponse:
    """Complete a sale using current product prices. Duplicate product IDs are rejected."""
    return SaleService(db).create(data, user.id)


@router.get("", response_model=list[SaleResponse])
def list_sales(
    db: DatabaseSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[SaleResponse]:
    return [SaleResponse.model_validate(sale) for sale in SaleService(db).list(offset, limit)]


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: ResourceId, db: DatabaseSession) -> SaleResponse:
    return SaleResponse.model_validate(SaleService(db).get(sale_id))
