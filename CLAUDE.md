# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Constellate is a sales analytics platform focused on product network analysis (which products are bought together, clusters, central products), plus an AI layer ("Constella AI") that turns the network into strategy: answers, bundles, discount campaigns and slogans. `backend/` is a FastAPI API over the warehouse. `frontend/constella-frontend/` has the marketing landing page and the signed-in app: Home, Network (with communities inside it), Products, Constella AI (chat, campaign drafts, one-click business report) and Campaigns. The signed-in app reads its data from the API. The AI is still simulated: a scripted engine writes answers from that data (the agent isn't built). `spec.md`, `warehouse_spec.md` and `tps_spec.md` hold the platform design; `plan.md` is the older design (its API and frontend parts still apply).

The data comes from the **warehouse**, which lives in its own repo, [constella-data-platform](https://github.com/super-aderx/constella-data-platform): a Postgres database built by dbt from StarMart's events (for now, from its dev event generator). The API connects as `api_reader` and reads only the `serving` views (`products`, `categories`, `daily_orders`, `daily_product`, `daily_pair` with `sku_a < sku_b`, `freshness`, `segments`), `meta.pipeline_runs` and `platform.tenants`. The dev store is Harbor Street Market (`harbor-street`).

The serving contract is the boundary between the two repos: Constellate never builds, checks out or tests the data platform, and the data platform tests its own side. The API tests run against `backend/tests/warehouse_fixture.py`, a throwaway copy of the contract (the same views, tenant filter and read-only role) filled with two small stores whose baskets come from themed product groups, so tests rely on those themes showing up as communities. When the contract changes, update the fixture's DDL with the code that uses it.

What's still mock: the signed-in account, campaigns and their results (the warehouse has no promotions until the data platform's P1), and the AI's wording.

## Setup

```bash
brew install uv    # Python package/env manager for backend/
brew install prek  # git hook runner (Rust rewrite of pre-commit)
```

Running the app needs the warehouse running and loaded: follow constella-data-platform's README ("Run it"), which starts it on port 5433. Then `cp backend/.env.example backend/.env`. The tests don't need it (see below).

The frontend needs Node 22.12+ (`@rolldown/plugin-babel` requires it) and uses npm (there's a `package-lock.json`; `plan.md` says pnpm, but npm is what's in use).

## Backend (`backend/`)

