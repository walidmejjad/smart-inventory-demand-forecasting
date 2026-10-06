# Stock alerts

Both endpoints require the existing JWT bearer token and are available to ADMIN,
MANAGER, and EMPLOYEE users. Swagger lists them under **Alerts**.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/alerts/low-stock` | List every product at or below its reorder level |
| GET | `/api/alerts/summary` | Count products by alert status |

The list includes products with `quantity_in_stock <= reorder_level`, ordered by
product ID. Products with zero stock have status `OUT_OF_STOCK`, including when
their reorder level is zero. Other matching products have status `LOW_STOCK`.
Products above their reorder level are excluded. No matches returns `[]`.

Example list response:

```json
[
  {
    "product_id": 1,
    "name": "Wireless Mouse",
    "sku": "MOUSE-001",
    "quantity_in_stock": 8,
    "reorder_level": 10,
    "status": "LOW_STOCK"
  }
]
```

The summary counts the two statuses separately: `low_stock_count` counts products
with `0 < quantity_in_stock <= reorder_level`, and `out_of_stock_count` counts
products with zero stock. Their sum is the number of products in the alert list
for the same stock data. With no matching products, both counts are zero.

```json
{
  "low_stock_count": 3,
  "out_of_stock_count": 1
}
```

Each request queries current Product data. Committed sales, stock updates, and
reorder-level updates are reflected on subsequent reads. Reads do not change
stock or create inventory movements. No alert records are stored, and no Alembic
migration is required because the feature uses existing Product fields. Missing,
invalid, or expired tokens return 401 with `WWW-Authenticate: Bearer`.

## Restart and verify

Stop the running FastAPI server with Ctrl+C, then run from the project directory
in PowerShell with the existing `.env` configured:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`, authorize with an access token returned by
`POST /api/auth/login`, and expand **Alerts**.

Run the full suite against isolated in-memory SQLite databases:

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider
```

The alert tests cover threshold boundaries, zero stock and zero reorder level,
mixed products, empty results, all authenticated roles, invalid and expired
tokens, unchanged stock after repeated reads, summary counts, current stock and
reorder levels, successful and failed sales, and the Swagger contract.
