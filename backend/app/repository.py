"""Data access over the warehouse's serving views: the only module that runs SQL.

Every query filters on the request's tenant_id explicitly, on top of the views' own filter on
app.tenant_id (see app/db.py). Money stays in cents here; services convert it at the edge.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from fastapi import HTTPException

from app.db import Db

DEFAULT_RANGE_DAYS = 90


@dataclass(frozen=True)
class Category:
    id: str
    name: str
    parent_id: str | None


@dataclass(frozen=True)
class Product:
    id: str  # the SKU; unique within a tenant
    name: str
    category_id: str
    category: str
    top_category_id: str
    top_category: str
    price_cents: int
    status: str


@dataclass(frozen=True)
class ProductStats:
    n_orders: int
    qty: int
    revenue_cents: int  # gross line value


@dataclass(frozen=True)
class EdgeRow:
    product_a: str
    product_b: str
    co_orders: int
    support: float
    conf_a_to_b: float
    conf_b_to_a: float
    lift: float


@dataclass(frozen=True)
class DayRow:
    day: date
    n_orders: int
    n_items: int
    revenue_cents: int  # net of discounts


@dataclass(frozen=True)
class StoreRow:
    tenant_key: str
    name: str
    timezone: str
    currency: str
    first_day: date | None
    last_complete_day: date | None
    last_event_at: datetime | None
    refreshed_at: datetime | None
    data_version: datetime | None


@dataclass(frozen=True)
class SegmentRow:
    id: str
    label: str
    description: str
    sort_order: int
    n_orders: int


# --- Store and dates ---


def store_info(db: Db) -> StoreRow:
    row = db.conn.execute(
        """
        select t.tenant_key, t.name, t.timezone, t.currency, f.first_day, f.last_complete_day,
               f.last_event_at, f.refreshed_at,
               (select max(finished_at) from meta.pipeline_runs where status = 'success')
        from platform.tenants as t
        left join serving.freshness as f on f.tenant_id = t.tenant_id
        where t.tenant_id = %s
        """,
        (db.tenant_id,),
    ).fetchone()
    return StoreRow(*row)


def last_complete_day(db: Db) -> date:
    row = db.conn.execute(
        "select last_complete_day from serving.freshness where tenant_id = %s",
        (db.tenant_id,),
    ).fetchone()
    # No freshness row, or one without a complete day yet, both mean there's nothing to show.
    if row is None or row[0] is None:
        raise HTTPException(
            status_code=503, detail="The warehouse has no data for this store yet"
        )
    return row[0]


def resolve_range(db: Db, start: date | None, end: date | None) -> tuple[date, date]:
    """Omitted dates default to the 90 days ending at the last complete day."""
    if end is None:
        end = last_complete_day(db)
    if start is None:
        start = end - timedelta(days=DEFAULT_RANGE_DAYS - 1)
    return start, end


def require_segment(db: Db, segment: str) -> None:
    """'all', or a segment id from serving.segments; anything else is a 422."""
    if segment == "all":
        return
    known = {r[0] for r in db.conn.execute("select segment from serving.segments")}
    if segment not in known:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown segment {segment!r}; use 'all' or one of {sorted(known)}",
        )


def segments(db: Db, start: date, end: date) -> list[SegmentRow]:
    rows = db.conn.execute(
        """
        select s.segment, s.label, s.description, s.sort_order, coalesce(o.n_orders, 0)
        from serving.segments as s
        left join (
          select segment, sum(n_orders)::int as n_orders
          from serving.daily_orders
          where tenant_id = %(t)s and day between %(start)s and %(end)s
          group by segment
        ) as o on o.segment = s.segment
        order by s.sort_order
        """,
        {"t": db.tenant_id, "start": start, "end": end},
    ).fetchall()
    return [SegmentRow(*r) for r in rows]


# --- Orders ---

# `%(segment)s = 'all'` means every segment: "all customers" is the sum over segments.
_SEGMENT = "(%(segment)s = 'all' or segment = %(segment)s)"


def total_orders(db: Db, start: date, end: date, segment: str = "all") -> int:
    row = db.conn.execute(
        f"""
        select coalesce(sum(n_orders), 0)::int from serving.daily_orders
        where tenant_id = %(t)s and day between %(start)s and %(end)s and {_SEGMENT}
        """,
        {"t": db.tenant_id, "start": start, "end": end, "segment": segment},
    ).fetchone()
    return row[0]


def daily_series(db: Db, start: date, end: date, segment: str = "all") -> list[DayRow]:
    """Every day in the range, including days without orders."""
    rows = db.conn.execute(
        """
        select d.day::date, coalesce(sum(o.n_orders), 0)::int, coalesce(sum(o.n_items), 0)::int,
               coalesce(sum(o.revenue_cents), 0)::bigint
        from generate_series(%(start)s::date, %(end)s::date, interval '1 day') as d (day)
        left join serving.daily_orders as o
          on o.tenant_id = %(t)s and o.day = d.day::date
          and (%(segment)s = 'all' or o.segment = %(segment)s)
        group by d.day
        order by d.day
        """,
        {"t": db.tenant_id, "start": start, "end": end, "segment": segment},
    ).fetchall()
    return [DayRow(*r) for r in rows]


# --- Products ---

_PRODUCTS = """
    select p.sku, p.name, p.category_id::text, c.name, p.top_category_id::text, tc.name,
           p.price_cents, p.status
    from serving.products as p
    left join serving.categories as c
      on c.tenant_id = p.tenant_id and c.category_id = p.category_id
    left join serving.categories as tc
      on tc.tenant_id = p.tenant_id and tc.category_id = p.top_category_id
    where p.tenant_id = %(t)s
