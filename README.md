# Smart Inventory and Demand Forecasting System

A capstone application for managing inventory, reviewing completed sales and stock movements, and forecasting product demand from historical sales. The React interface uses the real FastAPI API; forecasts and evaluation are produced by the backend.

## Technology

- Backend: Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, and JWT authentication.
- Frontend: React, TypeScript, Vite, Tailwind CSS, accessible Radix primitives, and Recharts.
- Machine learning: pandas and scikit-learn `RandomForestRegressor`.

## Features

- User registration/login, session restoration, and logout. Public registration creates an EMPLOYEE account.
- Product, category, and supplier management, stock levels, and reorder thresholds.
- Sales processing using current prices and stock; completed sales are immutable historical records.
- Read-only inventory movement audit history with filters, newest-first display, and related sale details.
- Low-stock and out-of-stock alerts derived from current inventory.
- Product demand forecasts for 7, 14, or 30 days, daily prediction charts, and accessible data tables.
- Forecast evaluation against a 7-day moving-average baseline using MAE, RMSE, and MAPE.
- Advisory reorder recommendations based on predicted demand and projected stock.
- Responsive light/dark interface with keyboard-accessible navigation and dialogs.

Amounts have no currency symbol because the project has no defined currency. Timestamps display in Europe/Paris. Forecast dates are UTC calendar days.

## Forecasting and simulated data

**The forecasting demonstration uses simulated historical sales data because real company sales data were not available.**

The product with SKU `DEMO-FORECAST-001` is explicitly marked as a demo in the catalog and forecasting interface. Its historical sales participate in dashboard and sales-history totals. They must not be presented as real company transactions.

The backend uses completed daily history through yesterday UTC and predicts tomorrow onward. Model evaluation uses a chronological recursive holdout shared by the model and baseline. MAPE excludes days with zero actual demand and is unavailable when all actual values are zero. Results do not imply that the model beats the baseline on every metric. Forecasts support inventory planning and do not guarantee future demand.

Products without sufficient sales history show an unavailable state. The frontend does not fabricate predictions. Reorder recommendations are advisory and do not change inventory, create purchase orders, or automatically order goods.

## Local setup

Prerequisites: Python with the packages in `requirements.txt`, PostgreSQL, and Node.js 24 or newer with npm. Run the backend from the project root.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# Only create .env if it does not already exist:
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Environment variables are configured through `.env`. Set the local PostgreSQL connection variables and a strong private `JWT_SECRET_KEY`. `.env` is gitignored; never commit actual secrets. `.env.example` contains placeholders only.

Create the configured PostgreSQL database if it does not exist, then apply the existing migrations to that database:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- Backend: http://127.0.0.1:8000
- Swagger API documentation: http://127.0.0.1:8000/docs

Do not reset or reseed an existing demonstration database. The demo history already present in this workspace should be preserved.

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: http://127.0.0.1:5173. Use `npm.cmd` if PowerShell blocks the npm shim. Optional frontend environment configuration is described in [frontend/README.md](frontend/README.md). The API base URL defaults to `http://127.0.0.1:8000`; do not append `/api`. Development requests go through Vite's API proxy. Production builds use the configured API origin directly.

## Quality checks

From the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q
```

The backend suite uses isolated SQLite test databases, not the live PostgreSQL demonstration data. On this workspace an old inaccessible pytest cache directory makes bare root collection fail; explicitly targeting `tests` collects the full suite. If cache permissions also fail, use `-p no:cacheprovider`.

From `frontend`:

```powershell
npm run typecheck
npm run lint
npm run build
```

The production build's bundle-size warning is non-blocking. The existing Recharts dependency is the main additional contributor since the forecasting chart was introduced; dependencies were not replaced for the final pass.

## Demonstration path

1. Sign in and review the Dashboard's real revenue, sales, and inventory summary.
2. Open Products and inspect Wireless Mouse (`MOUSE-001`), including its category/supplier and stock status.
3. Open Alerts to show inventory exceptions and read-only product inspection.
4. Open Sales, search for Sale #124, and inspect the completed transaction.
5. Open Inventory Movements and inspect Movement #5, its quantity change, and related Sale #124.
6. Open Demand Forecasting and select the demo product by name/SKU.
7. Show the real daily demand graph, forecast total, evaluation/baseline, and replenishment insight.
8. Explain the simulated historical dataset and the advisory nature of predictions.
9. Select Wireless Mouse to demonstrate graceful insufficient-history handling.

These are existing demonstration records, not hardcoded application behavior. Trust current backend data if values change.

Final verification and limitations are documented in [FINAL_QUALITY_REPORT.md](FINAL_QUALITY_REPORT.md).

