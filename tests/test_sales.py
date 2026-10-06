from decimal import Decimal

import pytest
from pydantic import SecretStr
from sqlalchemy import event, func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models import InventoryMovement, MovementType, Product, Role, Sale, SaleItem
from app.repositories.inventory_movement import InventoryMovementRepository
from app.repositories.user import UserRepository
from app.schemas.sale import SaleCreate
from app.security.passwords import hash_password
from app.security.tokens import create_access_token
from app.services.sale import SaleService

TEST_KEY = "sales-test-only-signing-key-never-use-in-deployment-123456789"
TEST_PASSWORD = "Sales test passphrase 123!"


@pytest.fixture(autouse=True)
def jwt_config(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret_key", SecretStr(TEST_KEY))
    monkeypatch.setattr(settings, "jwt_algorithm", "HS256")
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", 60)


@pytest.fixture
def seller(db_engine):
    with Session(db_engine) as db:
        user = UserRepository(db).create({
            "first_name": "Test", "last_name": "Seller", "email": "seller@example.com",
            "password_hash": hash_password(TEST_PASSWORD), "role": Role.EMPLOYEE,
        })
        return user.id


@pytest.fixture
def headers(seller):
    return {"Authorization": f"Bearer {create_access_token(seller)}"}


@pytest.fixture
def products(api):
    status_code, category = api("POST", "/api/categories", {"name": "Sale category"})
    assert status_code == 201
    status_code, supplier = api("POST", "/api/suppliers", {"name": "Sale supplier"})
    assert status_code == 201
    result = []
    for sku, price, stock in [("SALE-1", "19.99", 10), ("SALE-2", "0.10", 5)]:
        status_code, product = api("POST", "/api/products", {
            "name": sku, "sku": sku, "price": price, "quantity_in_stock": stock,
            "category_id": category["id"], "supplier_id": supplier["id"],
        })
        assert status_code == 201
        result.append(product)
    return result


def sale_payload(*items):
    return {"items": [{"product_id": product["id"], "quantity": quantity} for product, quantity in items]}


def assert_no_sale_or_stock_changes(db_engine, products):
    with Session(db_engine) as db:
        for model in (Sale, SaleItem, InventoryMovement):
            assert db.scalar(select(func.count()).select_from(model)) == 0
        for product in products:
            assert db.get(Product, product["id"]).quantity_in_stock == product["quantity_in_stock"]


@pytest.mark.parametrize("role", list(Role))
def test_single_product_sale_is_available_to_every_role(api, db_engine, seller, headers, products, role):
    with Session(db_engine) as db:
        repository = UserRepository(db)
        repository.update(repository.get(seller), {"role": role})
    status_code, sale = api("POST", "/api/sales", sale_payload((products[0], 2)), headers=headers)
    assert status_code == 201
    assert sale["created_by_id"] == seller
    assert sale["total_amount"] == "39.98"
    assert sale["created_at"] and sale["updated_at"]
    assert set(sale) == {"id", "created_by_id", "total_amount", "created_at", "updated_at", "items"}
    assert len(sale["items"]) == 1
    item = sale["items"][0]
    assert item == {
        "id": item["id"], "product_id": products[0]["id"], "quantity": 2,
        "unit_price": "19.99", "subtotal": "39.98",
    }
    with Session(db_engine) as db:
        assert db.get(Product, products[0]["id"]).quantity_in_stock == 8
        assert db.get(Product, products[1]["id"]).quantity_in_stock == 5
        stored = db.get(Sale, sale["id"])
        assert stored.created_by_id == seller
        assert stored.total_amount == Decimal("39.98")
        assert len(stored.items) == 1
        assert stored.items[0].quantity == 2
        assert stored.items[0].unit_price == Decimal("19.99")
        assert stored.items[0].subtotal == Decimal("39.98")
        movements = list(db.scalars(select(InventoryMovement)))
        assert len(movements) == 1
        movement = movements[0]
        assert movement.product_id == products[0]["id"]
        assert movement.movement_type == MovementType.SALE
        assert movement.quantity_change == -2
        assert movement.sale_id == sale["id"]
        assert movement.created_by_id == seller


def test_multi_product_sale_has_exact_totals_and_movements(api, db_engine, headers, products):
    status_code, sale = api(
        "POST", "/api/sales", sale_payload((products[0], 2), (products[1], 3)), headers=headers,
    )
    assert status_code == 201
    assert sale["total_amount"] == "40.28"
    assert [item["subtotal"] for item in sale["items"]] == ["39.98", "0.30"]
    with Session(db_engine) as db:
        assert db.get(Product, products[0]["id"]).quantity_in_stock == 8
        assert db.get(Product, products[1]["id"]).quantity_in_stock == 2
        items = list(db.scalars(select(SaleItem).where(SaleItem.sale_id == sale["id"])))
        assert len(items) == 2
        assert sum((item.subtotal for item in items), Decimal("0.00")) == Decimal("40.28")
        movements = list(db.scalars(select(InventoryMovement)))
        assert {(m.product_id, m.quantity_change) for m in movements} == {
            (products[0]["id"], -2), (products[1]["id"], -3),
        }
        assert all(m.sale_id == sale["id"] and m.movement_type == MovementType.SALE for m in movements)


def test_sale_uses_current_price_and_preserves_price_history(api, headers, products):
    product = products[0]
    assert api("PUT", f"/api/products/{product['id']}", {"price": "0.10"})[0] == 200
    status_code, sale = api("POST", "/api/sales", sale_payload((product, 3)), headers=headers)
    assert status_code == 201
    assert sale["total_amount"] == "0.30"
    assert sale["items"][0]["unit_price"] == "0.10"
    assert api("PUT", f"/api/products/{product['id']}", {"price": "50.00"})[0] == 200
    assert api("GET", f"/api/sales/{sale['id']}", headers=headers) == (200, sale)


def test_selling_all_stock_prevents_a_second_sale(api, db_engine, headers, products):
    payload = sale_payload((products[0], 10))
    assert api("POST", "/api/sales", payload, headers=headers)[0] == 201
    assert api("POST", "/api/sales", payload, headers=headers) == (
        409, {"detail": f"Insufficient stock for product {products[0]['id']}"},
    )
    with Session(db_engine) as db:
        assert db.get(Product, products[0]["id"]).quantity_in_stock == 0
        for model in (Sale, SaleItem, InventoryMovement):
            assert db.scalar(select(func.count()).select_from(model)) == 1


@pytest.mark.parametrize("failure", ["insufficient_stock", "missing_product"])
@pytest.mark.parametrize("reverse", [False, True])
def test_invalid_item_leaves_all_stock_and_records_unchanged(api, db_engine, headers, products, failure, reverse):
    failing_product = products[1] if failure == "insufficient_stock" else {"id": 999999}
    items = [(products[0], 2), (failing_product, 6)]
    if reverse:
        items.reverse()
    status_code, body = api("POST", "/api/sales", sale_payload(*items), headers=headers)
    assert status_code == (409 if failure == "insufficient_stock" else 404)
    assert str(failing_product["id"]) in body["detail"]
    assert_no_sale_or_stock_changes(db_engine, products)


@pytest.mark.parametrize("quantity", [0, -1, 1.5, True, "2", None, 2147483648])
def test_invalid_quantities_are_rejected(api, db_engine, headers, products, quantity):
    assert api("POST", "/api/sales", sale_payload((products[0], quantity)), headers=headers)[0] == 422
    assert_no_sale_or_stock_changes(db_engine, products)


@pytest.mark.parametrize("payload", [{}, {"items": []}, {"items": None}])
def test_empty_sale_is_rejected(api, db_engine, headers, products, payload):
    assert api("POST", "/api/sales", payload, headers=headers)[0] == 422
    assert_no_sale_or_stock_changes(db_engine, products)


def test_duplicate_products_are_rejected(api, db_engine, headers, products):
    status_code, body = api(
        "POST", "/api/sales", sale_payload((products[0], 6), (products[0], 6)), headers=headers,
    )
    assert status_code == 422
    assert "Duplicate product IDs" in body["detail"][0]["msg"]
    assert_no_sale_or_stock_changes(db_engine, products)


@pytest.mark.parametrize("extra", [{"unit_price": "0.01"}, {"subtotal": "0.01"}, {"id": 42}])
def test_client_cannot_set_item_prices_or_ids(api, db_engine, headers, products, extra):
    payload = sale_payload((products[0], 2))
    payload["items"][0].update(extra)
    assert api("POST", "/api/sales", payload, headers=headers)[0] == 422
    assert_no_sale_or_stock_changes(db_engine, products)


@pytest.mark.parametrize("extra", [{"total_amount": "0.01"}, {"created_by_id": 999999}])
def test_client_cannot_set_sale_total_or_creator(api, db_engine, headers, products, extra):
    payload = {**sale_payload((products[0], 2)), **extra}
    assert api("POST", "/api/sales", payload, headers=headers)[0] == 422
    assert_no_sale_or_stock_changes(db_engine, products)


@pytest.mark.parametrize("method, path", [
    ("POST", "/api/sales"), ("GET", "/api/sales"), ("GET", "/api/sales/1"),
    ("GET", "/api/inventory-movements"), ("GET", "/api/inventory-movements/1"),
])
def test_sale_and_movement_endpoints_require_authentication(api, method, path):
    status_code, _, headers = api(method, path, with_headers=True)
    assert status_code == 401
    assert headers["www-authenticate"] == "Bearer"


def test_sale_reads_include_items_and_pagination(api, headers, products):
    assert api("GET", "/api/sales", headers=headers) == (200, [])
    sales = []
    for product in products:
        status_code, sale = api("POST", "/api/sales", sale_payload((product, 1)), headers=headers)
        assert status_code == 201
        sales.append(sale)
        assert api("GET", f"/api/sales/{sale['id']}", headers=headers) == (200, sale)
    assert api("GET", "/api/sales", headers=headers) == (200, sales)
    assert api("GET", "/api/sales?offset=1&limit=1", headers=headers) == (200, sales[1:])
    assert api("GET", "/api/sales?limit=1", headers=headers) == (200, sales[:1])


def test_movement_reads_filters_and_pagination(api, headers, products, seller):
    assert api("GET", "/api/inventory-movements", headers=headers) == (200, [])
    _, first = api("POST", "/api/sales", sale_payload((products[0], 2), (products[1], 1)), headers=headers)
    _, second = api("POST", "/api/sales", sale_payload((products[1], 2)), headers=headers)
    status_code, movements = api("GET", "/api/inventory-movements", headers=headers)
    assert status_code == 200 and len(movements) == 3
    for movement in movements:
        assert movement["created_by_id"] == seller
        assert movement["movement_type"] == "SALE" and movement["quantity_change"] < 0
        assert set(movement) == {
            "id", "product_id", "movement_type", "quantity_change", "sale_id", "created_by_id", "created_at",
        }
        assert api("GET", f"/api/inventory-movements/{movement['id']}", headers=headers) == (200, movement)
    root = "/api/inventory-movements"
    assert api("GET", f"{root}?product_id={products[0]['id']}", headers=headers) == (200, movements[:1])
    assert api("GET", f"{root}?sale_id={second['id']}", headers=headers) == (200, movements[2:])
    assert api("GET", f"{root}?movement_type=SALE", headers=headers) == (200, movements)
    assert api("GET", f"{root}?movement_type=RESTOCK", headers=headers) == (200, [])
    assert api("GET", f"{root}?offset=1&limit=1", headers=headers) == (200, movements[1:2])
    filters = f"?sale_id={first['id']}&product_id={products[1]['id']}&movement_type=SALE"
    assert api("GET", root + filters, headers=headers) == (200, movements[1:2])


@pytest.mark.parametrize("resource, message", [
    ("sales", "Sale not found"), ("inventory-movements", "Inventory movement not found"),
])
def test_missing_sale_or_movement(api, headers, resource, message):
    assert api("GET", f"/api/{resource}/999999", headers=headers) == (404, {"detail": message})


@pytest.mark.parametrize("resource", ["sales", "inventory-movements"])
@pytest.mark.parametrize("suffix", ["?offset=-1", "?limit=0", "?limit=101", "/0", "/not-an-id"])
def test_invalid_pagination_and_paths(api, headers, resource, suffix):
    assert api("GET", f"/api/{resource}{suffix}", headers=headers)[0] == 422


@pytest.mark.parametrize("query", ["product_id=0", "sale_id=-1", "movement_type=UNKNOWN"])
def test_invalid_movement_filters(api, headers, query):
    assert api("GET", f"/api/inventory-movements?{query}", headers=headers)[0] == 422


def test_completed_sales_and_movements_have_no_mutation_endpoints(api, headers, products):
    _, sale = api("POST", "/api/sales", sale_payload((products[0], 1)), headers=headers)
    _, movements = api("GET", "/api/inventory-movements", headers=headers)
    for method in ("PUT", "PATCH", "DELETE"):
        assert api(method, f"/api/sales/{sale['id']}", {}, headers=headers)[0] == 405
        assert api(method, f"/api/inventory-movements/{movements[0]['id']}", {}, headers=headers)[0] == 405
    assert api("POST", "/api/inventory-movements", {}, headers=headers)[0] == 405
    assert api("DELETE", f"/api/products/{products[0]['id']}")[0] == 409


def test_database_failure_after_writes_rolls_back_entire_sale(api, db_engine, headers, products, monkeypatch):
    original_add = InventoryMovementRepository.add
    calls = 0

    def fail_on_second_movement(self, movement):
        nonlocal calls
        calls += 1
        if calls == 2:
            # Persist the pending sale/items, stock changes and first movement
            # within the uncommitted transaction before a real constraint failure.
            self.db.flush()
            assert self.db.scalar(select(func.count()).select_from(Sale)) == 1
            assert self.db.scalar(select(func.count()).select_from(InventoryMovement)) == 1
            movement.quantity_change = 0
        original_add(self, movement)

    with monkeypatch.context() as scoped:
        scoped.setattr(InventoryMovementRepository, "add", fail_on_second_movement)
        assert api(
            "POST", "/api/sales", sale_payload((products[0], 2), (products[1], 1)), headers=headers,
        ) == (409, {"detail": "Operation conflicts with existing data"})
    assert calls == 2
    assert_no_sale_or_stock_changes(db_engine, products)
    assert api("POST", "/api/sales", sale_payload((products[0], 2)), headers=headers)[0] == 201


def test_commit_failure_rolls_back_flushed_records_and_reuses_session(db_engine, seller, products, monkeypatch):
    data = SaleCreate.model_validate(sale_payload((products[0], 2), (products[1], 1)))
    with Session(db_engine, autoflush=False) as db:
        original_commit = db.commit

        def fail_commit():
            assert db.scalar(select(func.count()).select_from(SaleItem)) == 2
            raise OperationalError("private SQL", {}, Exception("private failure"))

        monkeypatch.setattr(db, "commit", fail_commit)
        with pytest.raises(OperationalError):
            SaleService(db).create(data, seller)
        assert not db.in_transaction()
        assert_no_sale_or_stock_changes(db_engine, products)
        monkeypatch.setattr(db, "commit", original_commit)
        sale = SaleService(db).create(data, seller)
        assert sale.total_amount == Decimal("40.08")


def test_unexpected_failure_rolls_back_staged_changes(db_engine, seller, products, monkeypatch):
    def fail_movement(self, movement):
        self.db.flush()
        raise RuntimeError("Unexpected failure")

    monkeypatch.setattr(InventoryMovementRepository, "add", fail_movement)
    with Session(db_engine, autoflush=False) as db:
        with pytest.raises(RuntimeError, match="Unexpected failure"):
            SaleService(db).create(SaleCreate.model_validate(sale_payload((products[0], 2))), seller)
        assert not db.in_transaction()
    assert_no_sale_or_stock_changes(db_engine, products)


def test_sales_listing_eagerly_loads_items(api, db_engine, headers, products):
    for _ in range(3):
        assert api("POST", "/api/sales", sale_payload((products[0], 1)), headers=headers)[0] == 201
    item_queries = []

    def capture(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT") and "FROM sale_items" in statement:
            item_queries.append(statement)

    event.listen(db_engine, "before_cursor_execute", capture)
    try:
        status_code, sales = api("GET", "/api/sales", headers=headers)
    finally:
        event.remove(db_engine, "before_cursor_execute", capture)
    assert status_code == 200 and len(sales) == 3
    assert all(len(sale["items"]) == 1 for sale in sales)
    assert len(item_queries) == 1


def test_swagger_sales_and_movement_contract(api):
    _, document = api("GET", "/openapi.json")
    for path, methods, tag in [
        ("/api/sales", {"get", "post"}, "Sales"),
        ("/api/sales/{sale_id}", {"get"}, "Sales"),
        ("/api/inventory-movements", {"get"}, "Inventory Movements"),
        ("/api/inventory-movements/{movement_id}", {"get"}, "Inventory Movements"),
    ]:
        assert set(document["paths"][path]) == methods
        for operation in document["paths"][path].values():
            assert operation["security"] == [{"BearerAuth": []}]
            assert operation["tags"] == [tag]
    schemas = document["components"]["schemas"]
    assert set(schemas["SaleCreate"]["properties"]) == {"items"}
    assert set(schemas["SaleItemCreate"]["properties"]) == {"product_id", "quantity"}
