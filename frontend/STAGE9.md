# Stage 9 — Demand Forecasting frontend

Completed against the real FastAPI backend at http://127.0.0.1:8000 on 6 October 2026. Stage 10 was not started.

## Files created

- src/types/forecasting.ts
- src/api/forecasting.ts
- src/hooks/use-forecasting.ts
- src/lib/forecasting-format.ts
- src/components/forecasting/forecast-ui.tsx
- src/components/forecasting/forecast-chart.tsx
- src/components/forecasting/forecast-evaluation.tsx
- src/components/forecasting/forecast-reorder.tsx
- src/pages/forecasting-page.tsx
- .local-tools/forecast-smoke.mjs
- STAGE9.md
- test-results/forecast-verification.json and forecast screenshots

Modified: src/routes/router.tsx, adding only the Forecasting page import and route branch. Production dist output was regenerated. Existing approved pages, FastAPI, backend forecasting behavior, and dependencies were not changed.

## Exact API contracts

Inspected the live OpenAPI, forecasting router, schemas, service, and ML source before implementation. All endpoints are authenticated GETs. horizon_days accepts integers 1–30, defaults to 7. The frontend offers 7, 14, and 30.

GET /api/forecasting/products/{product_id}?horizon_days=7:

```typescript
{
  product_id: number
  product_name: string
  history_days: number
  history_start: string // YYYY-MM-DD
  history_end: string // YYYY-MM-DD
  model: string
  forecast: Array<{ date: string; predicted_demand: number }>
}
```

GET /api/forecasting/products/{product_id}/evaluation:

```typescript
{
  product_id: number
  history_days: number
  training_period: { start_date: string; end_date: string; days: number }
  testing_period: { start_date: string; end_date: string; days: number }
  model_name: string
  baseline_name: string
  evaluation_method: 'recursive_holdout'
  mape_policy: 'exclude_zero_actuals'
  model_metrics: {
    mae: number; rmse: number; mape: number | null
    mape_nonzero_days: number; mape_zero_days_excluded: number
  }
  baseline_metrics: {
    mae: number; rmse: number; mape: number | null
    mape_nonzero_days: number; mape_zero_days_excluded: number
  }
  comparison: { mae_difference: number }
}
```

GET /api/forecasting/products/{product_id}/reorder-insight?horizon_days=7:

```typescript
{
  product_id: number
  current_stock: number
  reorder_level: number
  forecast_horizon_days: number
  forecast_start: string
  forecast_end: string
  predicted_total_demand: number
  projected_stock_after_forecast: number
  reorder_recommended: boolean
}
```

Dates are calendar dates. The source uses completed demand history through yesterday UTC and forecasts tomorrow onward. No confidence interval or R² is returned, so neither is displayed.

## Architecture and behavior

Typed API helpers reuse the existing authenticated Axios client, session infrastructure, and cancellation. Error classification uses the client's normalized ApiError; only the specific insufficient-history 422 message produces the history explanation. Other failures use friendly localized messages and Retry without rendering raw backend details.

The existing paginated Products API/useCatalog loads real product names/SKUs. The demo is selected by its SKU DEMO-FORECAST-001 when available, otherwise the first product is selected. No numeric ID is hardcoded. Mobile includes a wrapping selected name/SKU beneath the native selector.

Product changes fetch forecast, insight, and evaluation. Horizon changes fetch only forecast and insight. Evaluation request identity depends only on product, verified in browser request counts. Manual Refresh reloads all three resources. Each resource has independent loading/error/retry state. Obsolete requests are aborted and ignored, and prior selection data is hidden immediately while a new selection loads.

The forecast summary shows the returned horizon length, total demand summed from real daily predictions, and average daily demand. Values use at most one decimal place. History dates/day count are shown from the response.

The existing installed Recharts dependency provides a responsive, nonanimated line chart with readable theme-token axes and tooltips. No new dependency was added. UTC forecast dates and units are labelled. An expandable semantic daily-values table supplies the same actual response data for keyboard and text access.

