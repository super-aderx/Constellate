"""API tests against the fixture warehouse (tests/warehouse_fixture.py): Harbor Street (the
default store) and Maple Corner, with baskets built from themed product groups."""

from datetime import date, timedelta

import pytest

from tests.warehouse_fixture import QUIET_STORE

MILK, EGGS, YOGURT, COFFEE, FILTERS = (
    "HS-MILK",
    "HS-EGGS",
    "HS-YOGURT",
    "HS-COFFEE",
    "HS-FILTERS",
)
PASTA, SAUCE, CHIPS, SALSA = "HS-PASTA", "HS-SAUCE", "HS-CHIPS", "HS-SALSA"


@pytest.fixture(scope="module")
def get(client):
    def get(path, headers=None, **params):
        response = client.get(path, params=params, headers=headers)
        assert response.status_code == 200, response.text
        return response.json()

    return get


def test_health(get):
    assert get("/health") == {"status": "ok"}


def test_store(get):
    store = get("/api/v1/store")
    assert store["key"] == "harbor-street"
    assert store["name"] == "Harbor Street Market"
    assert store["last_complete_day"] >= store["first_day"]


def test_network_shape_and_consistency(get):
    data = get("/api/v1/network")
    meta, nodes, edges = data["meta"], data["nodes"], data["edges"]
    assert meta["node_count"] == len(nodes) > 0
    assert meta["edge_count"] == len(edges) > 0
    assert meta["total_orders"] > 0
    assert meta["end"] == get("/api/v1/store")["last_complete_day"]

    node_ids = {n["id"] for n in nodes}
    for e in edges:
        assert e["source"] < e["target"]
        assert {e["source"], e["target"]} <= node_ids
        assert e["lift"] >= 1.0
        assert e["co_orders"] >= 5
    lifts = [e["lift"] for e in edges]
    assert lifts == sorted(lifts, reverse=True)
    assert sorted(c["community"] for c in data["communities"]) == sorted(
        {n["community"] for n in nodes}
    )


def test_network_finds_planted_themes(get):
    community = {n["id"]: n["community"] for n in get("/api/v1/network")["nodes"]}
    assert community[MILK] == community[EGGS] == community[YOGURT]
    assert community[COFFEE] == community[FILTERS]
    assert community[PASTA] == community[SAUCE]
    assert community[CHIPS] == community[SALSA]
    assert (
        len({community[MILK], community[COFFEE], community[PASTA], community[CHIPS]})
        == 4
    )


def test_network_segments_add_up_to_all_customers(get):
    segments = [s["id"] for s in get("/api/v1/segments")]
    total = get("/api/v1/network")["meta"]["total_orders"]
    by_segment = [
        get("/api/v1/network", segment=s)["meta"]["total_orders"] for s in segments
    ]
    assert sum(by_segment) == total
    assert all(n > 0 for n in by_segment)


def test_network_truncation(get):
    meta = get("/api/v1/network", max_edges=3)["meta"]
    assert meta["edge_count"] == 3
    assert meta["truncated"] is True


def test_network_category_filter(get, client):
    dairy = next(c for c in get("/api/v1/categories") if c["name"] == "Dairy")
    products = get("/api/v1/products", category_id=dairy["id"], limit=200)["items"]
    in_dairy = {p["id"] for p in products}
    edges = get("/api/v1/network", category_id=dairy["id"])["edges"]
    assert edges
    assert all({e["source"], e["target"]} <= in_dairy for e in edges)


def test_network_date_range_without_orders_is_empty(get):
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
        {"segment": "whales"},
        {"category_id": "dairy"},
    ],
)
def test_network_rejects_invalid_filters(client, params):
    assert client.get("/api/v1/network", params=params).status_code == 422


def test_communities(get):
    communities = get("/api/v1/network/communities")
    assert len(communities) == 4
    assert [c["community"] for c in communities] == list(range(len(communities)))
    assert all(c["top_products"] and c["label"] for c in communities)
    for c in communities:
        names = {p["name"].split(" (")[0] for p in c["top_products"]}
        assert set(c["label"].split(" & ")) <= names | {""}


@pytest.mark.parametrize("metric", ["degree", "strength", "betweenness"])
def test_centrality(get, metric):
    data = get("/api/v1/network/centrality", metric=metric, limit=5)
    scores = [i["score"] for i in data["items"]]
    assert data["metric"] == metric
    assert len(scores) == 5
    assert scores == sorted(scores, reverse=True)


