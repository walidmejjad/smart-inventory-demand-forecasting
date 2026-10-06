from datetime import datetime, timezone
from pathlib import Path
from runpy import run_path

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, select

from app.database.database import Base
from app.models import Category


def test_sales_migration_round_trip_preserves_existing_tables_and_data():
    versions = Path(__file__).resolve().parents[1] / "alembic" / "versions"
    previous = run_path(str(versions / "abfe3b007fb4_create_core_inventory_tables.py"))
    migration = run_path(str(versions / "d0a975d4f7aa_create_sales_and_inventory_movements.py"))
    assert migration["down_revision"] == previous["revision"]

    # Exercise upgrade/downgrade only in a disposable in-memory database.
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            context = MigrationContext.configure(connection, opts={"compare_type": True})
            with Operations.context(context):
                previous["upgrade"]()
                # The existing PostgreSQL migration uses a literal now() default;
                # supply timestamps explicitly when seeding its tables in SQLite.
                now = datetime.now(timezone.utc)
                connection.execute(Category.__table__.insert().values(
                    name="Existing category", created_at=now, updated_at=now,
                ))
                original_tables = set(inspect(connection).get_table_names())

                migration["upgrade"]()
                assert set(inspect(connection).get_table_names()) == original_tables | {
                    "sales", "sale_items", "inventory_movements",
                }
                assert compare_metadata(context, Base.metadata) == []

                migration["downgrade"]()
                assert set(inspect(connection).get_table_names()) == original_tables
                assert connection.scalar(select(Category.name)) == "Existing category"

                migration["upgrade"]()
                assert compare_metadata(context, Base.metadata) == []
                assert connection.scalar(select(Category.name)) == "Existing category"
    finally:
        engine.dispose()
