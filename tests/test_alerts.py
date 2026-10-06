import pytest
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models import InventoryMovement, Product, Role, Sale, SaleItem
from app.repositories.user import UserRepository
from app.security.passwords import hash_password
from app.security.tokens import create_access_token

TEST_KEY = "alerts-test-only-signing-key-never-use-in-deployment-123456789"
ALERT_PATHS = ["/api/alerts/low-stock", "/api/alerts/summary"]


@pytest.fixture(autouse=True)
def jwt_config(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret_key", SecretStr(TEST_KEY))
    monkeypatch.setattr(settings, "jwt_algorithm", "HS256")
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", 60)


@pytest.fixture
def user_id(db_engine):
    with Session(db_engine) as db:
        user = UserRepository(db).create({
            "first_name": "Test", "last_name": "Reader", "email": "reader@example.com",
            "password_hash": hash_password("Alerts test passphrase 123!"),
            "role": Role.EMPLOYEE,
        })
        return user.id


@pytest.fixture
def headers(user_id):
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.fixture
def create_product(api):
    status_code, category = api("POST", "/api/categories", {"name": "Alert category"})
    assert status_code == 201
    status_code, supplier = api("POST", "/api/suppliers", {"name": "Alert supplier"})
    assert status_code == 201
    products = []

    def create(stock, reorder_level):
        sku = f"ALERT-{len(products) + 1}"
        status_code, product = api("POST", "/api/products", {
            "name": f"Product {sku}", "sku": sku, "price": "19.99",
            "description": "Internal product description",
            "quantity_in_stock": stock, "reorder_level": reorder_level,
            "category_id": category["id"], "supplier_id": supplier["id"],
        })
        assert status_code == 201
        products.append(product)
        return product

    return create


def alert_payload(product, status):
    return {
        "product_id": product["id"], "name": product["name"], "sku": product["sku"],
        "quantity_in_stock": product["quantity_in_stock"],
        "reorder_level": product["reorder_level"], "status": status,
    }


@pytest.mark.parametrize("stock, reorder_level, expected_status", [
    (11, 10, None),
    (10, 10, "LOW_STOCK"),
    (8, 10, "LOW_STOCK"),
    (0, 10, "OUT_OF_STOCK"),
    (0, 0, "OUT_OF_STOCK"),
    (1, 0, None),
])
def test_stock_thresholds(api, headers, create_product, stock, reorder_level, expected_status):
    product = create_product(stock, reorder_level)
    expected = [] if expected_status is None else [alert_payload(product, expected_status)]
    assert api("GET", ALERT_PATHS[0], headers=headers) == (200, expected)


def test_multiple_alerts_include_only_matching_products(api, headers, create_product):
    first = create_product(10, 10)
    create_product(11, 10)
    second = create_product(8, 10)
    third = create_product(0, 0)
    assert api("GET", ALERT_PATHS[0], headers=headers) == (200, [
        alert_payload(first, "LOW_STOCK"),
        alert_payload(second, "LOW_STOCK"),
        alert_payload(third, "OUT_OF_STOCK"),
    ])


@pytest.mark.parametrize("with_products", [False, True])
def test_no_low_stock_products_returns_empty_list(api, headers, create_product, with_products):
    if with_products:
        create_product(11, 10)
        create_product(1, 0)
    assert api("GET", ALERT_PATHS[0], headers=headers) == (200, [])


@pytest.mark.parametrize("path", ALERT_PATHS)
@pytest.mark.parametrize("role", list(Role))
def test_all_authenticated_roles_can_read_alerts(
    api, db_engine, user_id, headers, create_product, path, role,
):
    product = create_product(8, 10)
    with Session(db_engine) as db:
        repository = UserRepository(db)
        repository.update(repository.get(user_id), {"role": role})
    expected = (
        [alert_payload(product, "LOW_STOCK")]
        if path == ALERT_PATHS[0]
        else {"low_stock_count": 1, "out_of_stock_count": 0}
    )
    assert api("GET", path, headers=headers) == (200, expected)


@pytest.mark.parametrize("path", ALERT_PATHS)
@pytest.mark.parametrize("authorization", [None, "Bearer invalid.token", "Basic invalid"])
def test_alerts_require_valid_authentication(api, path, authorization):
    headers = {} if authorization is None else {"Authorization": authorization}
    status_code, _, response_headers = api("GET", path, headers=headers, with_headers=True)
    assert status_code == 401
    assert response_headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("path", ALERT_PATHS)
def test_expired_token_is_rejected(api, user_id, monkeypatch, path):
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", -1)
    headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
    status_code, _, response_headers = api("GET", path, headers=headers, with_headers=True)
    assert status_code == 401
    assert response_headers["www-authenticate"] == "Bearer"


def test_repeated_alert_reads_do_not_change_stock_or_create_records(
    api, db_engine, headers, create_product,
):
    products = [create_product(8, 10), create_product(0, 0), create_product(20, 10)]
    expected_alerts = [
        alert_payload(products[0], "LOW_STOCK"),
        alert_payload(products[1], "OUT_OF_STOCK"),
    ]
    for _ in range(3):
        assert api("GET", ALERT_PATHS[0], headers=headers) == (200, expected_alerts)
        assert api("GET", ALERT_PATHS[1], headers=headers) == (
            200, {"low_stock_count": 1, "out_of_stock_count": 1},
        )
    for product in products:
        assert api("GET", f"/api/products/{product['id']}") == (200, product)
    with Session(db_engine) as db:
        assert db.scalar(select(func.count()).select_from(Product)) == len(products)
        for model in (Sale, SaleItem, InventoryMovement):
            assert db.scalar(select(func.count()).select_from(model)) == 0


@pytest.mark.parametrize("stock_levels, low_count, out_count", [
    ([], 0, 0),
    ([(11, 10), (1, 0)], 0, 0),
    ([(10, 10), (8, 10), (1, 10), (0, 10), (11, 10)], 3, 1),
    ([(0, 0), (0, 10)], 0, 2),
    ([(1, 10), (10, 10)], 2, 0),
])
def test_summary_counts_products_by_status(
    api, headers, create_product, stock_levels, low_count, out_count,
):
    for stock, reorder_level in stock_levels:
        create_product(stock, reorder_level)
    assert api("GET", ALERT_PATHS[1], headers=headers) == (
        200, {"low_stock_count": low_count, "out_of_stock_count": out_count},
    )


def test_alerts_reflect_current_stock_and_reorder_level(api, headers, create_product):
    product = create_product(8, 5)
    assert api("GET", ALERT_PATHS[0], headers=headers) == (200, [])
    for changes, expected_status in [
        ({"reorder_level": 8}, "LOW_STOCK"),
        ({"quantity_in_stock": 3}, "LOW_STOCK"),
        ({"quantity_in_stock": 0}, "OUT_OF_STOCK"),
        ({"quantity_in_stock": 9}, None),
        ({"reorder_level": 10}, "LOW_STOCK"),
        ({"reorder_level": 1}, None),
    ]:
        status_code, product = api("PUT", f"/api/products/{product['id']}", changes)
        assert status_code == 200
        expected = [] if expected_status is None else [alert_payload(product, expected_status)]
        assert api("GET", ALERT_PATHS[0], headers=headers) == (200, expected)
        assert api("GET", ALERT_PATHS[1], headers=headers) == (200, {
            "low_stock_count": int(expected_status == "LOW_STOCK"),
            "out_of_stock_count": int(expected_status == "OUT_OF_STOCK"),
        })


def test_alerts_reflect_stock_reduced_by_sales(api, headers, create_product):
    product = create_product(8, 5)
    assert api("GET", ALERT_PATHS[0], headers=headers) == (200, [])
    for quantity, remaining, expected_status in [(3, 5, "LOW_STOCK"), (5, 0, "OUT_OF_STOCK")]:
        status_code, _ = api("POST", "/api/sales", {
            "items": [{"product_id": product["id"], "quantity": quantity}],
        }, headers=headers)
        assert status_code == 201
        product["quantity_in_stock"] = remaining
        assert api("GET", ALERT_PATHS[0], headers=headers) == (
            200, [alert_payload(product, expected_status)],
        )
        assert api("GET", ALERT_PATHS[1], headers=headers) == (200, {
            "low_stock_count": int(expected_status == "LOW_STOCK"),
            "out_of_stock_count": int(expected_status == "OUT_OF_STOCK"),
        })


def test_failed_sale_preserves_alerts(api, headers, create_product):
    first = create_product(8, 10)
    second = create_product(1, 0)
    before = [api("GET", path, headers=headers) for path in ALERT_PATHS]
    status_code, _ = api("POST", "/api/sales", {
        "items": [
            {"product_id": first["id"], "quantity": 8},
            {"product_id": second["id"], "quantity": 2},
        ],
    }, headers=headers)
    assert status_code == 409
    assert [api("GET", path, headers=headers) for path in ALERT_PATHS] == before


def test_swagger_alerts_contract(api):
    status_code, document = api("GET", "/openapi.json")
    assert status_code == 200
    for path in ALERT_PATHS:
        assert set(document["paths"][path]) == {"get"}
        operation = document["paths"][path]["get"]
        assert operation["security"] == [{"BearerAuth": []}]
        assert operation["tags"] == ["Alerts"]
    schemas = document["components"]["schemas"]
    assert set(schemas["StockAlertResponse"]["properties"]) == {
        "product_id", "name", "sku", "quantity_in_stock", "reorder_level", "status",
    }
    assert schemas["StockAlertResponse"]["properties"]["status"]["enum"] == [
        "LOW_STOCK", "OUT_OF_STOCK",
    ]
