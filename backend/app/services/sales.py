from datetime import timedelta

from app import repository as repo
from app.db import Db
from app.repository import Product
from app.schemas import (
    CategoryOut,
    DailyPoint,
    DateRange,
    Neighbor,
    NeighborParams,
    Neighbors,
    ProductDetail,
    ProductListParams,
    ProductOut,
    ProductPage,
    ProductSales,
    SalesRange,
    SegmentOut,
    StoreInfo,
    Summary,
    TopProduct,
    WeeklyParams,
    WeeklyProductSales,
    WeeklySales,
)
from app.services.money import dollars

TOP_PRODUCTS_IN_SUMMARY = 10


def _product_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        name=p.name,
        category_id=p.category_id,
        category=p.category,
        top_category_id=p.top_category_id,
        top_category=p.top_category,
        price=dollars(p.price_cents),
        status=p.status,
    )


def get_store(db: Db) -> StoreInfo:
    s = repo.store_info(db)
    return StoreInfo(
        key=s.tenant_key,
        name=s.name,
        timezone=s.timezone,
        currency=s.currency,
        first_day=s.first_day,
        last_complete_day=s.last_complete_day,
        last_event_at=s.last_event_at,
        refreshed_at=s.data_version or s.refreshed_at,
    )


def list_segments(db: Db, dates: DateRange) -> list[SegmentOut]:
    start, end = repo.resolve_range(db, dates.start, dates.end)
    rows = repo.segments(db, start, end)
    total = sum(r.n_orders for r in rows)
    return [
        SegmentOut(
            id=r.id,
            label=r.label,
            description=r.description,
            orders=r.n_orders,
            share=round(r.n_orders / total, 4) if total else 0.0,
        )
        for r in rows
    ]


def list_products(db: Db, params: ProductListParams) -> ProductPage:
    rows = repo.list_products(
        db,
        params.search,
        str(params.category_id) if params.category_id else None,
        params.limit + 1,
        params.cursor,
    )
    has_more = len(rows) > params.limit
    rows = rows[: params.limit]
    return ProductPage(
        items=[_product_out(p) for p in rows],
        next_cursor=rows[-1].id if has_more else None,
    )


def list_categories(db: Db) -> list[CategoryOut]:
    return [
        CategoryOut(id=c.id, name=c.name, parent_id=c.parent_id)
        for c in repo.list_categories(db)
    ]


def get_product_detail(db: Db, sku: str, dates: DateRange) -> ProductDetail | None:
    product = repo.get_product(db, sku)
    if product is None:
        return None
    repo.require_segment(db, dates.segment)
    start, end = repo.resolve_range(db, dates.start, dates.end)
    stats = repo.product_stats(db, start, end, dates.segment).get(sku)
    return ProductDetail(
        **_product_out(product).model_dump(),
        start=start,
        end=end,
        orders=stats.n_orders if stats else 0,
        qty=stats.qty if stats else 0,
        revenue=dollars(stats.revenue_cents) if stats else 0.0,
    )


def get_neighbors(db: Db, sku: str, params: NeighborParams) -> Neighbors | None:
    product = repo.get_product(db, sku)
    if product is None:
        return None
    repo.require_segment(db, params.segment)
    start, end = repo.resolve_range(db, params.start, params.end)
    rows = repo.fetch_edges(
        db,
        start,
        end,
        min_co_orders=params.min_co_orders,
        segment=params.segment,
        product_id=sku,
    )
    others = repo.get_products(
        db, [r.product_b if r.product_a == sku else r.product_a for r in rows]
    )

    neighbors = []
    for r in rows:
        is_a = r.product_a == sku
        other = others[r.product_b if is_a else r.product_a]
        neighbors.append(
            Neighbor(
                id=other.id,
                name=other.name,
                category=other.top_category,
                co_orders=r.co_orders,
                support=round(r.support, 4),
                confidence=round(r.conf_a_to_b if is_a else r.conf_b_to_a, 4),
                lift=round(r.lift, 3),
            )
        )
    neighbors.sort(key=lambda n: (-getattr(n, params.sort), n.id))
    return Neighbors(
        product=_product_out(product),
        start=start,
        end=end,
        neighbors=neighbors[: params.top_k],
    )


def get_summary(db: Db, dates: DateRange) -> Summary:
    repo.require_segment(db, dates.segment)
    start, end = repo.resolve_range(db, dates.start, dates.end)
    stats = repo.product_stats(db, start, end, dates.segment)
    days = repo.daily_series(db, start, end, dates.segment)
    total = sum(d.n_orders for d in days)
    items = sum(d.n_items for d in days)
    products = repo.get_products(db, list(stats))
    top = sorted(stats.items(), key=lambda kv: (-kv[1].revenue_cents, kv[0]))
    return Summary(
        start=start,
        end=end,
        segment=dates.segment,
        total_orders=total,
        total_revenue=dollars(sum(d.revenue_cents for d in days)),
        avg_basket_size=round(items / total, 2) if total else 0.0,
        top_products=[
            TopProduct(
                id=sku,
                name=products[sku].name,
                orders=s.n_orders,
                revenue=dollars(s.revenue_cents),
            )
            for sku, s in top[:TOP_PRODUCTS_IN_SUMMARY]
        ],
        daily=[
            DailyPoint(day=d.day, orders=d.n_orders, revenue=dollars(d.revenue_cents))
            for d in days
        ],
    )


def get_product_sales(db: Db, dates: DateRange) -> SalesRange:
    repo.require_segment(db, dates.segment)
    start, end = repo.resolve_range(db, dates.start, dates.end)
    stats = repo.product_stats(db, start, end, dates.segment)
    return SalesRange(
        start=start,
        end=end,
        segment=dates.segment,
        products=[
            ProductSales(
                id=sku, orders=s.n_orders, qty=s.qty, revenue=dollars(s.revenue_cents)
            )
            for sku, s in sorted(stats.items())
        ],
    )


def get_weekly_sales(db: Db, params: WeeklyParams) -> WeeklySales:
    end = params.end or repo.last_complete_day(db)
    series = repo.weekly_sales(db, end, params.weeks)
    first = end - timedelta(days=7 * params.weeks - 1)
    return WeeklySales(
        week_starts=[first + timedelta(days=7 * i) for i in range(params.weeks)],
        end=end,
        products=[
            WeeklyProductSales(
                id=sku,
                orders=[w.n_orders for w in weeks],
                qty=[w.qty for w in weeks],
                revenue=[dollars(w.revenue_cents) for w in weeks],
            )
            for sku, weeks in sorted(series.items())
        ],
    )
