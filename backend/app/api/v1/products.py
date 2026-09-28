from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.db import DbDep
from app.schemas import (
    CategoryOut,
    DateRange,
    NeighborParams,
    Neighbors,
    ProductDetail,
    ProductListParams,
    ProductPage,
)
from app.services import sales

router = APIRouter(tags=["products"])


@router.get("/products", response_model=ProductPage)
def list_products(db: DbDep, params: Annotated[ProductListParams, Query()]):
    return sales.list_products(db, params)


@router.get("/products/{sku}", response_model=ProductDetail)
def get_product(db: DbDep, sku: str, dates: Annotated[DateRange, Query()]):
    detail = sales.get_product_detail(db, sku, dates)
    if detail is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return detail


@router.get("/products/{sku}/neighbors", response_model=Neighbors)
def get_neighbors(db: DbDep, sku: str, params: Annotated[NeighborParams, Query()]):
    result = sales.get_neighbors(db, sku, params)
    if result is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return result


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DbDep):
    return sales.list_categories(db)
