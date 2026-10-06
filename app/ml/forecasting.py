from collections.abc import Mapping, Sequence
from datetime import date
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

MODEL_NAME = "RandomForestRegressor"
BASELINE_NAME = "7-day moving average"
FEATURE_COLUMNS = ["lag_1", "lag_7", "rolling_mean_7", "rolling_mean_14", "day_of_week"]


def daily_series(rows: Sequence[Mapping[str, Any]], end_date: date) -> pd.Series:
    """Fill missing calendar days from the first sale through the completed-day cutoff."""
    if not rows:
        return pd.Series(dtype=float, name="quantity_sold", index=pd.DatetimeIndex([], name="date"))
    frame = pd.DataFrame([dict(row) for row in rows])
    frame["date"] = pd.to_datetime(frame["date"])
    quantities = frame.groupby("date")["quantity_sold"].sum().sort_index()
    quantities = quantities.loc[:pd.Timestamp(end_date)]
    if quantities.empty:
        return pd.Series(dtype=float, name="quantity_sold", index=pd.DatetimeIndex([], name="date"))
    dates = pd.date_range(quantities.index[0], end_date, freq="D", name="date")
    return quantities.reindex(dates, fill_value=0).astype(float).rename("quantity_sold")


def make_features(history: pd.Series) -> pd.DataFrame:
    """Every demand feature for day t uses only observations strictly before t."""
    past = history.shift(1)
    return pd.DataFrame({
        "lag_1": past,
        "lag_7": history.shift(7),
        "rolling_mean_7": past.rolling(7, min_periods=7).mean(),
        "rolling_mean_14": past.rolling(14, min_periods=14).mean(),
        "day_of_week": history.index.dayofweek,
        "quantity_sold": history,
    }, index=history.index)


def chronological_split(history: pd.Series) -> tuple[pd.DataFrame, pd.DataFrame]:
    usable = make_features(history).dropna()
    split_at = int(len(usable) * 0.8)
    if split_at < 1 or split_at >= len(usable):
        raise ValueError("Not enough usable observations for chronological evaluation")
    return usable.iloc[:split_at], usable.iloc[split_at:]


def fit_model(training: pd.DataFrame) -> RandomForestRegressor:
    model = RandomForestRegressor(
        n_estimators=100, max_depth=8, min_samples_leaf=2, random_state=42, n_jobs=1,
    )
    model.fit(training[FEATURE_COLUMNS], training["quantity_sold"])
    return model


def recursive_forecast(
    history: pd.Series, horizon_days: int, model: RandomForestRegressor | None = None,
) -> pd.Series:
    """Append predictions, never future actuals. None selects the moving-average baseline."""
    if len(history) < 14:
        raise ValueError("At least 14 past days are needed for forecast features")
    values = history.to_numpy(dtype=float).tolist()
    dates = pd.date_range(history.index[-1] + pd.Timedelta(days=1), periods=horizon_days, freq="D")
    predictions = []
    for day in dates:
        if model is None:
            prediction = float(np.mean(values[-7:]))
        else:
            features = pd.DataFrame([[
                values[-1], values[-7], np.mean(values[-7:]), np.mean(values[-14:]), day.dayofweek,
            ]], columns=FEATURE_COLUMNS)
            prediction = float(model.predict(features)[0])
        prediction = max(0.0, prediction)
        predictions.append(prediction)
        values.append(prediction)
    return pd.Series(predictions, index=dates, name="predicted_demand")


def forecast(history: pd.Series, horizon_days: int) -> pd.Series:
    model = fit_model(make_features(history).dropna())
    return recursive_forecast(history, horizon_days, model)


def calculate_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float | int | None]:
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    nonzero = actual != 0
    mape = (
        float(np.mean(np.abs((actual[nonzero] - predicted[nonzero]) / actual[nonzero])) * 100)
        if nonzero.any() else None
    )
    return {
        "mae": float(mean_absolute_error(actual, predicted)),
        "rmse": float(np.sqrt(mean_squared_error(actual, predicted))),
        "mape": mape,
        "mape_nonzero_days": int(nonzero.sum()),
        "mape_zero_days_excluded": int((~nonzero).sum()),
    }


def evaluate(history: pd.Series) -> dict[str, Any]:
    training, testing = chronological_split(history)
    model = fit_model(training)
    # Both methods start at the same cutoff and receive no held-out actual values.
    past = history.loc[history.index < testing.index[0]]
    model_predictions = recursive_forecast(past, len(testing), model)
    baseline_predictions = recursive_forecast(past, len(testing))
    actual = testing["quantity_sold"].to_numpy()
    model_metrics = calculate_metrics(actual, model_predictions.to_numpy())
    baseline_metrics = calculate_metrics(actual, baseline_predictions.to_numpy())
    return {
        "training_period": {
            "start_date": training.index[0].date(), "end_date": training.index[-1].date(),
            "days": len(training),
        },
        "testing_period": {
            "start_date": testing.index[0].date(), "end_date": testing.index[-1].date(),
            "days": len(testing),
        },
        "model_metrics": model_metrics,
        "baseline_metrics": baseline_metrics,
        "comparison": {"mae_difference": model_metrics["mae"] - baseline_metrics["mae"]},
    }
