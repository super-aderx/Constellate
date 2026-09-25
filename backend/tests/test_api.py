import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Product ids from app/sample_data.py
FLOUR, SUGAR, BUTTER = 7, 8, 10
SPAGHETTI, MARINARA = 18, 19
MILK, DISH_SOAP = 1, 23


def get(path, **params):
    response = client.get(path, params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_health():
    assert get("/health") == {"status": "ok"}


def test_network_shape_and_consistency():
    data = get("/api/v1/network")
    meta, nodes, edges = data["meta"], data["nodes"], data["edges"]
    assert meta["node_count"] == len(nodes) > 0
    assert meta["edge_count"] == len(edges) > 0
    assert meta["total_orders"] > 0

    node_ids = {n["id"] for n in nodes}
    for e in edges:
        assert e["source"] < e["target"]
        assert {e["source"], e["target"]} <= node_ids
        assert e["lift"] >= 1.0
        assert e["co_orders"] >= 5
    lifts = [e["lift"] for e in edges]
    assert lifts == sorted(lifts, reverse=True)


def test_network_finds_planted_clusters():
    community = {n["id"]: n["community"] for n in get("/api/v1/network")["nodes"]}
    assert community[FLOUR] == community[SUGAR] == community[BUTTER]
    assert community[SPAGHETTI] == community[MARINARA]
    assert community[MILK] != community[DISH_SOAP]


def test_network_truncation():
    meta = get("/api/v1/network", max_edges=3)["meta"]
    assert meta["edge_count"] == 3
    assert meta["truncated"] is True


def test_network_date_range_without_orders_is_empty():
    data = get("/api/v1/network", start="2020-01-01", end="2020-01-31")
    assert data["nodes"] == [] and data["edges"] == []
    assert data["meta"]["total_orders"] == 0


@pytest.mark.parametrize(
    "params",
    [
        {"start": "2026-09-10", "end": "2026-09-01"},
        {"start": "2024-01-01", "end": "2026-01-01"},
        {"max_edges": 0},
        {"min_lift": -1},
    ],
)
def test_network_rejects_invalid_filters(params):
    assert client.get("/api/v1/network", params=params).status_code == 422


def test_communities():
    communities = get("/api/v1/network/communities")
    assert len(communities) >= 2
    assert [c["community"] for c in communities] == list(range(len(communities)))
    assert all(c["top_products"] for c in communities)


@pytest.mark.parametrize("metric", ["degree", "strength", "betweenness"])
def test_centrality(metric):
    data = get("/api/v1/network/centrality", metric=metric, limit=5)
    scores = [i["score"] for i in data["items"]]
    assert data["metric"] == metric
    assert len(scores) == 5
    assert scores == sorted(scores, reverse=True)


def test_products_pagination_and_search():
    page1 = get("/api/v1/products", limit=10)
    assert len(page1["items"]) == 10
    page2 = get("/api/v1/products", limit=10, cursor=page1["next_cursor"])
    assert page2["items"][0]["id"] > page1["items"][-1]["id"]

    results = get("/api/v1/products", search="milk")["items"]
    assert [p["name"] for p in results] == ["Whole Milk"]
    assert get("/api/v1/products", search="milk")["next_cursor"] is None


def test_product_detail_and_neighbors_are_consistent():
    detail = get(f"/api/v1/products/{FLOUR}")
    data = get(f"/api/v1/products/{FLOUR}/neighbors", top_k=5)
    neighbors = data["neighbors"]
    assert data["product"]["id"] == FLOUR
    assert 0 < len(neighbors) <= 5
    assert [n["lift"] for n in neighbors] == sorted(
        [n["lift"] for n in neighbors], reverse=True
    )
    top = neighbors[0]
    assert top["confidence"] == pytest.approx(
        top["co_orders"] / detail["orders"], abs=1e-4
    )


def test_neighbors_sort_by_co_orders():
    neighbors = get(f"/api/v1/products/{FLOUR}/neighbors", sort="co_orders")[
        "neighbors"
    ]
    counts = [n["co_orders"] for n in neighbors]
    assert counts == sorted(counts, reverse=True)


@pytest.mark.parametrize(
    "path", ["/api/v1/products/9999", "/api/v1/products/9999/neighbors"]
)
def test_unknown_product_is_404(path):
    assert client.get(path).status_code == 404


def test_categories():
    names = [c["name"] for c in get("/api/v1/categories")]
    assert "Dairy" in names


def test_summary_matches_network_totals():
    summary = get("/api/v1/summary")
    network_meta = get("/api/v1/network")["meta"]
    assert summary["total_orders"] == network_meta["total_orders"]
    assert len(summary["daily"]) == 90
    assert summary["total_revenue"] > 0
    assert summary["avg_basket_size"] >= 1
