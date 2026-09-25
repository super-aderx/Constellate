from app import repository as repo
from app.sample_data import Product
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
    Summary,
    TopProduct,
)

TOP_PRODUCTS_IN_SUMMARY = 10


def _product_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        sku=p.sku,
        name=p.name,
        category_id=p.category_id,
        category=repo.category_name(p.category_id),
        price=p.price,
    )


def list_products(params: ProductListParams) -> ProductPage:
    rows = repo.list_products(
        params.search, params.category_id, params.limit + 1, params.cursor
    )
    has_more = len(rows) > params.limit
    rows = rows[: params.limit]
    return ProductPage(
        items=[_product_out(p) for p in rows],
        next_cursor=rows[-1].id if has_more else None,
    )


def list_categories() -> list[CategoryOut]:
    return [
        CategoryOut(id=c.id, name=c.name, parent_id=c.parent_id)
        for c in repo.list_categories()
    ]


def get_product_detail(product_id: int, dates: DateRange) -> ProductDetail | None:
    product = repo.get_product(product_id)
    if product is None:
        return None
    start, end = repo.resolve_range(dates.start, dates.end)
    stats = repo.product_stats(start, end).get(product_id)
    return ProductDetail(
        **_product_out(product).model_dump(),
        start=start,
        end=end,
        orders=stats.n_orders if stats else 0,
        qty=stats.qty if stats else 0,
        revenue=round(stats.revenue, 2) if stats else 0.0,
    )


def get_neighbors(product_id: int, params: NeighborParams) -> Neighbors | None:
    product = repo.get_product(product_id)
    if product is None:
        return None
    start, end = repo.resolve_range(params.start, params.end)
    rows = repo.fetch_edges(
        start, end, min_co_orders=params.min_co_orders, product_id=product_id
    )
    others = repo.get_products(
        [r.product_b if r.product_a == product_id else r.product_a for r in rows]
    )

    neighbors = []
    for r in rows:
        is_a = r.product_a == product_id
        other = others[r.product_b if is_a else r.product_a]
        neighbors.append(
            Neighbor(
                id=other.id,
                name=other.name,
                category=repo.category_name(other.category_id),
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


def get_summary(dates: DateRange) -> Summary:
    start, end = repo.resolve_range(dates.start, dates.end)
    stats = repo.product_stats(start, end)
    total = repo.total_orders(start, end)
    products = repo.get_products(list(stats))
    top = sorted(stats.items(), key=lambda kv: (-kv[1].revenue, kv[0]))
    return Summary(
        start=start,
        end=end,
        total_orders=total,
        total_revenue=round(sum(s.revenue for s in stats.values()), 2),
        avg_basket_size=(
            round(sum(s.n_orders for s in stats.values()) / total, 2) if total else 0.0
        ),
        top_products=[
            TopProduct(
                id=pid,
                name=products[pid].name,
                orders=s.n_orders,
                revenue=round(s.revenue, 2),
            )
            for pid, s in top[:TOP_PRODUCTS_IN_SUMMARY]
        ],
        daily=[
            DailyPoint(day=d, orders=o, revenue=round(r, 2))
            for d, o, r in repo.daily_series(start, end)
        ],
    )
