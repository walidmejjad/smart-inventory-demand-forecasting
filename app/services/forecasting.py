from datetime import datetime, timedelta, timezone

import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.ml import forecasting as ml
from app.models import Product
from app.repositories.forecasting import ForecastingRepository
from app.repositories.product import ProductRepository
from app.schemas.forecasting import (
    EvaluationResponse, ForecastDay, ForecastResponse, ReorderInsightResponse,
)


class ForecastingService:
    def __init__(self, db: Session) -> None:
        self.repository = ForecastingRepository(db)
        self.products = ProductRepository(db)

    def _history(self, product_id: int) -> tuple[Product, pd.Series]:
        product = self.products.get(product_id)
        if product is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
        # Today's partial sales must not be treated as a completed daily observation.
        end_date = datetime.now(timezone.utc).date() - timedelta(days=1)
        history = ml.daily_series(self.repository.daily_demand(product_id, end_date), end_date)
        if len(history) < settings.min_forecast_history_days:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "Insufficient sales history for forecasting. "
                f"At least {settings.min_forecast_history_days} days of history are required.",
            )
        self._require_sales_days(history)
        return product, history

    def _require_sales_days(self, history: pd.Series) -> None:
        if int((history > 0).sum()) < settings.min_forecast_sales_days:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "Insufficient sales history for forecasting. "
                f"At least {settings.min_forecast_sales_days} distinct days with sales are required "
                "in the available training history.",
            )

    def forecast(self, product_id: int, horizon_days: int) -> ForecastResponse:
        product, history = self._history(product_id)
        # Predict today's complete demand as a bridge, then return tomorrow onward.
        predictions = ml.forecast(history, horizon_days + 1).iloc[1:]
        return ForecastResponse(
            product_id=product.id, product_name=product.name, history_days=len(history),
            history_start=history.index[0].date(), history_end=history.index[-1].date(),
            model=ml.MODEL_NAME,
            forecast=[
                ForecastDay(date=day.date(), predicted_demand=float(demand))
                for day, demand in predictions.items()
            ],
        )

    def evaluation(self, product_id: int) -> EvaluationResponse:
        product, history = self._history(product_id)
        _, testing = ml.chronological_split(history)
        self._require_sales_days(history.loc[history.index < testing.index[0]])
        return EvaluationResponse(
            product_id=product.id, history_days=len(history),
            model_name=ml.MODEL_NAME, baseline_name=ml.BASELINE_NAME,
            **ml.evaluate(history),
        )

    def reorder_insight(self, product_id: int, horizon_days: int) -> ReorderInsightResponse:
        result = self.forecast(product_id, horizon_days)
        product = self.products.get(product_id)
        total_demand = sum(day.predicted_demand for day in result.forecast)
        projected_stock = product.quantity_in_stock - total_demand
        return ReorderInsightResponse(
            product_id=product.id, current_stock=product.quantity_in_stock,
            reorder_level=product.reorder_level, forecast_horizon_days=horizon_days,
            forecast_start=result.forecast[0].date, forecast_end=result.forecast[-1].date,
            predicted_total_demand=total_demand, projected_stock_after_forecast=projected_stock,
            reorder_recommended=projected_stock <= product.reorder_level,
        )
