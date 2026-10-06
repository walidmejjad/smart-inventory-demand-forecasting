# Smart Inventory frontend

React, TypeScript, and Vite frontend for the Smart Inventory and Demand Forecasting System. All eight authenticated module routes are implemented: Dashboard, Products, Categories, Suppliers, Sales, Inventory Movements, Alerts, and Demand Forecasting. Login and registration use the existing FastAPI authentication API.

See the root [README](../README.md) for database/backend setup, the capstone features, forecasting methodology, and simulated-data disclosure.

## Run locally

Use Node.js 24 or newer. From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` requests to FastAPI, which should be running at http://127.0.0.1:8000.

The default API base URL is `http://127.0.0.1:8000`. To override it, create a frontend `.env` or `.env.local` using `.env.example` and set `VITE_API_BASE_URL`. Do not append `/api`. Restart Vite after environment changes. Frontend environment variables are public build configuration; never put secrets in them.

Use `npm.cmd` when PowerShell blocks npm's script shim. This workspace also has an ignored portable Node runtime under `.local-tools`, which is optional and not application source.

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview
```

Production output is in `dist`. Production preview uses the actual configured backend origin rather than Vite's development proxy. Browser-route hosting requires an index.html fallback; no deployment infrastructure is included.

## Existing architecture

The responsive shell and module navigation live under AppLayout and protected routes. Shared semantic tokens support light, dark, and system themes. Native form controls, Radix dialogs/menus, and labelled actions provide keyboard access and focus management.

The shared Axios client adds the sessionStorage JWT, normalizes API errors, and preserves cancellation. AuthContext restores the user from `/api/auth/me`. Passwords and user profiles are not persisted in browser storage. Registration submits only first_name, last_name, email, and the exact input password; confirm password is validation-only. A verified registration response precedes real login and token storage.

Catalog resources use the backend's offset/limit API to load all references. CRUD dialogs submit only changed fields on edits and preserve backend duplicate/reference validation. Monetary amounts are exact decimal strings with two decimal places and no invented currency. Timestamps use Europe/Paris consistently.

Sales displays 25 records per page using backend offset/limit plus one look-ahead record. Sale ID substring search remains global by loading complete history only while searching. Completed sales and details remain read-only; the existing New sale workflow is unchanged.

Inventory movements remain read-only. Because the backend has no descending sort parameter, the frontend loads the complete filtered history, sorts by created_at descending with ID as tie-breaker, then paginates 25 records at a time. This ensures newest-first ordering across pages, rather than reversing only the oldest server page. For substantially larger audit histories, server-side descending pagination would be a future API improvement.

Alerts uses real summary and stock-alert endpoints, severity ordering, search/status filters, and existing read-only product details. Forecasting loads real backend predictions and reorder insight for the selected horizon; evaluation is independent of horizon. Obsolete results are cancelled/hidden. Recharts renders backend values, with the same daily predictions available in a semantic table. Insufficient history shows one primary explanation and muted secondary unavailable sections.

The demo product is resolved by SKU, never numeric ID. Its simulated-history disclosure is preserved. The backend uses RandomForestRegressor and compares it with a moving-average baseline; no fake confidence intervals, quality ratings, or guaranteed accuracy claims appear.

## Verification

The final pass includes real-backend browser checks, responsive/light/dark audits, database integrity comparisons, backend pytest, TypeScript, lint, and production build. Results and limitations are in [FINAL_QUALITY_REPORT.md](../FINAL_QUALITY_REPORT.md). The chart library contributes to the accepted non-blocking bundle-size warning; no risky dependency replacement or broad refactor was performed.

Development runtimes, screenshots, dependencies, and build output are gitignored. They are not production application source.