"""


def get_products(db: Db, skus: list[str]) -> dict[str, Product]:
    rows = db.conn.execute(
        _PRODUCTS + " and p.sku = any(%(skus)s)", {"t": db.tenant_id, "skus": skus}
    ).fetchall()
    return {r[0]: Product(*r) for r in rows}


def get_product(db: Db, sku: str) -> Product | None:
    return get_products(db, [sku]).get(sku)


def list_products(
    db: Db, search: str | None, category_id: str | None, limit: int, cursor: str | None
) -> list[Product]:
    """Products ordered by SKU; a category matches its own products and its subcategories'."""
    rows = db.conn.execute(
        _PRODUCTS
        + """
          and (%(cursor)s::text is null or p.sku > %(cursor)s collate "C")
          and (%(category)s::uuid is null
               or p.category_id = %(category)s::uuid or p.top_category_id = %(category)s::uuid)
          and (%(search)s::text is null
               or p.name ilike '%%' || %(search)s || '%%' or p.sku ilike '%%' || %(search)s || '%%')
        order by p.sku collate "C"
        limit %(limit)s
        """,
        {
            "t": db.tenant_id,
            "cursor": cursor,
            "category": category_id,
            "search": search,
            "limit": limit,
        },
    ).fetchall()
    return [Product(*r) for r in rows]


def list_categories(db: Db) -> list[Category]:
    rows = db.conn.execute(
        """
        select category_id::text, name, parent_id::text from serving.categories
        where tenant_id = %s
        order by parent_id nulls first, name
        """,
        (db.tenant_id,),
    ).fetchall()
    return [Category(*r) for r in rows]


def product_stats(
    db: Db, start: date, end: date, segment: str = "all"
) -> dict[str, ProductStats]:
    rows = db.conn.execute(
        f"""
        select sku, sum(n_orders)::int, sum(qty)::int, sum(revenue_cents)::bigint
        from serving.daily_product
        where tenant_id = %(t)s and day between %(start)s and %(end)s and {_SEGMENT}
        group by sku
        """,
        {"t": db.tenant_id, "start": start, "end": end, "segment": segment},
    ).fetchall()
    return {r[0]: ProductStats(*r[1:]) for r in rows}


def weekly_sales(db: Db, end: date, weeks: int) -> dict[str, list[ProductStats]]:
    """Per SKU, one entry per 7-day week ending at `end`, oldest first."""
    rows = db.conn.execute(
        """
        select sku, (%(end)s::date - day) / 7 as ago,
               sum(n_orders)::int, sum(qty)::int, sum(revenue_cents)::bigint
        from serving.daily_product
        where tenant_id = %(t)s and day between %(start)s and %(end)s
        group by sku, ago
        """,
        {"t": db.tenant_id, "start": end - timedelta(days=7 * weeks - 1), "end": end},
    ).fetchall()
    series: dict[str, list[ProductStats]] = {}
    for sku, ago, n_orders, qty, revenue in rows:
        weekly = series.setdefault(sku, [ProductStats(0, 0, 0)] * weeks)
        weekly[weeks - 1 - ago] = ProductStats(n_orders, qty, revenue)
    return series


# --- Pairs ---


def fetch_edges(
    db: Db,
    start: date,
    end: date,
    *,
    min_co_orders: int,
    min_lift: float = 0.0,
    segment: str = "all",
    category_id: str | None = None,
    product_id: str | None = None,
    limit: int | None = None,
) -> list[EdgeRow]:
    """Product pairs in the range, strongest lift first (warehouse_spec.md, fetch_edges).
    Support, confidence and lift are computed here from the summed additive counts."""
    rows = db.conn.execute(
        f"""
        with n as (
          select sum(n_orders)::float as n from serving.daily_orders
          where tenant_id = %(t)s and day between %(start)s and %(end)s and {_SEGMENT}
        ),
        p as (
          select sku, sum(n_orders) as n from serving.daily_product
          where tenant_id = %(t)s and day between %(start)s and %(end)s and {_SEGMENT}
          group by sku
        ),
        cat as (
          select sku from serving.products
          where tenant_id = %(t)s
            and (category_id = %(category)s::uuid or top_category_id = %(category)s::uuid)
        ),
        e as (
          select sku_a, sku_b, sum(n_orders) as c from serving.daily_pair
          where tenant_id = %(t)s and day between %(start)s and %(end)s and {_SEGMENT}
            and (%(sku)s::text is null or %(sku)s in (sku_a, sku_b))
            and (%(category)s::uuid is null
                 or (sku_a in (select sku from cat) and sku_b in (select sku from cat)))
          group by sku_a, sku_b
          having sum(n_orders) >= %(min_co_orders)s
        )
        select e.sku_a, e.sku_b, e.c::int as co_orders,
               e.c / n.n as support,
               e.c::float / pa.n as conf_a_to_b,
               e.c::float / pb.n as conf_b_to_a,
               e.c * n.n / (pa.n * pb.n) as lift
        from e
        join p as pa on pa.sku = e.sku_a
        join p as pb on pb.sku = e.sku_b
        cross join n
        where e.c * n.n / (pa.n * pb.n) >= %(min_lift)s
        order by lift desc, e.sku_a collate "C", e.sku_b collate "C"
        limit %(limit)s
        """,
        {
            "t": db.tenant_id,
            "start": start,
            "end": end,
            "segment": segment,
            "sku": product_id,
            "category": category_id,
            "min_co_orders": min_co_orders,
            "min_lift": min_lift,
            "limit": limit,
        },
    ).fetchall()
    return [EdgeRow(*r) for r in rows]
