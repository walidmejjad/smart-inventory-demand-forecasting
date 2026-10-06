from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, Field

NonnegativeNumber = Annotated[float, Field(ge=0, allow_inf_nan=False)]


class ForecastDay(BaseModel):
    date: date
    predicted_demand: NonnegativeNumber


class ForecastResponse(BaseModel):
    product_id: int
    product_name: str
    history_days: int
    history_start: date
    history_end: date
    model: str
    forecast: list[ForecastDay]


class EvaluationPeriod(BaseModel):
    start_date: date
    end_date: date
    days: int


class ForecastMetrics(BaseModel):
    mae: NonnegativeNumber
    rmse: NonnegativeNumber
    mape: NonnegativeNumber | None = Field(description="Percentage on nonzero actuals; null if all are zero.")
    mape_nonzero_days: int
    mape_zero_days_excluded: int


class ForecastComparison(BaseModel):
    mae_difference: float = Field(
        allow_inf_nan=False, description="Model MAE minus baseline MAE; negative favors the model."
    )


class EvaluationResponse(BaseModel):
    product_id: int
    history_days: int
    training_period: EvaluationPeriod
    testing_period: EvaluationPeriod
    model_name: str
    baseline_name: str
    evaluation_method: Literal["recursive_holdout"] = "recursive_holdout"
    mape_policy: Literal["exclude_zero_actuals"] = "exclude_zero_actuals"
    model_metrics: ForecastMetrics
    baseline_metrics: ForecastMetrics
    comparison: ForecastComparison


class ReorderInsightResponse(BaseModel):
    product_id: int
    current_stock: int
    reorder_level: int
    forecast_horizon_days: int
    forecast_start: date
    forecast_end: date
    predicted_total_demand: NonnegativeNumber
    projected_stock_after_forecast: float = Field(allow_inf_nan=False)
    reorder_recommended: bool
