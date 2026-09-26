from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

MAX_RANGE_DAYS = 366


# --- Query parameters ---


class DateRange(BaseModel):
    start: date | None = None
    end: date | None = None

    @model_validator(mode="after")
    def check_range(self):
        if self.start and self.end:
            if self.start > self.end:
                raise ValueError("start must be on or before end")
            if (self.end - self.start).days > MAX_RANGE_DAYS:
                raise ValueError(f"date range must be at most {MAX_RANGE_DAYS} days")
        return self


class NetworkFilters(DateRange):
    category_id: int | None = None
    min_co_orders: int = Field(5, ge=1)
    min_lift: float = Field(1.0, ge=0)
    max_edges: int = Field(500, ge=1, le=5000)


class CentralityParams(NetworkFilters):
    metric: Literal["degree", "strength", "betweenness"] = "strength"
    limit: int = Field(20, ge=1, le=200)


class NeighborParams(DateRange):
    min_co_orders: int = Field(1, ge=1)
    top_k: int = Field(10, ge=1, le=100)
    sort: Literal["lift", "co_orders", "confidence"] = "lift"


class ProductListParams(BaseModel):
    search: str | None = None
    category_id: int | None = None
    limit: int = Field(50, ge=1, le=200)
    cursor: int | None = Field(None, description="Last product id of the previous page")


# --- Responses ---


class NetworkMeta(BaseModel):
    start: date
    end: date
    total_orders: int
    node_count: int
    edge_count: int
    truncated: bool


class Node(BaseModel):
    id: int
    label: str
    category: str
    orders: int
    revenue: float
    degree: int
    strength: int = Field(description="Total co-orders across all of the node's edges")
    community: int


class Edge(BaseModel):
    source: int
    target: int
    co_orders: int
    support: float
    conf_source_to_target: float
    conf_target_to_source: float
    lift: float


class Network(BaseModel):
    meta: NetworkMeta
    nodes: list[Node]
    edges: list[Edge]


class ProductRef(BaseModel):
    id: int
    name: str


class Community(BaseModel):
    community: int
    size: int
    revenue: float
    top_products: list[ProductRef]


class CentralityItem(BaseModel):
    id: int
    name: str
    score: float


class Centrality(BaseModel):
    metric: str
    items: list[CentralityItem]


class ProductOut(BaseModel):
    id: int
    sku: str
    name: str
    category_id: int
    category: str
    price: float


class ProductPage(BaseModel):
    items: list[ProductOut]
    next_cursor: int | None


class ProductDetail(ProductOut):
    start: date
    end: date
    orders: int
    qty: int
    revenue: float


class Neighbor(BaseModel):
    id: int
    name: str
    category: str
    co_orders: int
    support: float
    confidence: float = Field(
        description="Share of this product's orders that also contain the neighbor"
    )
    lift: float


class Neighbors(BaseModel):
    product: ProductOut
    start: date
    end: date
    neighbors: list[Neighbor]


class CategoryOut(BaseModel):
    id: int
    name: str
    parent_id: int | None


class TopProduct(BaseModel):
    id: int
    name: str
    orders: int
    revenue: float


class DailyPoint(BaseModel):
    day: date
    orders: int
    revenue: float


class Summary(BaseModel):
    start: date
    end: date
    total_orders: int
    total_revenue: float
    avg_basket_size: float
    top_products: list[TopProduct]
    daily: list[DailyPoint]
