# Plan: Constellate analytics platform (API + frontend)

## Context
Constellate is the analytics part of a larger side project: Go shop → pipeline (dlt + dbt) → Postgres warehouse → **this platform**. Its purpose is product network analysis: which products are bought together, which products drive cross-sales (centrality), and which products form natural clusters (communities).

Today the repo is just scaffolding: `backend/pyproject.toml` (FastAPI, ruff), an empty `frontend/`, and `prek.toml`.

**Scope (decided):** `backend/` and `frontend/` only. The dbt marts are built elsewhere, so this plan treats them as a **contract** (defined below). A small synthetic fixture stands in for them in dev and tests. The seed dataset is still undecided and doesn't block this work.

**Out of scope for now:** authentication and the app database with Alembic, the AI agent, the dbt/dlt pipeline, deployment.

## Data contract: tables the API reads (`warehouse` DB, schemas `marts` and `meta`)
```sql
marts.dim_categories        (category_id PK, name, parent_id NULL)
marts.dim_products          (product_id PK, sku, name, category_id)
marts.mart_daily_orders     (day DATE PK, n_orders INT)
marts.mart_daily_product_stats (day, product_id, n_orders, qty, revenue NUMERIC, PK(day, product_id))
marts.mart_daily_pair_stats (day, product_a, product_b, n_orders,
                             PK(day, product_a, product_b), CHECK (product_a < product_b))
meta.pipeline_runs          (run_id PK, finished_at TIMESTAMPTZ, status TEXT)
```
The API connects as the read-only `api_reader` role. `infra/postgres/dev_marts.sql` creates these tables, the role and ~200 products × 90 days of synthetic data with planted clusters, so communities are visible in dev.

## API design (`/api/v1`; all reads are GET)
**Shared network filters** (`schemas/filters.py`, one Pydantic model used as a dependency):

| Param | Default | Rule |
|---|---|---|
| `start`, `end` | last 90 days up to the latest `day` in the marts | `start <= end`, range ≤ 366 days |
| `category_id` | none | both products in the pair must be in this category |
| `min_co_orders` | 5 | ≥ 1 |
| `min_lift` | 1.0 | ≥ 0 |
| `max_edges` | 500 | 1–5000 |

| Endpoint | Returns |
|---|---|
| `GET /network` | `{meta, nodes[], edges[]}`, graphology-ready (shape below) |
| `GET /network/communities` | `[{community, size, revenue, top_products[]}]` |
| `GET /network/centrality?metric=pagerank\|degree\|betweenness&limit=20` | Ranked products with scores |
| `GET /products?search=&category_id=&limit=50&cursor=` | Paged product list (cursor = last `product_id`) |
| `GET /products/{id}` | Product, category, orders, qty and revenue in the date range; 404 if unknown |
| `GET /products/{id}/neighbors?top_k=10&sort=lift\|co_orders\|confidence` | Ego network of a product |
| `GET /categories` | Category tree |
| `GET /summary?start=&end=` | KPIs: revenue, orders, average basket size, top products, daily series |
| `GET /health` | `{status, db, last_pipeline_run}` |

**`/network` response:**
- `meta`: `{start, end, total_orders, node_count, edge_count, truncated}`
- `nodes`: `{id, label, category, orders, revenue, degree, pagerank, community}`
- `edges`: `{source, target, co_orders, support, conf_source_to_target, conf_target_to_source, lift}`

`truncated` is detected by querying `LIMIT max_edges + 1`.

**Errors:** invalid filters → 422 (Pydantic). Unknown product → 404. A date range with no orders → 200 with an empty graph.

## Backend (`backend/`)
**Dependencies to add** (`uv add`):
- runtime: `fastapi[standard]`, `sqlalchemy[asyncio]`, `asyncpg`, `pydantic-settings`, `networkx`, `cachetools`
- dev: `pytest`, `pytest-asyncio`

`networkx` includes `pagerank` and `community.louvain_communities`, so no separate community-detection library is needed.

