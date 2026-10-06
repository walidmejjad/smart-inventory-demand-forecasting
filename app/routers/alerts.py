from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.alerts import AlertSummaryResponse, StockAlertResponse
from app.security.dependencies import require_authenticated_user
from app.services.alerts import AlertService

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
    dependencies=[Depends(require_authenticated_user)],
)
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("/low-stock", response_model=list[StockAlertResponse])
def list_low_stock_alerts(db: DatabaseSession) -> list[StockAlertResponse]:
    """List all products at or below their reorder level, ordered by product ID."""
    return AlertService(db).list_low_stock()


@router.get("/summary", response_model=AlertSummaryResponse)
def get_alert_summary(db: DatabaseSession) -> AlertSummaryResponse:
    """Count LOW_STOCK and OUT_OF_STOCK products separately using current stock."""
    return AlertService(db).summary()
