from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.forecasting import EvaluationResponse, ForecastResponse, ReorderInsightResponse
from app.security.dependencies import require_authenticated_user
from app.services.forecasting import ForecastingService

router = APIRouter(
    prefix="/forecasting", tags=["Forecasting"],
    dependencies=[Depends(require_authenticated_user)],
)
DatabaseSession = Annotated[Session, Depends(get_db)]
ProductId = Annotated[int, Path(gt=0)]
ForecastHorizon = Annotated[int, Query(ge=1, le=30)]


@router.get("/products/{product_id}", response_model=ForecastResponse)
def get_product_forecast(
    product_id: ProductId, db: DatabaseSession, horizon_days: ForecastHorizon = 7,
) -> ForecastResponse:
    """Forecast tomorrow onward in UTC using completed history through yesterday UTC."""
    return ForecastingService(db).forecast(product_id, horizon_days)


@router.get("/products/{product_id}/evaluation", response_model=EvaluationResponse)
def get_product_evaluation(product_id: ProductId, db: DatabaseSession) -> EvaluationResponse:
    """Compare model and baseline on the same chronological, recursive holdout."""
    return ForecastingService(db).evaluation(product_id)


@router.get("/products/{product_id}/reorder-insight", response_model=ReorderInsightResponse)
def get_product_reorder_insight(
    product_id: ProductId, db: DatabaseSession, horizon_days: ForecastHorizon = 7,
) -> ReorderInsightResponse:
    """Provide forecast-based reorder information without changing stock or purchasing."""
    return ForecastingService(db).reorder_insight(product_id, horizon_days)
