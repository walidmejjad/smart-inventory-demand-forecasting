from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    InventorySummaryResponse,
    RecentSaleResponse,
    SalesSummaryResponse,
    TopProductResponse,
)
from app.security.dependencies import require_authenticated_user
from app.services.dashboard import DashboardService

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(require_authenticated_user)],
)
DatabaseSession = Annotated[Session, Depends(get_db)]
ReportLimit = Annotated[int, Query(ge=1, le=50)]


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: DatabaseSession) -> DashboardSummaryResponse:
    """Summarize current inventory, catalog counts, and all completed sales."""
    return DashboardService(db).summary()


@router.get("/recent-sales", response_model=list[RecentSaleResponse])
def list_recent_sales(db: DatabaseSession, limit: ReportLimit = 5) -> list[RecentSaleResponse]:
    """List newest sales first; equal timestamps are ordered by sale ID descending."""
    return DashboardService(db).recent_sales(limit)


@router.get("/top-products", response_model=list[TopProductResponse])
def list_top_products(db: DatabaseSession, limit: ReportLimit = 5) -> list[TopProductResponse]:
    """Rank products by units sold, then product ID, using historical item revenue."""
    return DashboardService(db).top_products(limit)


@router.get("/sales-summary", response_model=SalesSummaryResponse)
def get_sales_summary(db: DatabaseSession) -> SalesSummaryResponse:
    """Summarize all completed sales, with monetary values serialized as decimal strings."""
    return DashboardService(db).sales_summary()


@router.get("/inventory-summary", response_model=InventorySummaryResponse)
def get_inventory_summary(db: DatabaseSession) -> InventorySummaryResponse:
    """Summarize current stock using the same separate status counts as Alerts."""
    return DashboardService(db).inventory_summary()