- Managed with `uv`; dependencies declared in `backend/pyproject.toml`, lockfile in `backend/uv.lock`.
- Run commands from within `backend/`, e.g. `uv run <command>`.
- Dev server: `uv run --env-file .env fastapi dev app/main.py` (docs at http://localhost:8000/docs)
- Tests: `uv run --env-file .env pytest`; single test: `uv run --env-file .env pytest tests/test_api.py::test_communities`. The API tests need `TEST_POSTGRES_URL`, an admin connection to any Postgres 17 (see `.env.example`); they create their own `constella_api_test` database and role there, and are skipped without it. `test_network_service.py` is pure.
- Lint: `uv run ruff check --fix`
- Format: `uv run ruff format`

### Architecture
Requests flow **routes → services → repository**:
- `app/db.py`: a psycopg pool on `DATABASE_URL` and the `DbDep` dependency every route takes. It resolves the request's store (the `X-Tenant-Key` header, else `CONSTELLA_DEFAULT_TENANT`) through `platform.tenants`, opens one transaction per request and starts it with `set_config('app.tenant_id', …, true)`, so the serving views return only that store's rows. Unknown store: 404.
- `app/api/v1/`: HTTP only. Each endpoint takes one Pydantic query-parameter model from `app/schemas.py` (`Annotated[Model, Query()]`); shared validation (start ≤ end, max 366 days) and the `segment` filter (`all` or an RFM segment id) live on `DateRange`, which the other filter models extend. Endpoints: `/store`, `/segments`, `/network` (+ `/communities`, `/centrality`), `/products` (+ `/{sku}`, `/{sku}/neighbors`), `/categories`, `/summary`, `/sales/products`, `/sales/weekly`.
- `app/services/network.py`: builds a NetworkX graph from edge rows and computes degree, strength (sum of co-orders), Louvain communities (seed 42, ids ordered by size) and betweenness. Communities aren't stored: each response labels them after their two most connected products ("Whole Milk & Eggs"). `build_graph`, `detect_communities` and `community_label` are pure and unit-tested without data.
- `app/services/sales.py`: store info, segments, products, neighbors (ego network), summary KPIs, sales per product and per week. Money is integer cents up to here; services convert it to decimal dollars (`services/money.py`).
- `app/repository.py`: the only module that runs SQL, against `serving.*` only. Every query also filters `tenant_id` itself (required, not a backup to the views). `fetch_edges` sums daily pair counts over a date range and computes support, confidence both ways and lift from the summed counts. Ratios are never stored in the warehouse; "all customers" is the sum over segments.
- Product ids are SKUs (strings, unique within a store); category ids are UUID strings. `category` is a product's own category, `top_category` its top-level one (what the UI groups by; network nodes carry it as `category`).
- Omitted date filters default to the 90 days ending at the store's `last_complete_day` (`serving.freshness`), never at the partial day after it. Network endpoints fetch `max_edges + 1` rows to set `meta.truncated`.
- PageRank is deliberately not used (NetworkX's implementation needs scipy, which isn't a dependency).

## Frontend (`frontend/constella-frontend/`)

- React 19 + TypeScript + Vite 8, with the React Compiler (babel plugin in `vite.config.ts`). Tailwind CSS v4 via `@tailwindcss/vite`; no `tailwind.config`.
- shadcn/ui (`components.json`: style `radix-vega`, Radix primitives, lucide icons). Add components with `npx shadcn@latest add <name>`; don't hand-edit `src/components/ui/*`. `cn()` comes from shadcn's `cn` package (re-exported by `src/lib/utils.ts`), not clsx + tailwind-merge.
- `@/*` maps to `src/*` (set in both `tsconfig.json` and `tsconfig.app.json`, and in `vite.config.ts`).
- Run commands from within `frontend/constella-frontend/`:
  - Dev server: `npm run dev`
  - Build (type-checks first): `npm run build`
  - Lint: `npm run lint` (oxlint). The one expected warning is `only-export-components` in shadcn's generated `button.tsx`.
- No tests yet. Verify changes with `npm run build` and `npm run lint`.

### Structure
Dependencies point downward only: `components/*` never import from `features/*`.
- `src/index.css`: the whole theme. Constella tokens (Day on `:root`, Night on `.dark` / `[data-theme="night"]`), shadcn variables mapped onto them, and `@theme inline` so every token is a Tailwind utility (`bg-surface`, `text-ink-muted`, `bg-sky`, `bg-star-soft`, `shadow-pop`, `bg-comm-3` …). Custom keyframes (`star-in`, `edge-draw`, `signal`, `packet-x/y`, `grow-x`, `recede`) live here too.
- `src/components/`: reusable, text-free pieces.
  - `graph/`: `ConstellationGraph` (SVG network; props for fixed `positions`, `interactive`, `labels`), `clusterLayout` / `pairsOf` (pure), `SkyDust`. Node/edge types are modelled on the API's `/network` response but use string ids and camelCase (`coOrders`); API data will need an adapter.
  - `assistant/`: `AskBar` (display-only), `CampaignCard`.
  - `charts/LiftDotPlot` (a real `<table>`; `marker="rocket"` option), `brand/` (`Logo`, `Icon`, `GenMark`, `Rocket`, `RocketGlyph`), `layout/Section`, `motion/CountUp`, `ui/` (shadcn).
  - `charts/WeekTrend` (a week on the sky as a line of stars; days are a radio group), `charts/RankList`, `assistant/DataRef` (a figure in generated text with a tooltip naming its source), `layout/AppShell` (sidebar that collapses to an icon rail from `md`, drawer below it; hidden when printing).
  - `graph/NetworkGraph`: the full-size network canvas. It measures its container (`useElementSize`) so text stays at true px; positions are 0…1 from `graph/layout.ts` (`forceLayout`, `radialLayout`). Nodes and pairs are both selectable; the caller paints nodes (`tone`: community, `rest`, `ink`, `dim`) and pairs. `graph/analysis.ts` holds pure `articulationPoints`, `components`, `bridgePairs`, `egoNetwork` (relative imports only, so they run under plain Node).
  - `charts/HeatMap` (pair matrix, discrete navy bins, keyboard grid), `charts/WeekBars`, `charts/ResultTrend` (actual vs expected on the sky), `charts/Sparkline`, `charts/LiftMeter`, `charts/Change` (▲/▼ %).
  - `controls/`: `SegmentedControl`, `SelectField`, `PickList` (searchable multi-pick in a popover), `field.ts` (the filled, underlined text field). All built on `radix-ui` primitives, not generated shadcn files.
  - `assistant/`: also `Composer` (the working ask field), `GenText` + `Segment` (generated text with sourced figures), `QueryTrace`, `SuggestedQuestions`.
- `src/hooks/`: `useInView`, `useTimeline` (elapsed ms for scripted animations; restarts on a new `runKey`), `useMediaQuery`, `useScrolled`, `useHashRoute`, `useElementSize`.
- `src/data/`: the store's data from the API (`api.ts` is the typed client; Vite proxies `/api` to `localhost:8000`, override with `VITE_API_PROXY`; `VITE_TENANT_KEY` picks another store). `store.ts` loads the store, catalog, 12 weeks of sales, the 90-day network, segments and Home's last two weeks with a **top-level await**, so pages read it synchronously; `networks.ts` does the same for every period × segment network (`getNetwork`, `segmentAffinity`) and is imported only by Network, Constella AI and the report, so Home doesn't wait for it. Only lazy-loaded signed-in pages import these modules, so the landing page never waits; a failed load shows `AppPage`'s error panel. Product ids are SKUs; each product keeps its community from the 90-day network, so colours don't change with filters. `status.ts` is the sidebar's own light fetch of the store's name and freshness. `campaigns.ts` is still an in-memory mock (`useCampaigns`, `addCampaign` …) shared by Constella AI and Campaigns; it resets on reload, its seeds use Harbor Street SKUs, and their dates sit around "today" (the day after the data's last complete day).
- Routing is hash-based with no router dependency: `#/<page>` opens the app (`features/app/AppPage`), anything else (including landing anchors like `#network`) shows the landing page. Pages take parameters (`lib/route.ts`: `parseRoute`, `appHref`): `#/network?product=HS-COFFEE`, `#/network?view=communities`, `#/products?product=…`, `#/ask?q=…` (asks straight away), `#/campaigns?campaign=…`, `#/report?period=…&segment=…`. `#/communities` opens Network's community view. Every page is lazy-loaded (they all wait for the data).
- `src/features/app/`: the signed-in frame (nav, account, page routing); copy in its `content.ts`.
- `src/features/home/`: the home page (7-day trend, AI overview, top sellers). Its `content.ts` builds all three from the last 7 complete days against the 7 before; the overview's text (rising pair, falling pair, discount opportunity) is generated from those figures.
- `src/features/network/`: whole store or chosen products (up to 3; their partners and the pairs between partners), period and RFM filters, three views (Pairs, Bridges = articulation points, Communities), node and pair cards, AI insights. `model.ts` derives what's drawn; `insights.ts` writes the insights from it, so text always matches the canvas.
- `src/features/products/`: sortable product table with trends, detail pane (sheet below `lg`), pair heat map.
- `src/features/ask/`: Constella AI. `engine.ts` is the scripted stand-in: it recognises intent, products (by name and distinctive words, built from the catalog) and communities (by their generated labels), and answers from `data/`; suggested questions in `content.ts` name the store's own best seller and communities. `conversation.ts` keeps the chat in memory across pages. Campaign drafts can be saved to Campaigns.
- `src/features/report/`: the business report (`#/report`), written from the data after a short "writing" sequence; printable.
- `src/features/campaigns/`: list, detail with results on the sky, create/edit/schedule form, pause/resume/end.
- `src/features/landing/`: one file per section, composed in `LandingPage.tsx`. **All copy and sample data live in `content.ts`**; the sample network there is the same small grocery store everywhere (hero graph, chat demo, workflow, lift chart), so figures in copy must match its `edges`.

