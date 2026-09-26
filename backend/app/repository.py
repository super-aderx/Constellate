"""Data access over the mart tables. Currently backed by in-memory sample data."""

from dataclasses import dataclass
from datetime import date, timedelta

from app.sample_data import Category, Product, ProductDayStats, warehouse

DEFAULT_RANGE_DAYS = 90


@dataclass(frozen=True)
class EdgeRow:
    product_a: int
    product_b: int
    co_orders: int
    support: float
    conf_a_to_b: float
    conf_b_to_a: float
    lift: float


def resolve_range(start: date | None, end: date | None) -> tuple[date, date]:
    if end is None:
        end = max(warehouse().daily_orders)
    if start is None:
        start = end - timedelta(days=DEFAULT_RANGE_DAYS - 1)
    return start, end


def _days(start: date, end: date) -> list[date]:
    return [d for d in warehouse().daily_orders if start <= d <= end]


def total_orders(start: date, end: date) -> int:
    wh = warehouse()
    return sum(wh.daily_orders[d] for d in _days(start, end))


def product_stats(start: date, end: date) -> dict[int, ProductDayStats]:
    wh = warehouse()
    totals: dict[int, ProductDayStats] = {}
    for d in _days(start, end):
        for pid, s in wh.daily_product_stats[d].items():
            t = totals.setdefault(pid, ProductDayStats())
            t.n_orders += s.n_orders
            t.qty += s.qty
            t.revenue += s.revenue
    return totals


def fetch_edges(
    start: date,
    end: date,
    *,
    min_co_orders: int,
    min_lift: float = 0.0,
    category_id: int | None = None,
    product_id: int | None = None,
    limit: int | None = None,
) -> list[EdgeRow]:
    """Product pairs in the range, strongest lift first."""
    wh = warehouse()
    days = _days(start, end)
    n = sum(wh.daily_orders[d] for d in days)
    if n == 0:
        return []

    co: dict[tuple[int, int], int] = {}
    for d in days:
        for pair, count in wh.daily_pair_stats[d].items():
            co[pair] = co.get(pair, 0) + count
    counts = {pid: s.n_orders for pid, s in product_stats(start, end).items()}

    rows = []
    for (a, b), c in co.items():
        if c < min_co_orders:
            continue
        if product_id is not None and product_id not in (a, b):
            continue
        if category_id is not None and not (
            wh.products[a].category_id == category_id
            and wh.products[b].category_id == category_id
        ):
            continue
        lift = c * n / (counts[a] * counts[b])
        if lift < min_lift:
            continue
        rows.append(EdgeRow(a, b, c, c / n, c / counts[a], c / counts[b], lift))
    rows.sort(key=lambda r: (-r.lift, r.product_a, r.product_b))
    return rows[:limit] if limit is not None else rows


def get_product(product_id: int) -> Product | None:
    return warehouse().products.get(product_id)


def get_products(product_ids: list[int]) -> dict[int, Product]:
    products = warehouse().products
    return {pid: products[pid] for pid in product_ids if pid in products}


def list_products(
    search: str | None, category_id: int | None, limit: int, cursor: int | None
) -> list[Product]:
    needle = search.lower() if search else None
    matches = [
        p
        for p in sorted(warehouse().products.values(), key=lambda p: p.id)
        if (cursor is None or p.id > cursor)
        and (category_id is None or p.category_id == category_id)
        and (needle is None or needle in p.name.lower() or needle in p.sku.lower())
    ]
    return matches[:limit]


def list_categories() -> list[Category]:
    return sorted(warehouse().categories.values(), key=lambda c: c.id)


def category_name(category_id: int) -> str:
    return warehouse().categories[category_id].name


def daily_series(start: date, end: date) -> list[tuple[date, int, float]]:
    wh = warehouse()
    return [
        (
            d,
            wh.daily_orders[d],
            sum(s.revenue for s in wh.daily_product_stats[d].values()),
        )
        for d in sorted(_days(start, end))
    ]
