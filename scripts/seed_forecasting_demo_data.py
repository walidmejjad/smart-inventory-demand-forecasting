"""Create explicitly simulated historical sales in a development database only."""

import argparse
import sys
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import numpy as np
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models import Category, Product, Sale, SaleItem, Supplier, User

DEMO_MARKER = "SIMULATED FORECASTING DEMO DATA"
DEMO_SKU = "DEMO-FORECAST-001"


def simulated_demand(days: int, end_date: date, seed: int) -> list[tuple[date, int]]:
    rng = np.random.default_rng(seed)
    start = end_date - timedelta(days=days - 1)
    weekday_effect = [1.15, 1.0, 1.0, 1.1, 1.35, 0.75, 0.5]
    result = []
    for index in range(days):
        day = start + timedelta(days=index)
        mean = 8 * weekday_effect[day.weekday()] * (1 + 0.0015 * index)
        result.append((day, int(rng.poisson(mean))))
    return result


def seed_demo_data(
    db: Session, *, user_id: int, days: int = 120, seed: int = 42,
    product_id: int | None = None, end_date: date | None = None,
) -> dict[str, int]:
    if not 90 <= days <= 180:
        raise ValueError("Demo history must contain between 90 and 180 days")
    if seed < 0:
        raise ValueError("Random seed must be nonnegative")
    today = datetime.now(timezone.utc).date()
    end_date = end_date or today - timedelta(days=1)
    if end_date >= today:
        raise ValueError("Demo history must end before today UTC")
    quantities = simulated_demand(days, end_date, seed)
    with db.begin():
        if db.get(User, user_id) is None:
            raise ValueError("The selected user does not exist; supply an existing --user-id")
        if product_id is None:
            if db.scalar(select(Product.id).where(Product.sku == DEMO_SKU)) is not None:
                raise ValueError("The default DEMO product already exists; no records were added")
            category = db.scalar(select(Category).where(Category.name == "[DEMO] Forecasting"))
            supplier = db.scalar(select(Supplier).where(Supplier.name == "[DEMO] Forecasting"))
            if category is None:
                category = Category(name="[DEMO] Forecasting", description=DEMO_MARKER)
                db.add(category)
            if supplier is None:
                supplier = Supplier(name="[DEMO] Forecasting")
                db.add(supplier)
            product = Product(
                name="[DEMO] Simulated forecasting product", sku=DEMO_SKU,
                description=DEMO_MARKER, price=Decimal("9.99"),
                quantity_in_stock=100, reorder_level=20, category=category, supplier=supplier,
            )
            db.add(product)
            db.flush()
        else:
            product = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
            if product is None:
                raise ValueError("The selected product does not exist")
            if not product.sku.startswith("DEMO-") or DEMO_MARKER not in (product.description or ""):
                raise ValueError("Only explicitly labeled DEMO products may receive simulated sales")
            if db.scalar(select(SaleItem.id).where(SaleItem.product_id == product.id).limit(1)) is not None:
                raise ValueError("The selected DEMO product already has sales; no records were added")

        sale_count = 0
        for day, quantity in quantities:
            if quantity == 0:
                continue
            timestamp = datetime.combine(day, time(hour=12), tzinfo=timezone.utc)
            subtotal = product.price * quantity
            db.add(Sale(
                created_by_id=user_id, total_amount=subtotal,
                created_at=timestamp, updated_at=timestamp,
                items=[SaleItem(
                    product_id=product.id, quantity=quantity,
                    unit_price=product.price, subtotal=subtotal,
                )],
            ))
            sale_count += 1
        result = {
            "product_id": product.id, "history_days": days, "sales_created": sale_count,
            "units_sold": sum(quantity for _, quantity in quantities),
        }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=(
        "Generate SIMULATED forecasting sales in the configured DEVELOPMENT database. "
        "These sales affect dashboard totals; current stock and movements are not changed."
    ))
    parser.add_argument("--user-id", type=int, required=True, help="Existing user to reference as sale creator")
    parser.add_argument("--product-id", type=int, help="Existing, explicitly labeled DEMO product with no sales")
    parser.add_argument("--days", type=int, default=120, help="Calendar days to simulate (90-180)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--confirm-demo", action="store_true", help="Confirm simulated writes to the configured DB")
    args = parser.parse_args()
    if not args.confirm_demo:
        parser.error("Manual invocation requires --confirm-demo; use a development database")
    try:
        with SessionLocal() as db:
            result = seed_demo_data(
                db, user_id=args.user_id, product_id=args.product_id, days=args.days, seed=args.seed,
            )
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except SQLAlchemyError:
        print("Database operation failed; no demo data was committed.", file=sys.stderr)
        return 1
    print(f"{DEMO_MARKER}: {result}")
    print("Historical sales affect reports. Existing stock and inventory movements were not changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
