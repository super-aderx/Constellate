from datetime import date

import networkx as nx

from app import repository as repo
from app.repository import EdgeRow
from app.schemas import (
    Centrality,
    CentralityItem,
    CentralityParams,
    Community,
    Edge,
    Network,
    NetworkFilters,
    NetworkMeta,
    Node,
    ProductRef,
)

BETWEENNESS_EXACT_MAX_NODES = 500
BETWEENNESS_SAMPLE_SIZE = 200
TOP_PRODUCTS_PER_COMMUNITY = 5


def build_graph(edges: list[EdgeRow]) -> nx.Graph:
    g = nx.Graph()
    for e in edges:
        g.add_edge(e.product_a, e.product_b, lift=e.lift, co_orders=e.co_orders)
    return g


def detect_communities(g: nx.Graph) -> dict[int, int]:
    """Map node -> community id, ids ordered by community size (largest is 0)."""
    if g.number_of_nodes() == 0:
        return {}
    groups = nx.community.louvain_communities(g, weight="lift", seed=42)
    groups = sorted(groups, key=lambda c: (-len(c), min(c)))
    return {node: idx for idx, members in enumerate(groups) for node in members}


def _load(filters: NetworkFilters) -> tuple[date, date, list[EdgeRow], bool]:
    start, end = repo.resolve_range(filters.start, filters.end)
    rows = repo.fetch_edges(
        start,
        end,
        min_co_orders=filters.min_co_orders,
        min_lift=filters.min_lift,
        category_id=filters.category_id,
        limit=filters.max_edges + 1,
    )
    truncated = len(rows) > filters.max_edges
    return start, end, rows[: filters.max_edges], truncated


def get_network(filters: NetworkFilters) -> Network:
    start, end, edges, truncated = _load(filters)
    g = build_graph(edges)
    communities = detect_communities(g)
    stats = repo.product_stats(start, end)
    products = repo.get_products(list(g.nodes))

    nodes = [
        Node(
            id=pid,
            label=products[pid].name,
            category=repo.category_name(products[pid].category_id),
            orders=stats[pid].n_orders,
            revenue=round(stats[pid].revenue, 2),
            degree=g.degree(pid),
            strength=g.degree(pid, weight="co_orders"),
            community=communities[pid],
        )
        for pid in sorted(g.nodes)
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
    meta = NetworkMeta(
        start=start,
        end=end,
        total_orders=repo.total_orders(start, end),
        node_count=len(nodes),
        edge_count=len(edge_out),
        truncated=truncated,
    )
    return Network(meta=meta, nodes=nodes, edges=edge_out)


def get_communities(filters: NetworkFilters) -> list[Community]:
    start, end, edges, _ = _load(filters)
    g = build_graph(edges)
    stats = repo.product_stats(start, end)
    products = repo.get_products(list(g.nodes))

    members: dict[int, list[int]] = {}
    for pid, cid in detect_communities(g).items():
        members.setdefault(cid, []).append(pid)

    result = []
    for cid in sorted(members):
        by_revenue = sorted(members[cid], key=lambda p: -stats[p].revenue)
        result.append(
            Community(
                community=cid,
                size=len(by_revenue),
                revenue=round(sum(stats[p].revenue for p in by_revenue), 2),
                top_products=[
                    ProductRef(id=p, name=products[p].name)
                    for p in by_revenue[:TOP_PRODUCTS_PER_COMMUNITY]
                ],
            )
        )
    return result


def get_centrality(params: CentralityParams) -> Centrality:
    _, _, edges, _ = _load(params)
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
    products = repo.get_products([pid for pid, _ in top])
    return Centrality(
        metric=params.metric,
        items=[
            CentralityItem(id=pid, name=products[pid].name, score=round(score, 4))
            for pid, score in top
        ],
    )
