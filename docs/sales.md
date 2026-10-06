# Sales and inventory movements

All five endpoints require the existing JWT bearer token. ADMIN, MANAGER, and
EMPLOYEE users can create and read sales and read inventory movements.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/sales` | Complete a sale and deduct stock atomically |
| GET | `/api/sales` | List sales with their items |
| GET | `/api/sales/{sale_id}` | Get a sale with its items |
| GET | `/api/inventory-movements` | List inventory movements |
| GET | `/api/inventory-movements/{movement_id}` | Get an inventory movement |

The list endpoints use `offset=0` and `limit=100` by default, with a maximum limit
of 100. Movements also support `product_id`, `movement_type`, and `sale_id` filters,
which can be combined. Movement types are `SALE`, `RESTOCK`, and `ADJUSTMENT`;
only `SALE` is generated in this phase.

## Create a sale

```json
{
  "items": [
    {"product_id": 1, "quantity": 2},
    {"product_id": 5, "quantity": 1}
  ]
}
```

Use one item per product. **Duplicate product IDs are rejected with 422**; combine
their quantities before submitting the request. Items must be nonempty, and each
quantity must be a positive integer within PostgreSQL's integer range. Client
prices, subtotals, totals, and creator IDs are rejected as extra input fields.

A successful request returns 201 with the sale ID, authenticated creator's ID,
timestamps, total, and item IDs, quantities, prices, and subtotals. Monetary values
are calculated with `Decimal` and serialized as decimal strings, following the
existing Product response convention. Item prices are historical snapshots and
remain unchanged when a Product's price is later edited.

Missing products, sales, or movements return 404. Insufficient stock returns 409
and identifies the product by ID. Invalid input returns 422. Missing or invalid
authentication follows the existing 401 behavior.

## Transaction behavior

The sale service uses the request's SQLAlchemy session, including the transaction
already started by authentication. It locks all requested products with PostgreSQL
`SELECT ... FOR UPDATE` in product ID order, then checks every product and its
stock before applying changes. Competing sales wait for these locks and read the
current quantities and prices after acquiring them.

The service stages the sale, items, stock deductions, and one negative SALE
movement per product. The new repositories do not commit. The service flushes,
materializes its response, and commits once; any exception before a successful
commit rolls everything back. Existing nonnegative stock constraints remain an
additional database safeguard. No response-loading queries run after commit.

Completed sales and movements have no update or delete endpoints. Movements
cannot be submitted manually. Foreign keys preserve references to users,
products, and sales. Sale reads eagerly load their items to avoid a query per sale.

## Migration and startup

Revision `d0a975d4f7aa` (`create_sales_and_inventory_movements`) follows
`abfe3b007fb4`. It adds only the three new tables, their constraints/indexes, and
the `inventory_movement_type` enum. Downgrade removes those additions in dependency
order, including the enum.

From the project directory in PowerShell, with the existing `.env` configured:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

To restart FastAPI, stop the current server with Ctrl+C, then run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Swagger is available at `http://127.0.0.1:8000/docs` under **Sales** and
**Inventory Movements**.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider
```

Tests use isolated in-memory SQLite databases, including the migration round trip.
They cover creation, exact decimal totals, authentication, input validation,
stock deductions, movements, reads/filtering/pagination, and rollback after writes
and commit failures. SQLite does not implement PostgreSQL row locks, so this suite
does not verify simultaneous PostgreSQL sales. PostgreSQL migration SQL can be
checked without connecting to a database:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade abfe3b007fb4:d0a975d4f7aa --sql
.\.venv\Scripts\python.exe -m alembic downgrade d0a975d4f7aa:abfe3b007fb4 --sql
```
