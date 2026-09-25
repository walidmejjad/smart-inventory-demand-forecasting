from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.repositories.category import CategoryRepository
from app.schemas.product import ProductCreate


def product_payload(api, sku="TEST-001"):
    category_status, category = api("POST", "/api/categories", {"name": "Test category"})
    supplier_status, supplier = api("POST", "/api/suppliers", {"name": "Test supplier"})
    assert category_status == supplier_status == 201
    return {
        "name": "Test product",
        "sku": sku,
        "description": "Test description",
        "price": "19.99",
        "category_id": category["id"],
        "supplier_id": supplier["id"],
    }


@pytest.mark.parametrize("resource", ["categories", "suppliers", "products"])
def test_crud_lifecycle(api, resource):
    payload = (
        product_payload(api)
        if resource == "products"
        else {"name": "Original", **({"description": "Details"} if resource == "categories" else {"email": "test@example.invalid"})}
    )
    root = f"/api/{resource}"
    assert api("GET", root) == (200, [])
    status_code, created = api("POST", root, payload)
    assert status_code == 201
    assert created["created_at"] and created["updated_at"]
    assert "products" not in created and "category" not in created and "supplier" not in created
    if resource == "products":
        assert created["price"] == "19.99"
        assert created["quantity_in_stock"] == created["reorder_level"] == 0
    item_url = f"{root}/{created['id']}"
    assert api("GET", item_url) == (200, created)
    assert api("GET", root) == (200, [created])
    status_code, updated = api("PUT", item_url, {"name": "Updated"})
    assert status_code == 200 and updated["name"] == "Updated"
    assert updated["created_at"] == created["created_at"]
    for key in payload.keys() - {"name"}:
        assert updated[key] == created[key]
    nullable_field = "email" if resource == "suppliers" else "description"
    status_code, cleared = api("PUT", item_url, {nullable_field: None})
    assert status_code == 200 and cleared[nullable_field] is None
    assert api("PUT", item_url, {}) == (200, cleared)
    assert api("DELETE", item_url) == (204, None)
    assert api("GET", item_url)[0] == 404
    assert api("GET", root) == (200, [])


@pytest.mark.parametrize("resource", ["categories", "suppliers", "products"])
@pytest.mark.parametrize("method", ["GET", "PUT", "DELETE"])
def test_missing_resources(api, resource, method):
    body = {"name": "Updated"} if method == "PUT" else None
    assert api(method, f"/api/{resource}/999999", body)[0] == 404


@pytest.mark.parametrize(
    "resource, unique_field",
    [("categories", "name"), ("products", "sku")],
)
def test_duplicate_unique_values_on_create_and_update(api, resource, unique_field):
    root = f"/api/{resource}"
    payload = product_payload(api) if resource == "products" else {"name": "Original"}
    status_code, first = api("POST", root, payload)
    assert status_code == 201
    assert api("POST", root, payload)[0] == 409
    second_payload = {**payload, unique_field: "SECOND"}
    status_code, second = api("POST", root, second_payload)
    assert status_code == 201
    assert api("PUT", f"{root}/{second['id']}", {unique_field: payload[unique_field]})[0] == 409
    assert api("GET", f"{root}/{second['id']}")[1][unique_field] == "SECOND"
    assert api("PUT", f"{root}/{first['id']}", {unique_field: payload[unique_field]})[0] == 200


@pytest.mark.parametrize("reference", ["category_id", "supplier_id"])
def test_product_requires_existing_references(api, reference):
    payload = product_payload(api)
    assert api("POST", "/api/products", {**payload, reference: 999999})[0] == 404
    status_code, product = api("POST", "/api/products", payload)
    assert status_code == 201
    url = f"/api/products/{product['id']}"
    assert api("PUT", url, {reference: 999999})[0] == 404
    assert api("GET", url)[1][reference] == payload[reference]


def test_product_can_change_both_references(api):
    payload = product_payload(api)
    _, product = api("POST", "/api/products", payload)
    _, category = api("POST", "/api/categories", {"name": "Other category"})
    _, supplier = api("POST", "/api/suppliers", {"name": "Other supplier"})
    status_code, updated = api(
        "PUT",
        f"/api/products/{product['id']}",
        {"category_id": category["id"], "supplier_id": supplier["id"], "price": "0.10"},
    )
    assert status_code == 200
    assert updated["category_id"] == category["id"]
    assert updated["supplier_id"] == supplier["id"]
    assert updated["price"] == "0.10"


