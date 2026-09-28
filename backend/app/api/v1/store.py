from typing import Annotated

from fastapi import APIRouter, Query

from app.db import DbDep
from app.schemas import DateRange, SegmentOut, StoreInfo
from app.services import sales

router = APIRouter(tags=["store"])


@router.get("/store", response_model=StoreInfo)
def get_store(db: DbDep):
    """The store (tenant) and how far its data goes."""
    return sales.get_store(db)


@router.get("/segments", response_model=list[SegmentOut])
def list_segments(db: DbDep, dates: Annotated[DateRange, Query()]):
    """RFM segments with their share of paid orders in the range."""
    return sales.list_segments(db, dates)
