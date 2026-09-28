from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

MAX_RANGE_DAYS = 366


# --- Query parameters ---


class DateRange(BaseModel):
    start: date | None = None
    end: date | None = None
    segment: str = Field(
        "all",
        description="RFM segment id (see /segments), or 'all' for every customer",
    )

    @model_validator(mode="after")
    def check_range(self):
        if self.start and self.end:
            if self.start > self.end:
                raise ValueError("start must be on or before end")
            if (self.end - self.start).days > MAX_RANGE_DAYS:
                raise ValueError(f"date range must be at most {MAX_RANGE_DAYS} days")
        return self


class NetworkFilters(DateRange):
    category_id: UUID | None = Field(
        None,
        description="Only pairs whose products are both in this category or under it",
    )
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
    category_id: UUID | None = None
    limit: int = Field(50, ge=1, le=200)
    cursor: str | None = Field(None, description="Last SKU of the previous page")


class WeeklyParams(BaseModel):
    weeks: int = Field(12, ge=1, le=53)
    end: date | None = Field(
        None, description="Last day of the last week; default: latest day"
    )


# --- Responses ---
# Product ids are SKUs (unique within a store). Money is in the store's currency, as decimals.


class NetworkMeta(BaseModel):
    start: date
    end: date
    segment: str
    total_orders: int
    node_count: int
    edge_count: int
    truncated: bool


class Node(BaseModel):
    id: str
    label: str
    category: str = Field(description="Top-level category")
    orders: int
    revenue: float
    degree: int
    strength: int = Field(description="Total co-orders across all of the node's edges")
    community: int


class Edge(BaseModel):
    source: str
    target: str
    co_orders: int
    support: float
    conf_source_to_target: float
    conf_target_to_source: float
    lift: float


class CommunityRef(BaseModel):
    community: int
    label: str = Field(
        description="Generated from its two most connected products "
        "(the most orders in pairs within the network)"
    )
    size: int


class Network(BaseModel):
    meta: NetworkMeta
    nodes: list[Node]
    edges: list[Edge]
    communities: list[CommunityRef]


class ProductRef(BaseModel):
    id: str
    name: str


class Community(BaseModel):
    community: int
    label: str
    size: int
    revenue: float
    top_products: list[ProductRef]


class CentralityItem(BaseModel):
    id: str
    name: str
    score: float


class Centrality(BaseModel):
    metric: str
    items: list[CentralityItem]


class ProductOut(BaseModel):
    id: str = Field(description="SKU")
    name: str
    category_id: str
    category: str
    top_category_id: str
    top_category: str
    price: float
    status: Literal["active", "inactive"]


class ProductPage(BaseModel):
    items: list[ProductOut]
    next_cursor: str | None


class ProductDetail(ProductOut):
    start: date
    end: date
    orders: int
    qty: int
    revenue: float


class Neighbor(BaseModel):
    id: str
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
    id: str
    name: str
    parent_id: str | None


class TopProduct(BaseModel):
    id: str
    name: str
    orders: int
    revenue: float


class DailyPoint(BaseModel):
    day: date
    orders: int
    revenue: float = Field(description="Net of discounts")


class Summary(BaseModel):
    start: date
    end: date
    segment: str
    total_orders: int
    total_revenue: float = Field(description="Net of discounts")
    avg_basket_size: float = Field(description="Items per order")
    top_products: list[TopProduct]
    daily: list[DailyPoint]


class StoreInfo(BaseModel):
    key: str
    name: str
    timezone: str
    currency: str
    first_day: date | None
    last_complete_day: date | None = Field(
        description="The latest day in the data; default date ranges end here"
    )
    last_event_at: datetime | None
    refreshed_at: datetime | None = Field(description="When the warehouse last rebuilt")


class SegmentOut(BaseModel):
    id: str
    label: str
    description: str
    orders: int = Field(description="Paid orders in the date range")
    share: float = Field(description="Share of all paid orders in the date range")


class ProductSales(BaseModel):
    id: str
    orders: int
    qty: int
    revenue: float = Field(description="Gross line value, before order-level discounts")


class SalesRange(BaseModel):
    start: date
    end: date
    segment: str
    products: list[ProductSales]


class WeeklyProductSales(BaseModel):
    id: str
    orders: list[int]
    qty: list[int]
    revenue: list[float]


class WeeklySales(BaseModel):
    week_starts: list[date] = Field(description="Oldest first; each week is 7 days")
    end: date
    products: list[WeeklyProductSales]