def test_referenced_parents_cannot_be_deleted(api):
    payload = product_payload(api)
    _, product = api("POST", "/api/products", payload)
    for resource, field in [("categories", "category_id"), ("suppliers", "supplier_id")]:
        url = f"/api/{resource}/{payload[field]}"
        assert api("DELETE", url)[0] == 409
        assert api("GET", url)[0] == 200
    assert api("DELETE", f"/api/products/{product['id']}")[0] == 204
    for resource, field in [("categories", "category_id"), ("suppliers", "supplier_id")]:
        assert api("DELETE", f"/api/{resource}/{payload[field]}")[0] == 204


@pytest.mark.parametrize(
    "field, value",
    [
        ("name", " "),
        ("sku", ""),
        ("price", "-0.01"),
        ("price", "1.001"),
        ("price", "10000000000.00"),
        ("price", "NaN"),
        ("price", "Infinity"),
        ("price", None),
        ("quantity_in_stock", -1),
        ("quantity_in_stock", 1.5),
        ("quantity_in_stock", True),
        ("reorder_level", -1),
        ("category_id", 0),
        ("supplier_id", None),
        ("id", 123),
    ],
)
def test_product_input_validation(api, field, value):
    payload = product_payload(api)
    assert api("POST", "/api/products", {**payload, field: value})[0] == 422
    _, product = api("POST", "/api/products", payload)
    assert api("PUT", f"/api/products/{product['id']}", {field: value})[0] == 422


@pytest.mark.parametrize("resource", ["categories", "suppliers"])
def test_names_are_required_and_optional_nulls_are_supported(api, resource):
    root = f"/api/{resource}"
    assert api("POST", root, {})[0] == 422
    assert api("POST", root, {"name": " "})[0] == 422
    _, item = api("POST", root, {"name": " Trimmed "})
    assert item["name"] == "Trimmed"
    assert api("PUT", f"{root}/{item['id']}", {"name": None})[0] == 422
    assert api("POST", root, {"name": "Other", "unknown": "value"})[0] == 422


@pytest.mark.parametrize("resource", ["categories", "suppliers", "products"])
def test_list_pagination_and_path_validation(api, resource):
    payload = product_payload(api) if resource == "products" else {"name": "First"}
    root = f"/api/{resource}"
    _, first = api("POST", root, payload)
    _, second = api("POST", root, {**payload, "name": "Second", **({"sku": "SECOND"} if resource == "products" else {})})
    assert api("GET", f"{root}?limit=1") == (200, [first])
    assert api("GET", f"{root}?offset=1&limit=1") == (200, [second])
    for suffix in ("?offset=-1", "?limit=0", "?limit=101", "/0", "/not-an-id"):
        assert api("GET", root + suffix)[0] == 422


def test_database_conflict_fallback_and_rollback(api, db_engine, monkeypatch):
    _, first = api("POST", "/api/categories", {"name": "Existing"})
    # Simulate a concurrent insert that defeats the service's duplicate precheck.
    monkeypatch.setattr(CategoryRepository, "get_by_name", lambda self, name: None)
    assert api("POST", "/api/categories", {"name": "Existing"}) == (
        409, {"detail": "Operation conflicts with existing data"}
    )
    with Session(db_engine) as session:
        repository = CategoryRepository(session)
        with pytest.raises(IntegrityError):
            repository.create({"name": "Existing"})
        assert repository.create({"name": "After rollback"}).id != first["id"]
    assert api("POST", "/api/categories", {"name": "Later request"})[0] == 201


def test_database_errors_do_not_expose_internal_details(api, monkeypatch):
    def unavailable(self, resource_id):
        raise OperationalError("private statement", {"private": "test"}, Exception("private detail"))

    monkeypatch.setattr(CategoryRepository, "get", unavailable)
    assert api("GET", "/api/categories/1") == (
        503, {"detail": "Database connection unavailable"}
    )


def test_price_schema_uses_decimal():
    data = ProductCreate(
        name="Test", sku="TEST", price="0.10", category_id=1, supplier_id=1
    )
    assert isinstance(data.price, Decimal)
    assert data.price == Decimal("0.10")


def test_swagger_has_all_crud_operations_and_response_schemas(api):
    status_code, document = api("GET", "/openapi.json")
    assert status_code == 200
    for resource in ("categories", "suppliers", "products"):
        root = f"/api/{resource}"
        assert set(document["paths"][root]) == {"post", "get"}
        assert set(document["paths"][root + "/{id}"]) == {"get", "put", "delete"}
        schema = document["paths"][root]["post"]["responses"]["201"]["content"]["application/json"]["schema"]
        assert schema["$ref"].endswith("Response")
    assert api("GET", "/api/health") == (200, {"status": "ok"})
    assert api("GET", "/api/health/db") == (200, {"status": "ok", "database": "connected"})