Reorder insight displays backend stock, reorder level, predicted demand, projected stock, and the exact boolean recommendation. True shows Reorder recommended; false shows No reorder needed. The explanation uses backend values and does not clamp negative projections. Advice never triggers orders, stock changes, or inventory movements.

Evaluation displays model MAE, RMSE, and MAPE with concise definitions, baseline values, training/testing periods, zero-day exclusions, and model-minus-baseline MAE. Null MAPE is Not available, rather than zero. No undefined quality-rating thresholds are invented.

The ML source imports scikit-learn RandomForestRegressor and returns that model name. It is presented as Random Forest Regressor, with a concise purpose and no guarantee of future demand.

Only the demo SKU receives: Demo product — historical sales were simulated for development and demonstration.

## Current real results

The demo resolves dynamically through Products API. All forecast and insight requests at 7, 14, and 30 days returned 200. Evaluation returned 200. Browser chart/table values matched every returned prediction and summary calculations matched backend totals within floating-point tolerance.

Current 7-day period: 7–13 October 2026. History: 128 days, 31 May–5 October 2026.

| Value | Backend result | Display |
| --- | ---: | --- |
| Predicted total demand | 63.872333408158376 | 63.9 units |
| Average daily demand | 9.124619058308339 | 9.1 units |
| Current stock | 98 | 98 units |
| Reorder level | 20 | 20 units |
| Projected stock | 34.127666591841624 | 34.1 units |
| Reorder recommended | false | No reorder needed |
| Model MAE | 4.427834701866537 | 4.4 |
| Model RMSE | 5.9726806944167 | 6 |
| Model MAPE | 23.21465981783824 | 23.2% |

Baseline: 7-day moving average, MAE 4.8299464451672085, RMSE 5.676121734215937, MAPE 38.701307840710385. MAE difference -0.40211174330067134. Training: 14 June–12 September (91 days); testing: 13 September–5 October (23 days). MAPE includes 15 nonzero days and excludes 8 zero days.

Wireless Mouse, MOUSE-001: all three endpoints returned 422 with a specific insufficient-sales-history detail requiring at least 30 days. The browser displays Forecast unavailable for this product. and More historical sales data is required before a reliable forecast can be generated. It shows no leftover demo chart, results, or disclosure. No sales were added to change this outcome.

Complete exact JSON for all three horizons and evaluation: test-results/forecast-verification.json. Values above are verification observations, never UI constants.

## Browser, accessibility, and regressions

Real Chrome passed light/dark at 320, 768, 1024, and 1440 pixels. Chart, axes, tooltips, selectors, summary, recommendation, and evaluation remained readable with no page-level horizontal overflow. Mobile light and desktop dark tooltip screenshots were visually inspected. Expanded/collapsed sidebar and mobile navigation passed.

Selectors have associated accessible labels and keyboard access; recommendations include icons and text; daily predictions have a semantic table, caption, column/row headers, and keyboard-operable disclosure. Visible focus styling reuses the existing controls. Retry and refresh are accessible.

Read-only response fixtures separately tested all four skeleton sections and localized error/retry states in both themes, null MAPE, a true reorder recommendation with negative projected stock, and delayed obsolete demo results after switching products. Fixtures never changed server data and are absent from production UI.

Dashboard, Products, Categories, Suppliers, Sales, Inventory Movements, Alerts, and real logout/login passed. Before/after API snapshots for products, categories, suppliers, sales, movements, alerts, and dashboard summary were identical. No unexpected console errors or browser exceptions occurred.

Zero inventory/user mutation requests occurred. The only POSTs were existing-account login. No new sale, stock change, seed, deletion, purchase order, or data cleanup occurred. Existing records were not altered. FastAPI forecasting behavior was not changed. Stage 10 was not started.

## Quality checks

- TypeScript/typecheck: PASS
- Lint: PASS, zero warnings
- Production build: PASS
- Non-blocking bundle warning: minified application chunk 989.77 kB, gzip 296.58 kB, above Vite's 500 kB threshold. Forecasting uses the already installed chart library; no unrelated refactor was undertaken.

Run browser verification with the workspace Node toolchain: node .local-tools/forecast-smoke.mjs. It uses an existing local test account and read-only requests; never prints passwords or JWTs.
