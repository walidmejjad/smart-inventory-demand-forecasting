# Demand forecasting

This phase integrates a standard regression model with inventory records. It does
not introduce a new ML algorithm, promise better accuracy than the baseline, or
automatically order stock. No frontend is included.

## Endpoints and access

All endpoints require the existing JWT. ADMIN, MANAGER, and EMPLOYEE may use them.
Swagger groups them under **Forecasting**.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/forecasting/products/{product_id}?horizon_days=7` | Forecast daily recorded demand |
| GET | `/api/forecasting/products/{product_id}/evaluation` | Compare ML and baseline errors |
| GET | `/api/forecasting/products/{product_id}/reorder-insight?horizon_days=7` | Project stock over the forecast horizon |

`product_id` must be positive. `horizon_days` defaults to 7 and accepts integers
from 1 to 30. Missing products return 404, invalid input or insufficient history
returns 422, and missing/invalid/expired JWTs return 401.

These are read and analysis operations: they never create sales, change stock,
create movements, or commit database writes. Models are fitted dynamically per
request. No forecast table or migration is required.

## What counts as history

SQL sums `SaleItem.quantity` per product and **UTC calendar date**, using
`Sale.created_at`. Current price and current inventory are not historical demand.
Today's partial sales and future-dated records are excluded. Pandas fills missing
days with zero from the first recorded sale through yesterday UTC, including
trailing days without sales. Dates before the first recorded sale are not invented.

Settings in `.env` (defaults shown in `.env.example`):

```dotenv
MIN_FORECAST_HISTORY_DAYS=30
MIN_FORECAST_SALES_DAYS=7
```

The first setting counts calendar days, including inserted zeros, and cannot be
configured below 30. The second requires at least 7 distinct positive-demand days
by default (configurable down to 4). This additional guard prevents two or three
sales scattered across months from passing the calendar-span check. Evaluation
also applies the selling-day guard to the history available before its test period.
Meeting these thresholds permits a demonstration; it does not establish accuracy.

Too short a history returns:

```json
{
  "detail": "Insufficient sales history for forecasting. At least 30 days of history are required."
}
```

Forecast dates start **tomorrow UTC**. Since training ends yesterday, the model
first predicts today's complete demand as an internal bridge. It uses that
prediction for tomorrow's lag features, but does not include it in the returned
horizon. Responses include `history_start`, `history_end`, and `history_days` so
the observation cutoff is visible. Tomorrow means UTC, regardless of server or
browser timezone.

## Model and baseline

`RandomForestRegressor` averages predictions from 100 decision trees. Inputs are
yesterday's demand (`lag_1`), demand seven days ago (`lag_7`), the preceding 7- and
14-day average demand, and day of week. Each rolling feature shifts demand back
one day before averaging: the target day never contributes to its own features.
The first 14 rows cannot have complete features and are omitted from training.

The model uses `random_state=42`, `max_depth=8`, `min_samples_leaf=2`, and `n_jobs=1`.
Future days are predicted sequentially. Each prediction becomes part of the
history used to compute the next day's features. Predictions are clipped at zero
before they are returned or reused. Fractional demand is an estimate, not an
instruction to sell a fraction of an item.

The baseline forecasts the average demand of the preceding 7 days. It also works
recursively, adding its own predictions as it advances through the horizon.

## Honest chronological evaluation

After the 14-day feature warmup, the earliest 80% of usable rows (rounded down)
are training targets; the remaining rows form the later test period. There is no
random shuffle or test-driven parameter search. For 90 calendar days, there are
76 usable rows: 60 training targets and 16 test targets. Returned period dates
describe target rows; earlier warmup observations supply lag context.

The evaluation model is fitted only on training targets. Both methods start at
the same cutoff and forecast the entire test interval recursively. Neither
method receives actual demand from any held-out day, even for later test lags.
This is a fixed-origin multi-day evaluation, not a series of one-day forecasts
updated with actual test outcomes. Production forecasts fit a fresh model using
all currently usable history; the evaluation model does not include the test set.

Both methods return:

- **MAE:** mean absolute prediction error, in units.
- **RMSE:** square root of mean squared error, in units; larger errors weigh more.
- **MAPE:** mean absolute percentage error on days with nonzero actual demand,
  multiplied by 100. Zero actual values are excluded from MAPE only. Both MAE and
  RMSE still include them. MAPE is `null` when every test actual is zero.

Each metrics object includes `mape_nonzero_days` and `mape_zero_days_excluded`.
The response explicitly identifies `mape_policy=exclude_zero_actuals` and
`evaluation_method=recursive_holdout`.

`comparison.mae_difference` equals model MAE minus baseline MAE: negative favors
the model, positive favors the baseline, and zero is a tie. Interpret near-zero
differences cautiously; the API makes no statistical significance or superiority
claim. Examine both sets of metrics before choosing a forecasting method.

## Reorder insight

The response sums the returned horizon's predictions and calculates:

```text
projected_stock_after_forecast = current_stock - predicted_total_demand
reorder_recommended = projected_stock_after_forecast <= reorder_level
```

Projected stock can be negative; predicted demand cannot. The indicator uses
current stock and the full future calendar days returned by the forecast. It
does not model today's remaining sales, scheduled replenishments, lead times,
safety stock, or prediction uncertainty. It is a decision-support estimate and
does not purchase goods or change inventory.

## Manually generating simulated demo history

Use a **development/demo database** configured in `.env`. The script does not run
on application startup, during migrations, or just because it is imported.
The default invocation creates a dedicated product with SKU `DEMO-FORECAST-001`,
name `[DEMO] Simulated forecasting product`, and description containing
`SIMULATED FORECASTING DEMO DATA`. The related category and supplier are also
named `[DEMO] Forecasting`.

From the project directory, replace `1` with an existing user ID (for example,
the `id` returned by `/api/auth/me`):

```powershell
.\.venv\Scripts\python.exe -m scripts.seed_forecasting_demo_data --user-id 1 --days 120 --seed 42 --confirm-demo
```

The script prints the product ID for use in Swagger. It generates 90-180 days of
history ending yesterday UTC, using weekday effects, Poisson random variation,
and a mild trend. The fixed seed makes generated quantities repeatable. Each
positive-demand day receives a historical Sale and SaleItem with consistent
Decimal totals and timestamps. Zero-demand days have no sale records.

It validates the user, preserves foreign keys, and commits everything in one
transaction. It does not deduct existing product stock or create inventory
movements. The new demo product starts with an explicitly synthetic stock of 100.
These are historical fixtures, not stock-reconciled operational transactions.

**Simulated sales participate in sales lists, dashboard revenue, and all other
reports for this database.** Their identity is visible through the linked demo
product; no new per-sale flag or schema change is introduced. Do not mix this data
with real business data or describe evaluation on it as real-world validation.

Repeating the default command refuses to insert anything if its demo SKU already
exists. Nothing is deleted, overwritten, or automatically cleaned up. To select
another pre-created demo product instead:

```powershell
.\.venv\Scripts\python.exe -m scripts.seed_forecasting_demo_data --user-id 1 --product-id 5 --days 120 --seed 42 --confirm-demo
```

That product must have a `DEMO-` SKU, the exact marker
`SIMULATED FORECASTING DEMO DATA` in its description, and no existing SaleItems.
The selected product's quantity remains unchanged. Any validation or database
failure rolls back the entire seed operation.

## Install, restart, and test

Only pandas, numpy, and scikit-learn were added as direct dependencies. Pip also
installs their required dependencies. The tested environment uses pandas 3.0.6,
numpy 2.5.3, and scikit-learn 1.8.0 on Python 3.14. Scikit-learn is pinned to 1.8.0
because Windows application control blocked the initially installed 1.9.1 wheel.
No Windows security policy was changed.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Stop the running FastAPI server with Ctrl+C, then restart:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`, authorize with an existing JWT, and expand
**Forecasting**. No migration or automatic seeding is needed.

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider
```

Tests use isolated SQLite databases, real deterministic model fitting, known
metric examples, changed future targets to check leakage, database snapshots,
and captured SQL writes. The demo generator is tested only in these disposable
databases, not invoked against the configured application database. PostgreSQL
UTC date conversion is implemented in the repository; the SQLite suite does not
exercise a live PostgreSQL server.

## Limits and references

Recorded sales are a proxy for demand. A zero-sales day can reflect stockouts,
closures, missing records, or actual zero demand; this project has no historical
availability data to distinguish them. Sparse history, changing customer behavior,
promotions, and recursive error accumulation can reduce accuracy. Synthetic
weekday patterns demonstrate the workflow and do not establish business value.
Random Forest is a standard algorithm, and the project's contribution is its
integration with inventory management and an honest baseline comparison.

Primary references:

- [scikit-learn RandomForestRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestRegressor.html)
- [scikit-learn time-series lagged-feature example](https://scikit-learn.org/stable/auto_examples/applications/plot_time_series_lagged_features.html)
- [pandas shift](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.shift.html)
