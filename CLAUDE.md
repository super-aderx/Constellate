# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Constellate is a sales analytics platform focused on product network analysis (which products are bought together, clusters, central products), plus an AI layer ("Constella AI") that turns the network into strategy: answers, bundles, discount campaigns and slogans. `backend/` has a working FastAPI API. `frontend/constella-frontend/` has the marketing landing page only; it runs on sample data and doesn't call the API yet, and the AI features it shows are simulated (the agent isn't built). `plan.md` holds the full target design (Postgres warehouse built by dbt, React + Sigma.js frontend); it doesn't cover the AI features yet.

There is **no database yet**. The API reads from `app/sample_data.py`, an in-memory, deterministic (seeded) stand-in shaped like the planned dbt mart tables (`daily_orders`, `daily_product_stats`, `daily_pair_stats` with `product_a < product_b`). Its baskets are generated from themed product groups, so tests rely on those clusters showing up as communities.

## Setup

```bash
brew install uv    # Python package/env manager for backend/
brew install prek  # git hook runner (Rust rewrite of pre-commit)
```

The frontend needs Node 20+ and uses npm (there's a `package-lock.json`; `plan.md` says pnpm, but npm is what's in use).

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
  - `graph/`: `ConstellationGraph` (SVG network; props for fixed `positions`, `interactive`, `labels`), `clusterLayout` / `pairsOf` (pure), `SkyDust`. Node/edge types mirror the API's `/network` response.
  - `assistant/`: `AskBar` (display-only), `CampaignCard`.
  - `charts/LiftDotPlot` (a real `<table>`; `marker="rocket"` option), `brand/` (`Logo`, `Icon`, `GenMark`, `Rocket`, `RocketGlyph`), `layout/Section`, `motion/CountUp`, `ui/` (shadcn).
- `src/hooks/`: `useInView`, `useTimeline` (elapsed ms for scripted animations; restarts on a new `runKey`), `useMediaQuery`, `useScrolled`.
- `src/features/landing/`: one file per section, composed in `LandingPage.tsx`. **All copy and sample data live in `content.ts`**; the sample network there is the same small grocery store everywhere (hero graph, chat demo, workflow, lift chart), so figures in copy must match its `edges`.

### Conventions
- Visual rules: navy `action` is the one bold fill (primary buttons); peach `star` means *selected* (the picked product, the active chip or step); the graph always renders on the navy `sky` in Night values; neutrals are peach-tinted. Sentence case, tabular numbers, formats from `lib/format.ts` (`1,902`, `$48,210`, `3.62×`). Button shape comes from `features/landing/styles.ts`.
- Motion: CSS keyframes plus `tw-animate-css` classes; no animation library. Every animation respects reduced motion (`motion-reduce:` classes, or `prefersReducedMotion()` to show the finished state and skip auto-play). Auto-playing demos play once and stop on any interaction.
- No layout shift: content that grows or changes while animating reserves its final size. The hero readout and the chat demo render invisible "ghost" copies of every state in the same grid cell (`[grid-area:1/1]`) and play the live one on top; controls that appear later use `invisible` rather than mounting.
- Responsive down to ~375px. Width-dependent behaviour uses `useMediaQuery` (the hero graph gets a squarer canvas below `sm`; the workflow steps play on scroll below `lg`, on a timer above it).

## Git hooks (prek)

`prek.toml` configures hooks run via `prek`:
- `trailing-whitespace`, `end-of-file-fixer`, `check-added-large-files` (builtin hooks)
- `ruff check --fix` and `ruff format`, triggered by changes under `backend/**/*.py`. They run as `uv run --directory backend ...` because the uv project lives in `backend/`, not the repo root.
- Nothing runs on `frontend/` yet (no lint or format hook).

Install the hooks with `prek install`; run them on everything with `prek run --all-files`.
