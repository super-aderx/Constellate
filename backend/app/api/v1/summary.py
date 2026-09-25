from typing import Annotated

from fastapi import APIRouter, Query

from app.schemas import DateRange, Summary
from app.services import sales

router = APIRouter(tags=["summary"])


@router.get("/summary", response_model=Summary)
def get_summary(dates: Annotated[DateRange, Query()]):
    return sales.get_summary(dates)
