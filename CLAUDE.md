# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Constellate is a sales analytics platform focused on product network analysis (which products are bought together, clusters, central products), plus an AI layer ("Constella AI") that turns the network into strategy: answers, bundles, discount campaigns and slogans. `backend/` has a working FastAPI API. `frontend/constella-frontend/` has the marketing landing page and the signed-in app: Home, Network (with communities inside it), Products, Constella AI (chat, campaign drafts, one-click business report) and Campaigns. Everything runs on mock data and doesn't call the API yet, and the AI is simulated: a scripted engine writes answers from the mock data (the agent isn't built). `plan.md` holds the full target design (Postgres warehouse built by dbt, React + Sigma.js frontend); it doesn't cover the AI features yet.

There is **no database yet**. The API reads from `app/sample_data.py`, an in-memory, deterministic (seeded) stand-in shaped like the planned dbt mart tables (`daily_orders`, `daily_product_stats`, `daily_pair_stats` with `product_a < product_b`). Its baskets are generated from themed product groups, so tests rely on those clusters showing up as communities.

## Setup

```bash
brew install uv    # Python package/env manager for backend/
brew install prek  # git hook runner (Rust rewrite of pre-commit)
```

The frontend needs Node 22.12+ (`@rolldown/plugin-babel` requires it) and uses npm (there's a `package-lock.json`; `plan.md` says pnpm, but npm is what's in use).

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
- `src/data/`: mock data standing in for the API. `store.ts` is one store (Harbor Street Market): 30 products in 5 communities, 12 weeks of sales, 90 days of pairs, plus `getNetwork(period, segment)` which rescales the pairs for a period and RFM segment with seeded variation. Its last two weeks match Home's top sellers. `campaigns.ts` is an in-memory store (`useCampaigns`, `addCampaign` …) shared by Constella AI and Campaigns; it resets on reload. Replacing mock data with the API means rewriting these behind the same shapes.
- Routing is hash-based with no router dependency: `#/<page>` opens the app (`features/app/AppPage`), anything else (including landing anchors like `#network`) shows the landing page. Pages take parameters (`lib/route.ts`: `parseRoute`, `appHref`): `#/network?product=coffee`, `#/network?view=communities`, `#/products?product=…`, `#/ask?q=…` (asks straight away), `#/campaigns?campaign=…`, `#/report?period=…&segment=…`. `#/communities` opens Network's community view. Pages other than Home are lazy-loaded.
- `src/features/app/`: the signed-in frame (nav, account, page routing); copy in its `content.ts`.
- `src/features/home/`: the home page (7-day trend, AI overview, top sellers). Its `content.ts` holds the mock week; the AI overview's figures are written out, so they must match that data.
- `src/features/network/`: whole store or chosen products (up to 3; their partners and the pairs between partners), period and RFM filters, three views (Pairs, Bridges = articulation points, Communities), node and pair cards, AI insights. `model.ts` derives what's drawn; `insights.ts` writes the insights from it, so text always matches the canvas.
- `src/features/products/`: sortable product table with trends, detail pane (sheet below `lg`), pair heat map.
- `src/features/ask/`: Constella AI. `engine.ts` is the scripted stand-in (recognises intent, products and communities; answers from `data/`); `conversation.ts` keeps the chat in memory across pages. Campaign drafts can be saved to Campaigns.
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
- Nothing runs on `frontend/` yet (no lint or format hook).

Install the hooks with `prek install`; run them on everything with `prek run --all-files`.
