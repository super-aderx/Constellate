from app.repository import EdgeRow
from app.services.network import build_graph, community_label, detect_communities


def edge(a, b, lift=2.0, co=10):
    return EdgeRow(a, b, co, 0.01, 0.5, 0.5, lift)


def test_build_graph_keeps_edge_attributes():
    g = build_graph([edge("A", "B", lift=3.0, co=7)])
    assert g["A"]["B"] == {"lift": 3.0, "co_orders": 7}


def test_detect_communities_splits_disconnected_groups():
    edges = [
        edge("a1", "a2"),
        edge("a2", "a3"),
        edge("a1", "a3"),
        edge("b1", "b2"),
        edge("b2", "b3"),
    ]
    communities = detect_communities(build_graph(edges))
    assert communities["a1"] == communities["a2"] == communities["a3"]
    assert communities["b1"] == communities["b2"] == communities["b3"]
    assert communities["a1"] != communities["b1"]


def test_detect_communities_orders_ids_by_size():
    edges = [edge("a1", "a2"), edge("b1", "b2"), edge("b2", "b3"), edge("b1", "b3")]
    communities = detect_communities(build_graph(edges))
    assert communities["b1"] == 0
    assert communities["a1"] == 1


def test_detect_communities_empty_graph():
    assert detect_communities(build_graph([])) == {}


def test_community_label_names_top_two_products_without_pack_sizes():
    names = {
        "HS-MILK": "Whole Milk",
        "HS-EGGS": "Eggs (12)",
        "HS-JAM": "Strawberry Jam",
    }
    assert (
        community_label(["HS-MILK", "HS-EGGS", "HS-JAM"], names) == "Whole Milk & Eggs"
    )
    assert community_label(["HS-JAM"], names) == "Strawberry Jam"
