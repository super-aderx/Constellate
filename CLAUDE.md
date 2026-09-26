# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Constellate is a sales analytics platform focused on product network analysis (which products are bought together, clusters, central products). `backend/` has a working FastAPI API; `frontend/` is still empty. `plan.md` holds the full target design (Postgres warehouse built by dbt, React + Sigma.js frontend).

There is **no database yet**. The API reads from `app/sample_data.py`, an in-memory, deterministic (seeded) stand-in shaped like the planned dbt mart tables (`daily_orders`, `daily_product_stats`, `daily_pair_stats` with `product_a < product_b`). Its baskets are generated from themed product groups, so tests rely on those clusters showing up as communities.

## Setup

```bash
brew install uv    # Python package/env manager for backend/
brew install prek  # git hook runner (Rust rewrite of pre-commit)
```

## Backend (`backend/`)

- Managed with `uv`; dependencies declared in `backend/pyproject.toml`, lockfile in `backend/uv.lock`.
- Run commands from within `backend/`, e.g. `uv run <command>`.
- Dev server: `uv run fastapi dev app/main.py` (docs at http://localhost:8000/docs)
- Tests: `uv run pytest`; single test: `uv run pytest tests/test_api.py::test_communities`
- Lint: `uv run ruff check --fix`
- Format: `uv run ruff format`

### Architecture
Requests flow **routes → services → repository**:
- `app/api/v1/`: HTTP only. Each endpoint takes one Pydantic query-parameter model from `app/schemas.py` (`Annotated[Model, Query()]`); shared validation (start ≤ end, max 366 days) lives on `DateRange`, which the other filter models extend.
- `app/services/network.py`: builds a NetworkX graph from edge rows and computes degree, strength (sum of co-orders), Louvain communities (seed 42, ids ordered by size) and betweenness. `build_graph` and `detect_communities` are pure and unit-tested without data.
- `app/services/sales.py`: products, neighbors (ego network), summary KPIs.
- `app/repository.py`: the only module that touches data. `fetch_edges` sums daily pair counts over a date range and computes support, confidence both ways and lift — the same math the planned SQL will run. Replacing the in-memory data with Postgres means rewriting this module (and `sample_data.py`) behind the same function signatures.
- Omitted date filters default to the 90 days ending at the latest day in the data (`repository.resolve_range`). Network endpoints fetch `max_edges + 1` rows to set `meta.truncated`.
- PageRank is deliberately not used (NetworkX's implementation needs scipy, which isn't a dependency).

## Git hooks (prek)

`prek.toml` configures hooks run via `prek`:
- `trailing-whitespace`, `end-of-file-fixer`, `check-added-large-files` (builtin hooks)
- `ruff check --fix` and `ruff format`, triggered by changes under `backend/**/*.py`. They run as `uv run --directory backend ...` because the uv project lives in `backend/`, not the repo root.

Install the hooks with `prek install`; run them on everything with `prek run --all-files`.