def test_products_pagination_and_search(get):
    page1 = get("/api/v1/products", limit=10)
    assert len(page1["items"]) == 10
    page2 = get("/api/v1/products", limit=10, cursor=page1["next_cursor"])
    assert page2["items"][0]["id"] > page1["items"][-1]["id"]

    results = get("/api/v1/products", search="whole milk")
    assert [p["id"] for p in results["items"]] == [MILK]
    assert results["next_cursor"] is None
    milk = results["items"][0]
    assert (milk["top_category"], milk["price"], milk["status"]) == (
        "Dairy",
        3.89,
        "active",
    )


def test_product_detail_and_neighbors_are_consistent(get):
    detail = get(f"/api/v1/products/{COFFEE}")
    data = get(f"/api/v1/products/{COFFEE}/neighbors", top_k=5)
    neighbors = data["neighbors"]
    assert data["product"]["id"] == COFFEE
    assert 0 < len(neighbors) <= 5
    assert [n["lift"] for n in neighbors] == sorted(
        [n["lift"] for n in neighbors], reverse=True
    )
    top = neighbors[0]
    assert top["confidence"] == pytest.approx(
        top["co_orders"] / detail["orders"], abs=1e-4
    )


def test_neighbors_sort_by_co_orders(get):
    neighbors = get(f"/api/v1/products/{COFFEE}/neighbors", sort="co_orders")[
        "neighbors"
    ]
    counts = [n["co_orders"] for n in neighbors]
    assert counts == sorted(counts, reverse=True)


@pytest.mark.parametrize(
    "path", ["/api/v1/products/HS-NOPE", "/api/v1/products/HS-NOPE/neighbors"]
)
def test_unknown_product_is_404(client, path):
    assert client.get(path).status_code == 404


def test_categories(get):
    categories = get("/api/v1/categories")
    tops = {c["name"] for c in categories if c["parent_id"] is None}
    assert {"Dairy", "Pantry", "Produce"} <= tops


def test_summary_matches_network_totals(get):
    summary = get("/api/v1/summary")
    network_meta = get("/api/v1/network")["meta"]
    assert summary["total_orders"] == network_meta["total_orders"]
    assert len(summary["daily"]) == 90
    assert sum(d["orders"] for d in summary["daily"]) == summary["total_orders"]
    assert summary["total_revenue"] == pytest.approx(
        sum(d["revenue"] for d in summary["daily"])
    )
    assert summary["avg_basket_size"] >= 1


def test_segments_cover_every_order(get):
    segments = get("/api/v1/segments")
    assert [s["id"] for s in segments] == [
        "champions", "loyal", "potential", "new", "at_risk", "hibernating",
    ]  # fmt: skip
    assert sum(s["orders"] for s in segments) == get("/api/v1/summary")["total_orders"]
    assert sum(s["share"] for s in segments) == pytest.approx(1, abs=1e-3)


def test_weekly_sales_match_range_sales(get):
    weekly = get("/api/v1/sales/weekly", weeks=12)
    end = date.fromisoformat(weekly["end"])
    assert len(weekly["week_starts"]) == 12
    assert weekly["week_starts"][-1] == (end - timedelta(days=6)).isoformat()
    ranged = get(
        "/api/v1/sales/products", start=weekly["week_starts"][0], end=weekly["end"]
    )
    orders = {p["id"]: p["orders"] for p in ranged["products"]}
    for p in weekly["products"]:
        assert sum(p["orders"]) == orders[p["id"]]


def test_tenant_header_scopes_every_query(get, client):
    maple = {"X-Tenant-Key": "maple-corner"}
    assert get("/api/v1/store", headers=maple)["name"] == "Maple Corner Grocery"
    products = get("/api/v1/products", headers=maple, limit=200)["items"]
    assert products and all(p["id"].startswith("MC-") for p in products)
    nodes = get("/api/v1/network", headers=maple)["nodes"]
    assert nodes and all(n["id"].startswith("MC-") for n in nodes)
    assert client.get(f"/api/v1/products/{MILK}", headers=maple).status_code == 404
    unknown = client.get("/api/v1/store", headers={"X-Tenant-Key": "nowhere"})
    assert unknown.status_code == 404


def test_products_cursor_pages_through_every_product_once(get):
    everything = [p["id"] for p in get("/api/v1/products", limit=200)["items"]]
    assert "HSX-TOTE" in everything
    seen, cursor = [], None
    while True:
        page = get(
            "/api/v1/products", limit=1, **({"cursor": cursor} if cursor else {})
        )
        seen += [p["id"] for p in page["items"]]
        cursor = page["next_cursor"]
        if cursor is None:
            break
    assert seen == sorted(everything) == everything


@pytest.mark.parametrize(
    "path", ["/api/v1/network", "/api/v1/summary", "/api/v1/sales/weekly"]
)
def test_store_without_a_complete_day_is_503(client, path):
    response = client.get(path, headers={"X-Tenant-Key": QUIET_STORE})
    assert response.status_code == 503
