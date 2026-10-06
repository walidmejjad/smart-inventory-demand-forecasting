# Dashboard and reporting API

All dashboard endpoints require the existing JWT bearer token. ADMIN, MANAGER,
and EMPLOYEE may view the reports. Swagger groups them under **Dashboard**.

| Method | Endpoint | Response |
| --- | --- | --- |
| GET | `/api/dashboard/summary` | Catalog, inventory, and sales totals |
| GET | `/api/dashboard/recent-sales?limit=5` | Most recent sales |
| GET | `/api/dashboard/top-products?limit=5` | Products ranked by units sold |
| GET | `/api/dashboard/sales-summary` | Sales totals, average value, and units sold |
| GET | `/api/dashboard/inventory-summary` | Product, stock, and alert counts |

The two list endpoints default to `limit=5` and accept integers from 1 through 50.
Invalid limits return 422. Missing, invalid, or expired authentication returns
401 with `WWW-Authenticate: Bearer`.

## Dashboard summary

```json
{
  "total_products": 4,
  "total_categories": 2,
  "total_suppliers": 3,
  "total_units_in_stock": 22,
  "low_stock_count": 2,
  "out_of_stock_count": 1,
  "total_sales_count": 3,
  "total_revenue": "60.67"
}
```

Catalog counts include categories and suppliers without products. Stock is the
sum of current Product quantities. The existing Alerts service supplies both
alert counts:

- `low_stock_count`: `0 < quantity_in_stock <= reorder_level`.
- `out_of_stock_count`: `quantity_in_stock == 0`, including a zero reorder level.

`total_sales_count` counts Sale records, and `total_revenue` sums their stored
`total_amount`. Sales are counted independently of their item lines to avoid
multiplying totals for sales with multiple items. The current sale workflow
persists only completed sales; rolled-back sales do not contribute to reports.

## Recent sales and top products

Recent sales return `sale_id`, `total_amount`, `created_by_id`, `created_at`, and
`item_count`. `item_count` is the number of SaleItem lines, not the sum of their
quantities. Sales are ordered by `created_at` descending, then sale ID descending
when timestamps match. No user details or authentication information are returned.

Top products return `product_id`, `name`, `sku`, `units_sold`, and `sales_revenue`.
They include only products with SaleItem records and are ordered by total units
sold descending, then product ID ascending for ties. Revenue is the sum of
historical `SaleItem.subtotal`, so later Product price changes do not change it.
The product name and SKU reflect the current catalog.

## Sales and inventory summaries

The sales summary reports all completed sales, without date filtering:

```json
{
  "total_sales": 3,
  "total_revenue": "60.67",
  "average_sale_value": "20.22",
  "total_units_sold": 10
}
```

Average sale value is revenue divided by the number of sales, rounded half up to
two decimal places. Units sold sum historical SaleItem quantities. Money uses
`Decimal` and is serialized as decimal strings. With no sales, counts are zero,
both monetary totals are `"0.00"`, and the recent-sales and top-products lists
are empty. Sales with a zero price still count toward sales and units sold.

Inventory summary returns only `total_products`, `total_units_in_stock`,
`low_stock_count`, and `out_of_stock_count`, with the same definitions as the main
dashboard summary. Empty inventory returns zero for all four fields.

## Implementation and verification

Reports query existing tables through the repository, service, and router layers.
SQL performs counts, sums, grouping, ordering, and limits. List queries return
only report columns and do not load related rows individually. GET requests do
not create records, change stock, or commit writes. No models, tables, or Alembic
migrations are added. No forecasting or graphical frontend is included.

Tests use isolated in-memory SQLite databases and cover counts, Decimal totals,
empty data, limits, ordering and ties, historical prices, authentication and roles,
current alert counts, read-only behavior, failed sales, and query counts.

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider
```

To restart FastAPI, stop the running server with Ctrl+C, then run from the project
directory with the existing `.env` configured:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`, authorize with the access token returned by
`POST /api/auth/login`, and expand **Dashboard**.
