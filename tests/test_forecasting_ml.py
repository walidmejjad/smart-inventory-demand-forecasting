from datetime import date

import numpy as np
import pandas as pd
import pytest

from app.ml import forecasting as ml


def series(values):
    return pd.Series(values, index=pd.date_range("2026-01-01", periods=len(values)), dtype=float)


def test_daily_series_sums_sales_and_fills_internal_and_trailing_gaps():
    history = ml.daily_series([
        {"date": "2026-01-01", "quantity_sold": 2},
        {"date": "2026-01-01", "quantity_sold": 3},
        {"date": "2026-01-03", "quantity_sold": 4},
        {"date": "2026-01-07", "quantity_sold": 100},
    ], date(2026, 1, 5))
    assert history.tolist() == [5, 0, 4, 0, 0]
    assert list(history.index.date) == [date(2026, 1, day) for day in range(1, 6)]
    assert ml.daily_series([], date(2026, 1, 5)).empty


def test_features_use_only_past_days_and_drop_incomplete_windows():
    history = series(range(1, 41))
    features = ml.make_features(history)
    assert features.iloc[14]["lag_1"] == 14
    assert features.iloc[14]["lag_7"] == 8
    assert features.iloc[14]["rolling_mean_7"] == 11
    assert features.iloc[14]["rolling_mean_14"] == 7.5
    assert features.iloc[14]["day_of_week"] == history.index[14].dayofweek
    assert features.dropna().index[0] == history.index[14]
    changed = history.copy()
    changed.iloc[20:] = 10000
    pd.testing.assert_frame_equal(
        features.loc[:history.index[20], ml.FEATURE_COLUMNS],
        ml.make_features(changed).loc[:history.index[20], ml.FEATURE_COLUMNS],
    )


def test_chronological_split_uses_first_eighty_percent_of_usable_rows():
    history = series(range(90))
    training, testing = ml.chronological_split(history)
    assert len(training) == 60 and len(testing) == 16
    assert training.index[0] == history.index[14]
    assert training.index[-1] < testing.index[0]
    assert testing.index[-1] == history.index[-1]
    assert training.index.is_monotonic_increasing and testing.index.is_monotonic_increasing
    with pytest.raises(ValueError, match="Not enough"):
        ml.chronological_split(series([1] * 14))


def test_moving_average_baseline_recursively_uses_its_own_predictions():
    predictions = ml.recursive_forecast(series(range(1, 15)), 2)
    assert predictions.tolist() == pytest.approx([11, 80 / 7])
    assert predictions.index[0].date() == date(2026, 1, 15)


def test_negative_predictions_are_clipped_before_becoming_future_lags():
    inputs = []

    class NegativeModel:
        def predict(self, features):
            inputs.append(features.copy())
            return np.array([-3.0])

    predictions = ml.recursive_forecast(series([5] * 30), 3, NegativeModel())
    assert predictions.tolist() == [0, 0, 0]
    assert inputs[1].iloc[0]["lag_1"] == 0


def test_mae_rmse_and_mape_have_known_values_and_exclude_zero_actuals():
    metrics = ml.calculate_metrics(np.array([0, 2, 4]), np.array([1, 1, 6]))
    assert metrics["mae"] == pytest.approx(4 / 3)
    assert metrics["rmse"] == pytest.approx(np.sqrt(2))
    assert metrics["mape"] == pytest.approx(50)
    assert metrics["mape_nonzero_days"] == 2
    assert metrics["mape_zero_days_excluded"] == 1


def test_mape_is_none_when_every_actual_is_zero():
    metrics = ml.calculate_metrics(np.array([0, 0]), np.array([1, 2]))
    assert metrics["mae"] == 1.5
    assert metrics["rmse"] == pytest.approx(np.sqrt(2.5))
    assert metrics["mape"] is None
    assert metrics["mape_nonzero_days"] == 0
    assert metrics["mape_zero_days_excluded"] == 2


def test_held_out_targets_cannot_change_training_or_either_methods_predictions(monkeypatch):
    history = series(np.random.default_rng(42).poisson(8, 90))
    _, testing = ml.chronological_split(history)
    training_inputs, predictions = [], []
    original_fit, original_forecast = ml.fit_model, ml.recursive_forecast

    def capture_fit(training):
        training_inputs.append(training.copy())
        return original_fit(training)

    def capture_forecast(past, horizon_days, model=None):
        assert past.index[-1] < testing.index[0]
        result = original_forecast(past, horizon_days, model)
        assert result.index.equals(testing.index)
        predictions.append(result)
        return result

    monkeypatch.setattr(ml, "fit_model", capture_fit)
    monkeypatch.setattr(ml, "recursive_forecast", capture_forecast)
    original = ml.evaluate(history)
    changed = history.copy()
    changed.loc[testing.index] = 10000
    altered = ml.evaluate(changed)
    pd.testing.assert_frame_equal(training_inputs[0], training_inputs[1])
    pd.testing.assert_series_equal(predictions[0], predictions[2])
    pd.testing.assert_series_equal(predictions[1], predictions[3])
    assert altered["model_metrics"]["mae"] > original["model_metrics"]["mae"]


@pytest.mark.parametrize("model_prediction, difference", [(10, 0), (5, 5)])
def test_comparison_reports_tie_or_worse_without_claiming_superiority(monkeypatch, model_prediction, difference):
    class ConstantModel:
        def predict(self, features):
            return np.array([model_prediction])

    monkeypatch.setattr(ml, "fit_model", lambda training: ConstantModel())
    result = ml.evaluate(series([10] * 90))
    assert result["baseline_metrics"]["mae"] == 0
    assert result["comparison"] == {"mae_difference": difference}


def test_real_model_forecasts_are_deterministic_and_nonnegative():
    history = series(np.random.default_rng(42).poisson(8, 90))
    first = ml.forecast(history, 7)
    second = ml.forecast(history, 7)
    pd.testing.assert_series_equal(first, second)
    assert len(first) == 7 and (first >= 0).all() and np.isfinite(first).all()
