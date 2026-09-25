from app.repository import EdgeRow
from app.services.network import build_graph, detect_communities


def edge(a, b, lift=2.0, co=10):
    return EdgeRow(a, b, co, 0.01, 0.5, 0.5, lift)


def test_build_graph_keeps_edge_attributes():
    g = build_graph([edge(1, 2, lift=3.0, co=7)])
    assert g[1][2] == {"lift": 3.0, "co_orders": 7}


def test_detect_communities_splits_disconnected_groups():
    edges = [edge(1, 2), edge(2, 3), edge(1, 3), edge(10, 11), edge(11, 12)]
    communities = detect_communities(build_graph(edges))
    assert communities[1] == communities[2] == communities[3]
    assert communities[10] == communities[11] == communities[12]
    assert communities[1] != communities[10]


def test_detect_communities_orders_ids_by_size():
    edges = [edge(1, 2), edge(10, 11), edge(11, 12), edge(10, 12)]
    communities = detect_communities(build_graph(edges))
    assert communities[10] == 0
    assert communities[1] == 1


def test_detect_communities_empty_graph():
    assert detect_communities(build_graph([])) == {}