**Layout**
```
backend/app/
  main.py            app factory, lifespan creates/disposes engine, mounts v1 router
  config.py          Settings(DATABASE_URL, CACHE_SIZE) from .env
  db.py              create_async_engine(asyncpg), statement_timeout=5s on connect, get_conn dependency
  api/v1/            router.py, network.py, products.py, summary.py, health.py  (HTTP only)
  schemas/           filters.py, network.py, products.py, summary.py            (Pydantic models)
  repositories/      network.py, products.py, summary.py, meta.py   (SQL via text(), bound params)
  services/          network.py  (edges → nx.Graph → metrics → response)
                     cache.py    (LRU keyed by endpoint + filters + last pipeline run)
backend/tests/       test_network_service.py (pure, no DB), test_api.py (against the fixture DB)
```

**Key logic**
- `repositories/network.py`: `fetch_edges(filters)` runs the aggregate SQL. It sums the daily tables over the range; `HAVING SUM(n_orders) >= :min_co_orders`; computes support, confidence both ways and lift; filters by `min_lift`; `ORDER BY lift DESC LIMIT :max_edges + 1`.
- `repositories/network.py`: `fetch_node_stats(product_ids, range)` returns name, category, orders and revenue per product.
- `services/network.py`: `build_network(edges, node_stats)`
  - `nx.Graph` with `weight=lift`
  - degree, `pagerank(weight="weight")`, `louvain_communities(seed=42)` (fixed seed so results are stable)
  - betweenness only when requested via `/centrality`, using sampling (`k=min(200, n)`) on large graphs
  - pure functions, so it's unit-testable without a database
- **Cache:** the key includes `meta.pipeline_runs` max `finished_at`, so new pipeline data invalidates old entries automatically. The latest run time is itself cached for 30 s, so each request doesn't query the meta table.
- **Isolation:** the API only reads `marts.*` and `meta.*`; routers never contain SQL.

## Frontend (`frontend/`)
**Stack**
- React + TypeScript + Vite; pnpm
- React Router, TanStack Query
- Tailwind + shadcn/ui
- `@react-sigma/core` + `graphology` + `graphology-layout-forceatlas2` (web worker)
- ECharts via `echarts-for-react`
- Typed API client: `openapi-typescript` + `openapi-fetch`, generated from FastAPI's `/openapi.json` (`pnpm gen:api`)

**Pages**
1. **Overview** (`/`): KPI tiles, daily revenue and orders chart, top products.
2. **Network explorer** (`/network`), the main screen:
   - filter sidebar; filters live in URL search params, so views are shareable
   - Sigma graph: node colour = community, size = PageRank, edge width = lift
   - hover shows neighbours; clicking a node opens the product drawer
   - a banner when `truncated` is true
3. **Product drawer / page** (`/products/:id`): stats, ego network, neighbours table (sortable by lift, co-orders or confidence).
4. **Communities** (`/communities`): one card per cluster with top products; "view in graph" opens the explorer filtered to that cluster.
5. **Products** (`/products`): searchable table with cursor paging.

**Dev setup:** the Vite dev server proxies `/api` to `localhost:8000`, so there's no CORS setup in dev.

## Repo-level changes
- `docker-compose.yml`: `postgres:17` with `infra/postgres/dev_marts.sql` mounted as an init script.
- `.env.example`: `DATABASE_URL=postgresql+asyncpg://api_reader:...@localhost:5432/warehouse`.
- `prek.toml`: add eslint and prettier hooks for `frontend/`.
- Update `README.md` and `CLAUDE.md` with run and test commands.

## Build order
1. Compose Postgres with the fixture SQL.
2. Backend skeleton: config, db, health.
3. Network repository and service, with unit tests.
4. Remaining endpoints and API tests.
5. Frontend scaffold and generated client.
6. Network explorer.
7. Overview, product, communities and products pages.
8. Docs.

## Verification
- `docker compose up -d postgres`, then `cd backend && uv run fastapi dev app/main.py`.
- `curl localhost:8000/api/v1/network?min_lift=1.5` returns nodes and edges, and the planted clusters appear as separate `community` values. `/docs` shows every endpoint.
- Error cases: `start > end` → 422; `/products/999999` → 404; an empty date range → empty graph.
- `uv run pytest`: service unit tests plus API tests against the fixture DB. `uv run ruff check`.
- `cd frontend && pnpm dev`:
  - the graph renders and changing a filter updates both the URL and the graph
  - clicking a node opens its product drawer
  - reloading a copied URL restores the same view
- `pnpm tsc --noEmit` and `pnpm lint` pass; `prek run --all-files` passes.
