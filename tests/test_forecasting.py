from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import numpy as np
import pandas as pd
import pytest
from pydantic import SecretStr
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.database import Base
from app.ml import forecasting as ml
from app.models import InventoryMovement, Product, Role, Sale, SaleItem, User
from app.repositories.forecasting import ForecastingRepository
from app.repositories.user import UserRepository
from app.security.passwords import hash_password
from app.security.tokens import create_access_token
from scripts import seed_forecasting_demo_data as demo

TODAY = date(2026, 9, 28)
SUFFIXES = ["", "/evaluation", "/reorder-insight"]
TEST_KEY = "forecast-test-only-signing-key-never-use-in-deployment-123456789"


class FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return cls(2026, 9, 28, 12, tzinfo=timezone.utc).astimezone(tz)


@pytest.fixture(autouse=True)
def forecast_config(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret_key", SecretStr(TEST_KEY))
    monkeypatch.setattr(settings, "jwt_algorithm", "HS256")
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", 60)
    monkeypatch.setattr(settings, "min_forecast_history_days", 30)
    monkeypatch.setattr(settings, "min_forecast_sales_days", 7)
    monkeypatch.setattr("app.services.forecasting.datetime", FrozenDatetime)
    monkeypatch.setattr(demo, "datetime", FrozenDatetime)


@pytest.fixture
def user_id(db_engine):
    with Session(db_engine) as db:
        return UserRepository(db).create({
            "first_name": "Test", "last_name": "Forecaster", "email": "forecaster@example.com",
            "password_hash": hash_password("Forecast test passphrase 123!"), "role": Role.EMPLOYEE,
        }).id


@pytest.fixture
def headers(user_id):
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.fixture
def product(api):
    _, category = api("POST", "/api/categories", {"name": "Forecast category"})
    _, supplier = api("POST", "/api/suppliers", {"name": "Forecast supplier"})
    status_code, product = api("POST", "/api/products", {
        "name": "Forecast product", "sku": "FORECAST-1", "price": "2.50",
        "quantity_in_stock": 20, "reorder_level": 10,
        "category_id": category["id"], "supplier_id": supplier["id"],
    })
    assert status_code == 201
    return product


@pytest.fixture
def seed_history(db_engine, user_id):
    def create(product, quantities, start=None):
        start = start or TODAY - timedelta(days=len(quantities))
        with Session(db_engine) as db:
            for offset, quantity in enumerate(quantities):
                if quantity == 0:
                    continue
                timestamp = datetime.combine(start + timedelta(days=offset), time(12), tzinfo=timezone.utc)
                subtotal = Decimal(product["price"]) * int(quantity)
                db.add(Sale(
                    created_by_id=user_id, total_amount=subtotal,
                    created_at=timestamp, updated_at=timestamp,
                    items=[SaleItem(
                        product_id=product["id"], quantity=int(quantity),
                        unit_price=Decimal(product["price"]), subtotal=subtotal,
                    )],
                ))
            db.commit()
    return create


@pytest.fixture
def history(product, seed_history):
    quantities = np.random.default_rng(42).poisson(8, 90).tolist()
    seed_history(product, quantities)
    return quantities


def path(product, suffix=""):
    return f"/api/forecasting/products/{product['id']}{suffix}"


def test_repository_aggregates_quantity_by_day_and_product_and_excludes_partial_days(
    api, db_engine, product, seed_history,
):
    start = TODAY - timedelta(days=4)
    seed_history(product, [2, 0, 4], start)
    seed_history(product, [3], start)
    seed_history(product, [999, 999], TODAY)
    status_code, other = api("POST", "/api/products", {
        "name": "Other product", "sku": "OTHER", "price": "1.00",
        "category_id": product["category_id"], "supplier_id": product["supplier_id"],
    })
    assert status_code == 201
    seed_history(other, [100], start)
    with Session(db_engine) as db:
        rows = ForecastingRepository(db).daily_demand(product["id"], TODAY - timedelta(days=1))
    assert [(str(row["date"]), row["quantity_sold"]) for row in rows] == [
        (str(start), 5), (str(start + timedelta(days=2)), 4),
    ]
    assert ml.daily_series(rows, TODAY - timedelta(days=1)).tolist() == [5, 0, 4, 0]


@pytest.mark.parametrize("suffix", SUFFIXES)
@pytest.mark.parametrize("days", [0, 2, 29])
def test_insufficient_history_returns_clear_error(api, headers, product, seed_history, days, suffix):
    seed_history(product, [4] * days)
    assert api("GET", path(product, suffix), headers=headers) == (422, {
        "detail": "Insufficient sales history for forecasting. At least 30 days of history are required.",
    })


def test_minimum_history_is_configurable(api, headers, product, seed_history, monkeypatch):
    seed_history(product, [4] * 30)
    monkeypatch.setattr(settings, "min_forecast_history_days", 35)
    status_code, result = api("GET", path(product), headers=headers)
    assert status_code == 422 and "At least 35 days" in result["detail"]


def test_few_sales_spread_over_months_do_not_bypass_minimum(api, headers, product, seed_history):
    values = [0] * 90
    values[0] = values[45] = values[-1] = 5
    seed_history(product, values)
    status_code, result = api("GET", path(product), headers=headers)
    assert status_code == 422 and "7 distinct days with sales" in result["detail"]


def test_evaluation_also_requires_sales_in_training_period(api, headers, product, seed_history):
    seed_history(product, [5] + [0] * 80 + [5] * 9)
    status_code, result = api("GET", path(product, "/evaluation"), headers=headers)
    assert status_code == 422 and "available training history" in result["detail"]


@pytest.mark.parametrize("horizon", [1, 7, 30])
def test_forecast_returns_requested_future_days(api, headers, product, history, horizon):
    status_code, result = api("GET", path(product) + f"?horizon_days={horizon}", headers=headers)
    assert status_code == 200
    assert result["product_id"] == product["id"] and result["product_name"] == product["name"]
    assert result["history_days"] == 90 and result["model"] == "RandomForestRegressor"
    assert result["history_end"] == str(TODAY - timedelta(days=1))
    assert result["history_start"] == str(TODAY - timedelta(days=90))
    assert [day["date"] for day in result["forecast"]] == [
        str(TODAY + timedelta(days=day)) for day in range(1, horizon + 1)
    ]
    assert all(day["predicted_demand"] >= 0 for day in result["forecast"])


def test_forecast_is_deterministic_and_ignores_current_stock_and_partial_day_sales(
    api, headers, product, history, seed_history,
):
    before = api("GET", path(product), headers=headers)
    assert before[0] == 200 and len(before[1]["forecast"]) == 7
    assert api("PUT", f"/api/products/{product['id']}", {"quantity_in_stock": 500, "price": "100.00"})[0] == 200
    seed_history(product, [1000], TODAY)
    assert api("GET", path(product), headers=headers) == before


def test_evaluation_returns_separate_metrics_and_chronological_periods(api, headers, product, history):
    status_code, result = api("GET", path(product, "/evaluation"), headers=headers)
    assert status_code == 200 and result["history_days"] == 90
    assert result["model_name"] == "RandomForestRegressor"
    assert result["baseline_name"] == "7-day moving average"
    assert result["training_period"]["days"] == 60
    assert result["testing_period"]["days"] == 16
    assert result["training_period"]["end_date"] < result["testing_period"]["start_date"]
    assert result["evaluation_method"] == "recursive_holdout"
    assert result["mape_policy"] == "exclude_zero_actuals"
    for key in ("model_metrics", "baseline_metrics"):
        metrics = result[key]
        assert metrics["mae"] >= 0 and metrics["rmse"] >= metrics["mae"]
        assert metrics["mape"] is None or metrics["mape"] >= 0
        assert metrics["mape_nonzero_days"] + metrics["mape_zero_days_excluded"] == 16
    assert result["comparison"]["mae_difference"] == pytest.approx(
        result["model_metrics"]["mae"] - result["baseline_metrics"]["mae"],
    )


def test_evaluation_serializes_all_zero_holdout_mape_as_null(api, headers, product, seed_history):
    seed_history(product, [5] * 60 + [0] * 30)
    status_code, result = api("GET", path(product, "/evaluation"), headers=headers)
    assert status_code == 200
    for key in ("model_metrics", "baseline_metrics"):
        assert result[key]["mape"] is None
        assert result[key]["mape_zero_days_excluded"] == 16


@pytest.mark.parametrize("stock, expected_projected, expected_reorder", [(20, 14, False), (16, 10, True), (1, -5, True)])
def test_reorder_insight_uses_forecast_total_and_inclusive_threshold(
    api, headers, product, history, monkeypatch, stock, expected_projected, expected_reorder,
):
    def constant_forecast(history, horizon_days):
        return pd.Series(2.0, index=pd.date_range(history.index[-1] + pd.Timedelta(days=1), periods=horizon_days))

    monkeypatch.setattr(ml, "forecast", constant_forecast)
    assert api("PUT", f"/api/products/{product['id']}", {"quantity_in_stock": stock})[0] == 200
    assert api("GET", path(product, "/reorder-insight") + "?horizon_days=3", headers=headers) == (200, {
        "product_id": product["id"], "current_stock": stock, "reorder_level": 10,
        "forecast_horizon_days": 3, "forecast_start": str(TODAY + timedelta(days=1)),
        "forecast_end": str(TODAY + timedelta(days=3)), "predicted_total_demand": 6.0,
        "projected_stock_after_forecast": expected_projected, "reorder_recommended": expected_reorder,
    })


@pytest.mark.parametrize("suffix", ["", "/reorder-insight"])
@pytest.mark.parametrize("horizon", ["0", "-1", "31", "1.5", "invalid"])
def test_invalid_horizons_are_rejected(api, headers, product, suffix, horizon):
    assert api("GET", path(product, suffix) + f"?horizon_days={horizon}", headers=headers)[0] == 422


@pytest.mark.parametrize("suffix", SUFFIXES)
def test_missing_product_is_not_found(api, headers, suffix):
    assert api("GET", f"/api/forecasting/products/999999{suffix}", headers=headers) == (
        404, {"detail": "Product not found"},
    )


@pytest.mark.parametrize("suffix", SUFFIXES)
@pytest.mark.parametrize("authorization", [None, "Bearer invalid.token"])
def test_forecasting_requires_valid_authentication(api, suffix, authorization):
    headers = {} if authorization is None else {"Authorization": authorization}
    status_code, _, response_headers = api(
        "GET", f"/api/forecasting/products/1{suffix}", headers=headers, with_headers=True,
    )
    assert status_code == 401 and response_headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("suffix", SUFFIXES)
def test_expired_token_is_rejected(api, user_id, monkeypatch, suffix):
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", -1)
    headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
    assert api("GET", f"/api/forecasting/products/1{suffix}", headers=headers)[0] == 401


@pytest.mark.parametrize("suffix", SUFFIXES)
@pytest.mark.parametrize("role", list(Role))
def test_all_authenticated_roles_can_forecast(api, db_engine, headers, user_id, product, history, role, suffix):
    with Session(db_engine) as db:
        db.get(User, user_id).role = role
        db.commit()
    assert api("GET", path(product, suffix), headers=headers)[0] == 200


def snapshot(db_engine):
    with db_engine.connect() as connection:
        return {
            table.name: connection.execute(select(table).order_by(*table.primary_key.columns)).all()
            for table in Base.metadata.sorted_tables
        }


def test_forecasting_endpoints_never_write_or_change_records(api, db_engine, headers, product, history):
    before = snapshot(db_engine)
    writes = []

    def capture(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")):
            writes.append(statement)

    event.listen(db_engine, "before_cursor_execute", capture)
    try:
        for suffix in SUFFIXES:
            assert api("GET", path(product, suffix), headers=headers)[0] == 200
    finally:
        event.remove(db_engine, "before_cursor_execute", capture)
    assert writes == [] and snapshot(db_engine) == before


def test_demo_seed_labels_data_preserves_existing_stock_and_is_usable_for_forecasting(
    api, db_engine, headers, user_id, product,
):
    with Session(db_engine) as db:
        result = demo.seed_demo_data(db, user_id=user_id)
        simulated = db.get(Product, result["product_id"])
        assert simulated.sku == demo.DEMO_SKU and demo.DEMO_MARKER in simulated.description
        assert simulated.name.startswith("[DEMO]") and simulated.quantity_in_stock == 100
        assert db.get(Product, product["id"]).quantity_in_stock == product["quantity_in_stock"]
        assert db.scalar(select(func.count()).select_from(InventoryMovement)) == 0
        sales = list(db.scalars(select(Sale)))
        assert len(sales) == result["sales_created"]
        assert all(sale.created_at.date() < TODAY for sale in sales)
        assert all(sale.created_by_id == user_id for sale in sales)
        assert db.scalar(select(func.sum(SaleItem.quantity))) == result["units_sold"]
        assert db.scalar(select(func.sum(Sale.total_amount))) == Decimal("9.99") * result["units_sold"]
    assert api("GET", f"/api/forecasting/products/{result['product_id']}/evaluation", headers=headers)[0] == 200
    before = snapshot(db_engine)
    with Session(db_engine) as db, pytest.raises(ValueError, match="already exists"):
        demo.seed_demo_data(db, user_id=user_id)
    assert snapshot(db_engine) == before


def test_demo_seed_refuses_real_products_without_modifying_data(db_engine, user_id, product):
    before = snapshot(db_engine)
    with Session(db_engine) as db, pytest.raises(ValueError, match="labeled DEMO"):
        demo.seed_demo_data(db, user_id=user_id, product_id=product["id"])
    assert snapshot(db_engine) == before


def test_demo_seed_accepts_selected_demo_product_once_and_preserves_its_stock(db_engine, user_id, product):
    with Session(db_engine) as db:
        stored = db.get(Product, product["id"])
        stored.sku = "DEMO-SELECTED"
        stored.description = demo.DEMO_MARKER
        db.commit()
        demo.seed_demo_data(db, user_id=user_id, product_id=product["id"])
        assert db.get(Product, product["id"]).quantity_in_stock == product["quantity_in_stock"]
    before = snapshot(db_engine)
    with Session(db_engine) as db, pytest.raises(ValueError, match="already has sales"):
        demo.seed_demo_data(db, user_id=user_id, product_id=product["id"])
    assert snapshot(db_engine) == before


@pytest.mark.parametrize("overrides", [{"days": 89}, {"days": 181}, {"end_date": TODAY}, {"seed": -1}, {"user_id": 99999}])
def test_invalid_demo_parameters_do_not_write(db_engine, user_id, overrides):
    before = snapshot(db_engine)
    with Session(db_engine) as db, pytest.raises(ValueError):
        demo.seed_demo_data(db, **{"user_id": user_id, **overrides})
    assert snapshot(db_engine) == before


def test_demo_generation_is_reproducible():
    first = demo.simulated_demand(120, TODAY - timedelta(days=1), 42)
    assert first == demo.simulated_demand(120, TODAY - timedelta(days=1), 42)
    assert first != demo.simulated_demand(120, TODAY - timedelta(days=1), 43)
    assert len(first) == 120 and len({quantity for _, quantity in first}) > 5


def test_demo_script_requires_manual_confirmation_before_connecting(monkeypatch):
    monkeypatch.setattr("sys.argv", ["seed_forecasting_demo_data", "--user-id", "1"])

    def forbidden_connection():
        pytest.fail("No database connection is allowed without manual confirmation")

    monkeypatch.setattr(demo, "SessionLocal", forbidden_connection)
    with pytest.raises(SystemExit) as exc:
        demo.main()
    assert exc.value.code == 2


def test_demo_seed_rolls_back_all_inserts_on_failure(db_engine, user_id, monkeypatch):
    before = snapshot(db_engine)
    with Session(db_engine) as db:
        original_flush = db.flush

        def fail_sales_flush(*args, **kwargs):
            if any(isinstance(item, Sale) for item in db.new):
                raise RuntimeError("Simulated write failure")
            return original_flush(*args, **kwargs)

        monkeypatch.setattr(db, "flush", fail_sales_flush)
        with pytest.raises(RuntimeError, match="Simulated write failure"):
            demo.seed_demo_data(db, user_id=user_id)
    assert snapshot(db_engine) == before


def test_swagger_forecasting_contract(api):
    _, document = api("GET", "/openapi.json")
    for suffix in SUFFIXES:
        operation = document["paths"][f"/api/forecasting/products/{{product_id}}{suffix}"]["get"]
        assert operation["tags"] == ["Forecasting"]
        assert operation["security"] == [{"BearerAuth": []}]
        if suffix != "/evaluation":
            horizon = next(item for item in operation["parameters"] if item["name"] == "horizon_days")
            assert horizon["schema"]["minimum"] == 1
            assert horizon["schema"]["maximum"] == 30
            assert horizon["schema"]["default"] == 7
