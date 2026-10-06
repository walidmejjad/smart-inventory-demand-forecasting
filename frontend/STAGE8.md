# Stage 8 — Alerts UI

Completed 6 October 2026 against the real FastAPI server at http://127.0.0.1:8000.

## Files

Created:
- src/types/alert.ts
- src/api/alerts.ts
- src/hooks/use-alerts.ts
- src/lib/alerts.ts
- src/components/alerts/alert-status.tsx
- src/components/alerts/alert-summary.tsx
- src/components/alerts/alerts-list.tsx
- src/components/alerts/alert-product-details.tsx
- src/pages/alerts-page.tsx
- .local-tools/alerts-smoke.mjs (read-only browser verification)
- STAGE8.md
- test-results/alerts-verification.json and light/dark screenshots

Modified: src/routes/router.tsx, replacing only the Alerts placeholder route. The production dist output was regenerated.

No FastAPI files or unrelated frontend modules were edited for Stage 8. Pre-existing backend working-tree changes remain untouched. Forecasting still uses ModulePlaceholderPage; Stage 9 was not started.

## Actual schemas

The live OpenAPI schema and existing backend implementation agree:

GET /api/alerts/low-stock returns an array of:

```typescript
{
  product_id: number
  name: string
  sku: string
  quantity_in_stock: number
  reorder_level: number
  status: 'LOW_STOCK' | 'OUT_OF_STOCK'
}
```

GET /api/alerts/summary returns:

```typescript
{ low_stock_count: number; out_of_stock_count: number }
```

Low stock means 0 < quantity_in_stock <= reorder_level. Out of stock means quantity_in_stock == 0. The counts are disjoint, so Total alerts is their sum. Neither response supplies trends, pagination, timestamps, category, or supplier fields.

## Behavior

Typed API helpers use the existing authenticated Axios client and cancellation. The hook concurrently fetches summary and list, preserves successful resources when the other endpoint fails, and labels retained stale results after refresh failure. Refresh and Retry refetch both endpoints. Existing authentication and 401 handling are reused.

Summary cards show total/out-of-stock/low-stock counts, initial skeletons, and unavailable values when loading fails. Desktop rows and mobile cards display only actual alert fields, with readable icon/text severity. Out-of-stock alerts precede low-stock alerts, then unknown statuses; product ID provides stable ordering. Generic unknown statuses remain visible and filterable.

Case-insensitive name/SKU search and status filtering run over the complete unpaginated endpoint response. Clear filters restores all records. Healthy empty state and filter-empty state are distinct. Errors are friendly, with Retry and no raw backend detail.

View product opens the existing read-only ProductDetails inside the existing accessible RecordDialog. Existing category/supplier APIs and useCatalog resolve product references on inspection. No stock adjustment, dismiss, resolve, edit, or delete controls were added.

## Real data

Both authenticated alert endpoints returned 200.

| Product | SKU | Stock | Reorder | Status |
| --- | --- | ---: | ---: | --- |
| Wireless Mouse | MOUSE-001 | 0 | 10 | OUT_OF_STOCK |

Summary: total 1, out of stock 1, low stock 0. These counts matched the real list.

[DEMO] Simulated forecasting product, DEMO-FORECAST-001, remains at stock 98 and reorder 20; it does not appear in alerts.

## Verification

Real Chrome exercised authenticated navigation, summary/list, search, status filters, clear, refresh requests, and real product inspection. Keyboard focus remains inside the dialog and returns to its trigger on Escape.

Light/dark modes passed at 320, 768, 1024, and 1440 pixels with no page-level horizontal overflow. Expanded/collapsed sidebar and mobile drawer work. Screenshots were also visually inspected at mobile light and desktop dark widths.

Read-only browser response substitutions separately tested delayed skeletons, 503 errors, Retry, healthy empty state, partial endpoint failures, labelled retained stale rows, low-stock styling, generic unknown status, and urgency order. These fixtures never changed FastAPI or PostgreSQL.

Products, Sales, Inventory Movements, Dashboard, and the unchanged Forecasting placeholder loaded. Authenticated registration routing and the guest registration form still render; real logout and login with an existing account succeeded. A new registration was intentionally not submitted because Stage 8 does not require creating users; registration request behavior was verified in the earlier authentication stage.

Before/after backend snapshots for products, sales, inventory movements, dashboard summary, and alerts were identical. The browser sent zero inventory/user mutation requests; the only POST requests were existing-account login. No unexpected browser console errors or JavaScript exceptions occurred.

- TypeScript/typecheck: PASS
- Lint: PASS, zero warnings
- Production build: PASS
- Non-blocking warning: existing minified bundle exceeds 500 kB (624.14 kB, gzip 190.39 kB). No unrelated refactor was made to remove it.

Machine-readable browser evidence: test-results/alerts-verification.json.