### Conventions
- Visual rules: navy `action` is the one bold fill (primary buttons); peach `star` means *selected* (the picked product, the active chip or step, the selected segment of a `SegmentedControl`); the graph always renders on the navy `sky` in Night values; neutrals are peach-tinted. Each page has one bold element on the sky (Home's week, Network's canvas, a campaign's results) or, on Products, the heat map. Gradients stay on graph nodes; the heat map uses discrete steps. Sentence case, tabular numbers, formats from `lib/format.ts` (`1,902`, `$48,210`, `3.62×`). Button shape comes from `features/landing/styles.ts`.
- Motion: CSS keyframes plus `tw-animate-css` classes; no animation library. Every animation respects reduced motion (`motion-reduce:` classes, or `prefersReducedMotion()` to show the finished state and skip auto-play). Auto-playing demos play once and stop on any interaction.
- No layout shift: content that grows or changes while animating reserves its final size. The hero readout and the chat demo render invisible "ghost" copies of every state in the same grid cell (`[grid-area:1/1]`) and play the live one on top; controls that appear later use `invisible` rather than mounting.
- Responsive down to ~375px. Width-dependent behaviour uses `useMediaQuery` (the hero graph gets a squarer canvas below `sm`; the workflow steps play on scroll below `lg`, on a timer above it).

## Git hooks (prek)

`prek.toml` configures hooks run via `prek`:
- `trailing-whitespace`, `end-of-file-fixer`, `check-added-large-files` (builtin hooks)
- `ruff check --fix` and `ruff format`, triggered by changes under `backend/**/*.py`. They run as `uv run --directory backend ...` because the uv project lives in `backend/`, not the repo root.
- No hook runs on `frontend/` yet (no lint or format hook); CI lints and builds it.

Install the hooks with `prek install`; run them on everything with `prek run --all-files`.

## CI (GitHub Actions)

`.github/workflows/ci.yml` is the entry point: it runs on PRs into `main`, pushes to `main` and manually, and owns the triggers and concurrency (a new push cancels an in-progress PR run; runs on `main` are never cancelled). Its jobs run in parallel:
- `hooks` (inline): `prek run --all-files` (pinned prek version) with `SKIP=ruff-check,ruff-format`, since `backend.yml` owns ruff. Any other hook added to `prek.toml` runs in CI automatically.
- `backend` → `backend.yml` (reusable, `workflow_call`): a postgres:17 service for the fixture warehouse, then `uv sync --locked` (fails if `uv.lock` is stale), `ruff check` (inline PR annotations), `ruff format --check`, `pytest`. Python comes from `backend/.python-version` (3.14, matching `requires-python`).
- `frontend` → `frontend.yml` (reusable): Node 22, `npm ci`, `npm run lint`, `npm run build`.
- `ci-passes`: passes only if every job above succeeded (a skipped job fails it). It's the single check to require in branch protection, so jobs can be added or renamed without touching repo settings.

`backend.yml` and `frontend.yml` also have `workflow_dispatch`, so either can be run alone from the Actions tab. Don't give them a `concurrency` block: one that matches the caller's group deadlocks. Actions are pinned to commit SHAs with the release in a trailing comment (`# v7.0.1`); update both together.
