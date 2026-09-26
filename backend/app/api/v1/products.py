from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

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
def list_products(params: Annotated[ProductListParams, Query()]):
    return sales.list_products(params)


@router.get("/products/{product_id}", response_model=ProductDetail)
def get_product(product_id: int, dates: Annotated[DateRange, Query()]):
    detail = sales.get_product_detail(product_id, dates)
    if detail is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return detail


@router.get("/products/{product_id}/neighbors", response_model=Neighbors)
def get_neighbors(product_id: int, params: Annotated[NeighborParams, Query()]):
    result = sales.get_neighbors(product_id, params)
    if result is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return result


@router.get("/categories", response_model=list[CategoryOut])
def list_categories():
    return sales.list_categories()
