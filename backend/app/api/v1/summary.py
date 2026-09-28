from typing import Annotated

from fastapi import APIRouter, Query

from app.db import DbDep
from app.schemas import DateRange, SalesRange, Summary, WeeklyParams, WeeklySales
from app.services import sales

router = APIRouter(tags=["summary"])


@router.get("/summary", response_model=Summary)
def get_summary(db: DbDep, dates: Annotated[DateRange, Query()]):
    return sales.get_summary(db, dates)


@router.get("/sales/products", response_model=SalesRange)
def get_product_sales(db: DbDep, dates: Annotated[DateRange, Query()]):
    """Every product's paid orders, units and gross revenue in the range."""
    return sales.get_product_sales(db, dates)


@router.get("/sales/weekly", response_model=WeeklySales)
def get_weekly_sales(db: DbDep, params: Annotated[WeeklyParams, Query()]):
    """Every product's sales per 7-day week, the last week ending at `end`."""
    return sales.get_weekly_sales(db, params)
