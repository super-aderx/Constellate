import re
from datetime import date

import networkx as nx

from app import repository as repo
from app.db import Db
from app.repository import EdgeRow, Product, ProductStats
from app.schemas import (
    Centrality,
    CentralityItem,
    CentralityParams,
    Community,
    CommunityRef,
    Edge,
    Network,
    NetworkFilters,
    NetworkMeta,
    Node,
    ProductRef,
)
from app.services.money import dollars

BETWEENNESS_EXACT_MAX_NODES = 500
BETWEENNESS_SAMPLE_SIZE = 200
TOP_PRODUCTS_PER_COMMUNITY = 5


def build_graph(edges: list[EdgeRow]) -> nx.Graph:
    g = nx.Graph()
    for e in edges:
        g.add_edge(e.product_a, e.product_b, lift=e.lift, co_orders=e.co_orders)
    return g


def detect_communities(g: nx.Graph) -> dict[str, int]:
    """Map node -> community id, ids ordered by community size (largest is 0)."""
    if g.number_of_nodes() == 0:
        return {}
    groups = nx.community.louvain_communities(g, weight="lift", seed=42)
    groups = sorted(groups, key=lambda c: (-len(c), min(c)))
    return {node: idx for idx, members in enumerate(groups) for node in members}


def community_label(members: list[str], names: dict[str, str]) -> str:
    """A community's name from its two most connected products (members sorted by strength,
    highest first). Communities aren't stored, so the label is generated with every response."""
    return " & ".join(re.sub(r"\s*\(.*?\)", "", names[m]) for m in members[:2])


def _members(
    communities: dict[str, int], stats: dict[str, ProductStats]
) -> dict[int, list[str]]:
    """Community id -> members by revenue, highest first."""
    members: dict[int, list[str]] = {}
    for sku, cid in communities.items():
        members.setdefault(cid, []).append(sku)

    def by_revenue(sku: str) -> tuple[int, str]:
        return (-(stats[sku].revenue_cents if sku in stats else 0), sku)

    return {cid: sorted(m, key=by_revenue) for cid, m in sorted(members.items())}


def _load(db: Db, filters: NetworkFilters) -> tuple[date, date, list[EdgeRow], bool]:
    repo.require_segment(db, filters.segment)
    start, end = repo.resolve_range(db, filters.start, filters.end)
    rows = repo.fetch_edges(
        db,
        start,
        end,
        min_co_orders=filters.min_co_orders,
        min_lift=filters.min_lift,
        segment=filters.segment,
        category_id=str(filters.category_id) if filters.category_id else None,
        limit=filters.max_edges + 1,
    )
    truncated = len(rows) > filters.max_edges
    return start, end, rows[: filters.max_edges], truncated


def _names(products: dict[str, Product]) -> dict[str, str]:
    return {sku: p.name for sku, p in products.items()}


def _label(g: nx.Graph, members: list[str], names: dict[str, str]) -> str:
    by_strength = sorted(members, key=lambda s: (-g.degree(s, weight="co_orders"), s))
    return community_label(by_strength, names)


def get_network(db: Db, filters: NetworkFilters) -> Network:
    start, end, edges, truncated = _load(db, filters)
    g = build_graph(edges)
    communities = detect_communities(g)
    stats = repo.product_stats(db, start, end, filters.segment)
    products = repo.get_products(db, list(g.nodes))
    names = _names(products)

    nodes = [
        Node(
            id=sku,
            label=products[sku].name,
            category=products[sku].top_category,
            orders=stats[sku].n_orders,
            revenue=dollars(stats[sku].revenue_cents),
            degree=g.degree(sku),
            strength=g.degree(sku, weight="co_orders"),
            community=communities[sku],
        )
        for sku in sorted(g.nodes)
    ]
    edge_out = [
        Edge(
            source=e.product_a,
            target=e.product_b,
            co_orders=e.co_orders,
            support=round(e.support, 4),
            conf_source_to_target=round(e.conf_a_to_b, 4),
            conf_target_to_source=round(e.conf_b_to_a, 4),
            lift=round(e.lift, 3),
        )
        for e in edges
    ]
    refs = [
        CommunityRef(community=cid, label=_label(g, m, names), size=len(m))
        for cid, m in _members(communities, stats).items()
    ]
    meta = NetworkMeta(
        start=start,
        end=end,
        segment=filters.segment,
        total_orders=repo.total_orders(db, start, end, filters.segment),
        node_count=len(nodes),
        edge_count=len(edge_out),
        truncated=truncated,
    )
    return Network(meta=meta, nodes=nodes, edges=edge_out, communities=refs)


def get_communities(db: Db, filters: NetworkFilters) -> list[Community]:
    start, end, edges, _ = _load(db, filters)
    g = build_graph(edges)
    stats = repo.product_stats(db, start, end, filters.segment)
    products = repo.get_products(db, list(g.nodes))
    names = _names(products)

    return [
        Community(
            community=cid,
            label=_label(g, members, names),
            size=len(members),
            revenue=dollars(sum(stats[p].revenue_cents for p in members)),
            top_products=[
                ProductRef(id=p, name=names[p])
                for p in members[:TOP_PRODUCTS_PER_COMMUNITY]
            ],
        )
        for cid, members in _members(detect_communities(g), stats).items()
    ]


def get_centrality(db: Db, params: CentralityParams) -> Centrality:
    _, _, edges, _ = _load(db, params)
    g = build_graph(edges)

    if params.metric == "degree":
        scores = dict(g.degree())
    elif params.metric == "strength":
        scores = dict(g.degree(weight="co_orders"))
    else:
        n = g.number_of_nodes()
        k = None if n <= BETWEENNESS_EXACT_MAX_NODES else BETWEENNESS_SAMPLE_SIZE
        scores = nx.betweenness_centrality(g, k=k, seed=42)

    top = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[: params.limit]
    products = repo.get_products(db, [sku for sku, _ in top])
    return Centrality(
        metric=params.metric,
        items=[
            CentralityItem(id=sku, name=products[sku].name, score=round(score, 4))
            for sku, score in top
        ],
    )
