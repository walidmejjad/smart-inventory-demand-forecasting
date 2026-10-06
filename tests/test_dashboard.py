from datetime import datetime, timezone
from decimal import Decimal

import pytest
from pydantic import SecretStr
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.database import Base
from app.models import Role, Sale
from app.repositories.user import UserRepository
from app.security.passwords import hash_password
from app.security.tokens import create_access_token
from app.services.dashboard import DashboardService

TEST_KEY = "dashboard-test-only-signing-key-never-use-in-deployment-123456789"
DASHBOARD_PATHS = [
    "/api/dashboard/summary", "/api/dashboard/recent-sales", "/api/dashboard/top-products",
    "/api/dashboard/sales-summary", "/api/dashboard/inventory-summary",
]
LIST_PATHS = ["/api/dashboard/recent-sales", "/api/dashboard/top-products"]


@pytest.fixture(autouse=True)
def jwt_config(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret_key", SecretStr(TEST_KEY))
    monkeypatch.setattr(settings, "jwt_algorithm", "HS256")
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", 60)


@pytest.fixture
def user_id(db_engine):
    with Session(db_engine) as db:
        user = UserRepository(db).create({
            "first_name": "Test", "last_name": "Reporter", "email": "reporter@example.com",
            "password_hash": hash_password("Dashboard test passphrase 123!"),
            "role": Role.EMPLOYEE,
        })
        return user.id


@pytest.fixture
def headers(user_id):
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.fixture
def create_product(api):
    status_code, category = api("POST", "/api/categories", {"name": "Dashboard category"})
    assert status_code == 201
    status_code, supplier = api("POST", "/api/suppliers", {"name": "Dashboard supplier"})
    assert status_code == 201
    products = []

    def create(**overrides):
        sku = f"DASH-{len(products) + 1}"
        status_code, product = api("POST", "/api/products", {
            "name": f"Product {sku}", "sku": sku, "price": "10.00",
            "quantity_in_stock": 100, "reorder_level": 5,
            "category_id": category["id"], "supplier_id": supplier["id"],
            **overrides,
        })
        assert status_code == 201
        products.append(product)
        return product

    return create


@pytest.fixture
def complete_sale(api, headers):
    def create(*items):
        status_code, sale = api("POST", "/api/sales", {
            "items": [{"product_id": product["id"], "quantity": quantity} for product, quantity in items],
        }, headers=headers)
        assert status_code == 201
        return sale

    return create


@pytest.fixture
def report_data(create_product, complete_sale):
    products = [
        create_product(price="19.99", quantity_in_stock=20, reorder_level=10),
        create_product(price="0.10", quantity_in_stock=10, reorder_level=5),
        create_product(price="5.00", quantity_in_stock=2, reorder_level=2),
        create_product(price="1.00", quantity_in_stock=0, reorder_level=0),
    ]
    sales = [
        complete_sale((products[0], 2), (products[1], 3)),
        complete_sale((products[1], 4)),
        complete_sale((products[0], 1)),
    ]
    return products, sales


def test_dashboard_summary_counts_inventory_catalog_and_sales(api, headers, report_data):
    # Unused categories and suppliers must count too, without multiplying totals.
    assert api("POST", "/api/categories", {"name": "Unused category"})[0] == 201
    for name in ("Unused supplier 1", "Unused supplier 2"):
        assert api("POST", "/api/suppliers", {"name": name})[0] == 201
    assert api("GET", "/api/dashboard/summary", headers=headers) == (200, {
        "total_products": 4, "total_categories": 2, "total_suppliers": 3,
        "total_units_in_stock": 22, "low_stock_count": 2, "out_of_stock_count": 1,
        "total_sales_count": 3, "total_revenue": "60.67",
    })


def test_empty_dashboard_returns_zero_totals_and_empty_lists(api, headers):
    assert api("GET", "/api/dashboard/summary", headers=headers) == (200, {
        "total_products": 0, "total_categories": 0, "total_suppliers": 0,
        "total_units_in_stock": 0, "low_stock_count": 0, "out_of_stock_count": 0,
        "total_sales_count": 0, "total_revenue": "0.00",
    })
    assert api("GET", "/api/dashboard/sales-summary", headers=headers) == (200, {
        "total_sales": 0, "total_revenue": "0.00",
        "average_sale_value": "0.00", "total_units_sold": 0,
    })
    assert api("GET", "/api/dashboard/inventory-summary", headers=headers) == (200, {
        "total_products": 0, "total_units_in_stock": 0,
        "low_stock_count": 0, "out_of_stock_count": 0,
    })
    for path in LIST_PATHS:
        assert api("GET", path, headers=headers) == (200, [])


def test_products_without_sales_do_not_create_revenue_or_rankings(api, headers, create_product):
    create_product(price="999.99", quantity_in_stock=10, reorder_level=10)
    create_product(price="99.99", quantity_in_stock=0, reorder_level=10)
    assert api("GET", "/api/dashboard/summary", headers=headers) == (200, {
        "total_products": 2, "total_categories": 1, "total_suppliers": 1,
        "total_units_in_stock": 10, "low_stock_count": 1, "out_of_stock_count": 1,
        "total_sales_count": 0, "total_revenue": "0.00",
    })
    for path in LIST_PATHS:
        assert api("GET", path, headers=headers) == (200, [])


def test_recent_sales_order_by_timestamp_and_return_only_report_fields(
    api, db_engine, headers, report_data, user_id,
):
    _, sales = report_data
    timestamps = [datetime(2026, 1, day, tzinfo=timezone.utc) for day in (3, 1, 2)]
    with Session(db_engine) as db:
        for sale, timestamp in zip(sales, timestamps):
            db.get(Sale, sale["id"]).created_at = timestamp
        db.commit()
    status_code, recent = api("GET", "/api/dashboard/recent-sales", headers=headers)
    assert status_code == 200
    assert [row["sale_id"] for row in recent] == [sales[i]["id"] for i in (0, 2, 1)]
    assert [row["total_amount"] for row in recent] == ["40.28", "19.99", "0.40"]
    assert [row["item_count"] for row in recent] == [2, 1, 1]
    assert [datetime.fromisoformat(row["created_at"]).day for row in recent] == [3, 2, 1]
    for row in recent:
        assert row["created_by_id"] == user_id
        assert set(row) == {"sale_id", "total_amount", "created_by_id", "created_at", "item_count"}


def test_recent_sales_have_stable_order_for_equal_timestamps(api, db_engine, headers, report_data):
    _, sales = report_data
    with Session(db_engine) as db:
        for sale in sales:
            db.get(Sale, sale["id"]).created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        db.commit()
    status_code, recent = api("GET", "/api/dashboard/recent-sales", headers=headers)
    assert status_code == 200
    assert [row["sale_id"] for row in recent] == [sale["id"] for sale in reversed(sales)]


@pytest.mark.parametrize("path", LIST_PATHS)
def test_report_limits_default_to_five_and_accept_one_to_fifty(
    api, headers, create_product, complete_sale, path,
):
    for _ in range(7):
        complete_sale((create_product(), 1))
    status_code, all_rows = api("GET", path + "?limit=50", headers=headers)
    assert status_code == 200 and len(all_rows) == 7
    assert api("GET", path, headers=headers) == (200, all_rows[:5])
    assert api("GET", path + "?limit=1", headers=headers) == (200, all_rows[:1])
    assert api("GET", path + "?limit=3", headers=headers) == (200, all_rows[:3])


@pytest.mark.parametrize("path", LIST_PATHS)
@pytest.mark.parametrize("limit", ["0", "-1", "51", "1.5", "invalid"])
def test_invalid_report_limits_are_rejected(api, headers, path, limit):
    assert api("GET", f"{path}?limit={limit}", headers=headers)[0] == 422


def test_top_products_rank_units_and_sum_historical_subtotals(api, headers, report_data):
    products, _ = report_data
    for product in products:
        assert api("PUT", f"/api/products/{product['id']}", {"price": "999.99"})[0] == 200
    assert api("GET", "/api/dashboard/top-products", headers=headers) == (200, [
        {
            "product_id": products[1]["id"], "name": products[1]["name"], "sku": products[1]["sku"],
            "units_sold": 7, "sales_revenue": "0.70",
        },
        {
            "product_id": products[0]["id"], "name": products[0]["name"], "sku": products[0]["sku"],
            "units_sold": 3, "sales_revenue": "59.97",
        },
    ])
    assert api("GET", "/api/dashboard/summary", headers=headers)[1]["total_revenue"] == "60.67"


def test_top_products_include_sales_at_different_historical_prices(
    api, headers, create_product, complete_sale,
):
    product = create_product(price="0.10")
    complete_sale((product, 3))
    assert api("PUT", f"/api/products/{product['id']}", {"price": "0.25"})[0] == 200
    complete_sale((product, 2))
    assert api("PUT", f"/api/products/{product['id']}", {"price": "100.00"})[0] == 200
    assert api("GET", "/api/dashboard/top-products", headers=headers) == (200, [{
        "product_id": product["id"], "name": product["name"], "sku": product["sku"],
        "units_sold": 5, "sales_revenue": "0.80",
    }])


def test_top_products_break_units_sold_ties_by_product_id(api, headers, create_product, complete_sale):
    first = create_product(price="0.10")
    second = create_product(price="999.99")
    complete_sale((second, 2))
    complete_sale((first, 2))
    status_code, products = api("GET", "/api/dashboard/top-products", headers=headers)
    assert status_code == 200
    assert [row["product_id"] for row in products] == [first["id"], second["id"]]


def test_sales_summary_totals_and_decimal_values(api, db_engine, headers, report_data):
    assert api("GET", "/api/dashboard/sales-summary", headers=headers) == (200, {
        "total_sales": 3, "total_revenue": "60.67",
        "average_sale_value": "20.22", "total_units_sold": 10,
    })
    with Session(db_engine) as db:
        service = DashboardService(db)
        assert service.summary().total_revenue == Decimal("60.67")
        summary = service.sales_summary()
        assert isinstance(summary.total_revenue, Decimal)
        assert isinstance(summary.average_sale_value, Decimal)
        assert summary.average_sale_value == Decimal("20.22")
        assert all(isinstance(row.total_amount, Decimal) for row in service.recent_sales(5))
        assert all(isinstance(row.sales_revenue, Decimal) for row in service.top_products(5))


def test_average_sale_value_rounds_half_up(api, headers, create_product, complete_sale):
    product = create_product(price="0.01")
    complete_sale((product, 2))
    complete_sale((product, 3))
    assert api("GET", "/api/dashboard/sales-summary", headers=headers) == (200, {
        "total_sales": 2, "total_revenue": "0.05",
        "average_sale_value": "0.03", "total_units_sold": 5,
    })


def test_zero_price_sales_still_count_sales_and_units(api, headers, create_product, complete_sale):
    product = create_product(price="0.00")
    complete_sale((product, 3))
    assert api("GET", "/api/dashboard/sales-summary", headers=headers) == (200, {
        "total_sales": 1, "total_revenue": "0.00",
        "average_sale_value": "0.00", "total_units_sold": 3,
    })
    assert api("GET", "/api/dashboard/top-products", headers=headers)[1][0]["sales_revenue"] == "0.00"


def test_inventory_summary_matches_alerts(api, headers, report_data):
    assert api("GET", "/api/dashboard/inventory-summary", headers=headers) == (200, {
        "total_products": 4, "total_units_in_stock": 22,
        "low_stock_count": 2, "out_of_stock_count": 1,
    })
    _, alerts = api("GET", "/api/alerts/summary", headers=headers)
    for path in ("/api/dashboard/inventory-summary", "/api/dashboard/summary"):
        _, summary = api("GET", path, headers=headers)
        assert {key: summary[key] for key in alerts} == alerts


def test_inventory_and_alert_counts_follow_stock_and_reorder_changes(api, headers, create_product):
    product = create_product(quantity_in_stock=5, reorder_level=2)
    for changes, stock, low_count, out_count in [
        ({}, 5, 0, 0),
        ({"reorder_level": 5}, 5, 1, 0),
        ({"quantity_in_stock": 0, "reorder_level": 0}, 0, 0, 1),
        ({"quantity_in_stock": 1}, 1, 0, 0),
    ]:
        assert api("PUT", f"/api/products/{product['id']}", changes)[0] == 200
        assert api("GET", "/api/dashboard/inventory-summary", headers=headers) == (200, {
            "total_products": 1, "total_units_in_stock": stock,
            "low_stock_count": low_count, "out_of_stock_count": out_count,
        })
        assert api("GET", "/api/alerts/summary", headers=headers) == (200, {
            "low_stock_count": low_count, "out_of_stock_count": out_count,
        })


@pytest.mark.parametrize("path", DASHBOARD_PATHS)
@pytest.mark.parametrize("role", list(Role))
def test_every_authenticated_role_can_view_dashboard(api, db_engine, user_id, headers, role, path):
    with Session(db_engine) as db:
        repository = UserRepository(db)
        repository.update(repository.get(user_id), {"role": role})
    assert api("GET", path, headers=headers)[0] == 200


@pytest.mark.parametrize("path", DASHBOARD_PATHS)
@pytest.mark.parametrize("authorization", [None, "Bearer invalid.token"])
def test_dashboard_requires_valid_authentication(api, path, authorization):
    headers = {} if authorization is None else {"Authorization": authorization}
    status_code, _, response_headers = api("GET", path, headers=headers, with_headers=True)
    assert status_code == 401
    assert response_headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("path", DASHBOARD_PATHS)
def test_expired_tokens_are_rejected(api, user_id, monkeypatch, path):
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", -1)
    headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
    assert api("GET", path, headers=headers)[0] == 401


def database_snapshot(db_engine):
    with db_engine.connect() as connection:
        return {
            table.name: connection.execute(select(table).order_by(*table.primary_key.columns)).all()
            for table in Base.metadata.sorted_tables
        }


def test_dashboard_reads_do_not_write_or_change_any_records(api, db_engine, headers, report_data):
    before = database_snapshot(db_engine)
    writes = []

    def capture(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")):
            writes.append(statement)

    event.listen(db_engine, "before_cursor_execute", capture)
    try:
        for _ in range(2):
            for path in DASHBOARD_PATHS:
                assert api("GET", path, headers=headers)[0] == 200
    finally:
        event.remove(db_engine, "before_cursor_execute", capture)
    assert writes == []
    assert database_snapshot(db_engine) == before


def test_failed_sale_does_not_affect_dashboard(api, headers, report_data):
    products, _ = report_data
    before = [api("GET", path, headers=headers) for path in DASHBOARD_PATHS]
    status_code, _ = api("POST", "/api/sales", {
        "items": [
            {"product_id": products[0]["id"], "quantity": 1},
            {"product_id": products[3]["id"], "quantity": 1},
        ],
    }, headers=headers)
    assert status_code == 409
    assert [api("GET", path, headers=headers) for path in DASHBOARD_PATHS] == before


@pytest.mark.parametrize("path", LIST_PATHS)
def test_listing_more_results_does_not_add_per_row_queries(
    api, db_engine, headers, create_product, complete_sale, path,
):
    for _ in range(6):
        complete_sale((create_product(), 1))
    queries = []

    def capture(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            queries.append(statement)

    event.listen(db_engine, "before_cursor_execute", capture)
    try:
        status_code, rows = api("GET", path + "?limit=1", headers=headers)
        assert status_code == 200 and len(rows) == 1
        single_count = len(queries)
        queries.clear()
        status_code, rows = api("GET", path + "?limit=50", headers=headers)
        assert status_code == 200 and len(rows) == 6
        assert 0 < len(queries) <= single_count
    finally:
        event.remove(db_engine, "before_cursor_execute", capture)


def test_swagger_dashboard_contract(api):
    status_code, document = api("GET", "/openapi.json")
    assert status_code == 200
    for path in DASHBOARD_PATHS:
        assert set(document["paths"][path]) == {"get"}
        operation = document["paths"][path]["get"]
        assert operation["security"] == [{"BearerAuth": []}]
        assert operation["tags"] == ["Dashboard"]
        if path in LIST_PATHS:
            limit = next(parameter for parameter in operation["parameters"] if parameter["name"] == "limit")
            assert limit["schema"]["minimum"] == 1
            assert limit["schema"]["maximum"] == 50
            assert limit["schema"]["default"] == 5
