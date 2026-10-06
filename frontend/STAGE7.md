# Stage 7: Inventory Movements

Implemented against the existing FastAPI endpoints on 6 October 2026. This stage is read-only. No backend source or audit, product, sale, or user records were changed. Alerts and Forecasting remain placeholders; Stage 8 was not started.

Reverified for the repeated Stage 7 request after the registration fixes: the existing implementation meets the requested scope, so no application source changes or new source files were needed. The complete real-backend/browser verification passed again, including unchanged stock 98, movement #5 for Sale #124, all four widths in both themes, filters, details, pagination/error fixtures, cross-module reads and zero mutation requests. Verification JSON/screenshots and production artifacts were regenerated. Typecheck, lint and build passed again; the current bundle advisory is 614.63 kB minified (188.61 kB gzip).

## Files created

- `src/types/inventory-movement.ts`: movement, supported filter types, query, and page contracts.
- `src/api/inventory-movements.ts`: authenticated GET history and GET detail operations only.
- `src/hooks/use-inventory-movements.ts`: abortable paginated/filter-aware loading, retry and stale-data handling.
- `src/lib/inventory-movements.ts`: supported types, readable unknown-type labels, signed quantities and Sale-ID validation.
- `src/components/inventory-movements/movement-ui.tsx`: restrained badges, signed directional quantities, shared date rendering.
- `src/components/inventory-movements/movements-list.tsx`: semantic desktop table and responsive cards.
- `src/components/inventory-movements/movement-details.tsx`: independently fetched immutable record details.
- `src/pages/inventory-movements-page.tsx`: page, filters, pagination, references and dialogs.
- `.local-tools/inventory-movements-smoke.mjs`: real-backend read-only verification plus intercepted exceptional-state/pagination tests.
- `test-results/movements-verification.json`: real response evidence and verification results.
- `test-results/movements-*.png` and `test-results/movement-details-*.png`: responsive/theme/loading/empty/error screenshots.
- `STAGE7.md`: this report.

## Files modified

- `src/routes/router.tsx`: replaces only the `/inventory-movements` placeholder with the new page.
- `dist/`: regenerated production artifacts.

Existing authentication, registration, app shell, Dashboard, Products, Categories, Suppliers, and Sales implementations were not modified. The existing `SaleDetails` component is reused as-is.

## Architecture and API contracts

Actual source schemas, repository order and running OpenAPI definitions were inspected before implementation. The backend accepts `offset`, `limit` (1–100), `product_id`, `movement_type`, and `sale_id`. Its supported types are `SALE`, `RESTOCK`, and `ADJUSTMENT`; history is ordered by ascending movement ID.

The API requests 26 rows for each 25-row visible page. The extra row determines whether Next is available; the next offset advances by 25. This bounds both fetches and rendered rows and does not invent a total count. Previous/Next are disabled appropriately during loading and at known boundaries. The UI preserves ascending backend order and explicitly labels it “Oldest first (backend order).” It does not reverse individual pages and imply globally newest-first results.

The hook aborts obsolete requests and keys data to both page and applied filters, so records from a previous query are never presented as results of a new query. Refresh failures can retain the previous data for the same query with an explicit stale-list error. Detail requests are also abortable, with safe 404/error/retry handling.

The page reuses `productsApi` and `useCatalog` rather than duplicating product fetching. Names and SKUs reflect current catalog data; missing or failed lookups show `Product #ID`, without invented information. Creator references stay `User #ID`; no user directory requests were added. Amount/date formatting in reused sale details and date formatting throughout the movement UI use existing Dashboard utilities.

No create/update/delete APIs or movement mutation controls exist.

## Filters

- Product, movement type and related Sale ID are submitted to backend filters via Apply filters.
- Applying or clearing filters resets pagination to offset 0.
- Sale IDs must be positive safe whole integers; an optional leading `#` is accepted. Invalid input is associated with its field and focused, without sending a request.
- The immediate name/SKU search explicitly applies to the current page. The Product filter searches across the entire backend history.
- Clear filters resets backend filters and local search.
- Known filter options match the backend enum; returned unknown types remain visible and receive readable labels, such as `TRANSFER_IN` → `Transfer In`.

## Presentation and details

Desktop shows a compact semantic table; smaller widths show stacked records. Both include date/time, product/SKU, type, quantity change, related sale, creator and a meaningful View details action. Movement IDs are shown as secondary context.

Positive quantities have an explicit `+`, an upward icon and muted green treatment; negative quantities retain `−`/minus and a downward icon with muted red treatment. Zero is neutral. Screen-reader text identifies increase/decrease/no change, so meaning does not depend on color.

Movement details fetch `GET /api/inventory-movements/{id}` and show every requested audit field. The automation statement appears only for type `SALE` with a non-null `sale_id`. Missing sale references show an em dash. Related sales open the existing immutable sale-details component. Dialogs reuse existing Radix focus management, including return from sale details to the movement dialog and then to its original trigger.

## Real Sale #124 verification

Verified from actual responses, never hardcoded into the UI:

- Movement: **#5**.
- Movement type: **SALE**.
- Quantity change: **−1**.
- Related sale: **#124**.
- Product: **#3**, `[DEMO] Simulated forecasting product`.
- SKU: **DEMO-FORECAST-001**.
- Created by: **User #3**.
- Created at: **6 October 2026, 13:06:02 Europe/Paris**.
- Current product stock: **98**.

Real list and detail requests resolve this record correctly. Related-sale details load from FastAPI. The Products detail UI still shows 98 units, Sale #124 still exists, and Dashboard still loads. Before/after comparisons cover movement history, products, Sale #124 and Dashboard summary. No additional sales or movements were created, recreated or modified, and no module mutation requests were made during verification.

## Verification and checks

Passed:

- Real authenticated history, product name/SKU resolution, movement type, signed quantities and Sale #124 references.
- Real movement details and reused related-sale details.
- Product/SKU page search, real backend type/product/sale filters, invalid Sale-ID feedback, clear filters.
- Keyboard focus trap/restoration, including the nested related-sale dialog.
- Light/dark history, filters, badges, quantity styling and details at **320, 768, 1024 and 1440px**, without horizontal page/dialog overflow.
- Expanded sidebar, collapsed sidebar and mobile Inventory Movements navigation.
- Injected loading skeletons, empty history, 503/error/retry in both themes; detail 404/retry; product-reference error/fallback/retry.
- Injected 30-record history: 25-row bound, Next/Previous offsets, disabled Next on final page.
- Injected Restock/Adjustment/unknown type/positive/negative/zero/null-sale records: readable labels and correct signs; no automation claim for unrelated types.
- Products, Sales and Dashboard cross-module checks, with original backend records unchanged.
- No unexpected browser console errors or JavaScript exceptions; intentional HTTP failures are isolated in exceptional-state tests.

Synthetic response substitutions were browser-only and did not write any records to FastAPI. Real verification used only GET requests after signing in to the existing development account.

- TypeScript/typecheck: **passed**.
- ESLint: **passed**, zero warnings.
- Production build: **passed**.

Non-blocking warnings/limitations: Vite's main JavaScript chunk is approximately **614.10 kB** minified (**188.42 kB gzip**), above its 500 kB advisory threshold. Name/SKU text search is explicitly page-local; the backend Product filter covers all history. Offset pagination follows the existing API and is not a snapshot if other sessions insert records concurrently. Real history currently has five records, so multi-page and non-SALE display cases were verified using intercepted responses rather than database mutations.

**Stop here. Do not proceed to Stage 8.**
