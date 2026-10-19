# Campaign Management Page (MVP) — Breakdown

Tech plan: ./tech-plan.md
Last updated: 2026-10-19

## Overview
4 issues in 3 waves. Max parallelism is 2 (wave 1: backend endpoints and the frontend read view). Critical path: I1 → I3 → I4.

The feature is a little over one PR: a new database, three endpoints with tests, and a new page with mutations. Splitting along the API contract lets backend and frontend proceed in parallel. Splitting the board into a read view and its actions keeps each frontend PR reviewable.

## Waves
- Wave 0: I1 — App database, shared contracts and docs
- Wave 1: I2, I3 (parallel)
- Wave 2: I4

## Coverage
| Requirement | Issues |
|---|---|
| FR1 / AC1 (stored campaign fields) | I1 (table), I2 (served) |
| FR2 / AC1 (mock seed) | I1 |
| FR3 / AC2 (cards, newest first) | I2 (order), I3 (cards) |
| FR4 / AC3 (status tabs) | I3 |
| FR5 / AC4, AC5 (activate) | I2 (rule + persistence), I4 (UI) |
| FR6 / AC5, AC6, AC7 (close + confirm) | I2 (rule + persistence), I4 (UI + dialog) |
| FR7 / AC8 (manage coming soon) | I3 |
| FR8 / AC9, AC10 (errors, invalid transitions) | I2 (404/409), I4 (UI) |
| FR8, FR9 / AC11 (load error, loading) | I3 |
| FR9 / AC12 (empty states) | I3 |

## Issue graph
```json
{
  "feature": "campaign-management",
  "issues": [
    {"id": "I1", "title": "App database, shared contracts and docs", "depends_on": [],
     "touches": ["backend/app/app_db/__init__.py", "backend/app/app_db/__main__.py", "backend/app/app_db/schema.sql", "backend/app/app_db/seed.sql",
                 "backend/app/config.py", "backend/app/main.py", "backend/app/db.py", "backend/app/schemas.py", "backend/.env.example",
                 "backend/tests/app_db_fixture.py", "backend/tests/conftest.py", "backend/tests/test_app_db.py",
                 "frontend/constella-frontend/src/data/api.ts", "frontend/constella-frontend/src/features/campaigns/content.ts",
                 "CLAUDE.md", "README.md"]},
    {"id": "I2", "title": "Campaign API: list, activate, close", "depends_on": ["I1"],
     "touches": ["backend/app/app_db/campaigns.py", "backend/app/services/campaigns.py", "backend/app/api/v1/campaigns.py",
                 "backend/app/api/v1/__init__.py", "backend/tests/test_campaigns.py"]},
    {"id": "I3", "title": "Campaign board: card grid, tabs and states", "depends_on": ["I1"],
     "touches": ["frontend/constella-frontend/src/features/campaigns/CampaignBoard.tsx", "frontend/constella-frontend/src/features/campaigns/ProposalCard.tsx",
                 "frontend/constella-frontend/src/features/campaigns/ProposalStatusBadge.tsx", "frontend/constella-frontend/src/features/campaigns/useCampaignBoard.ts",
                 "frontend/constella-frontend/src/features/campaigns/CampaignsPage.tsx", "frontend/constella-frontend/src/features/campaigns/LegacyCampaignsPage.tsx",
                 "frontend/constella-frontend/src/features/app/AppPage.tsx"]},
    {"id": "I4", "title": "Campaign board: activate and close actions", "depends_on": ["I3"],
     "touches": ["frontend/constella-frontend/src/features/campaigns/CampaignBoard.tsx", "frontend/constella-frontend/src/features/campaigns/ProposalCard.tsx",
                 "frontend/constella-frontend/src/features/campaigns/useCampaignBoard.ts"]}
  ]
}
```

## Issues

### I1: App database, shared contracts and docs — CSA-23
- **Wave:** 0 · **Depends on:** — · **Estimate:** M
- **Why:** Campaigns need a writable store, and the API today only reads the warehouse as `api_reader` (FR1, FR2, AC1). This issue also pins every shared contract (Pydantic schemas, TS types, API client calls, UI copy), so I2 and I3 can be built in parallel without touching the same files.
- **Scope:**
  - **App DB package** `backend/app/app_db/`:
    - `app_pool()` and `close_app_pool()`, a cached `ConnectionPool` on `settings().app_database_url`, like `db.pool()`.
    - `get_app_db()`, which yields a connection inside one transaction and raises `503 {"code": "app_db_not_configured", ...}` when `APP_DATABASE_URL` is unset. `AppDbDep`.
    - `init(conn)`, which applies `schema.sql` then `seed.sql`.
    - `__main__.py`, so `uv run --env-file .env python -m app.app_db init` works.
  - **`schema.sql`**: the `app.campaigns` table exactly as in the tech plan's Data model, idempotent.
  - **`seed.sql`**: 7 `harbor-street` rows (3 proposed, 2 active, 2 closed), distinct `created_at` over the last 14 days, the Harbor Street SKUs/names from the tech plan, unique discount codes. Inserts only when the tenant has no rows.
  - **Config**: `Settings.app_database_url: str | None` from `APP_DATABASE_URL`. `main.py` lifespan also calls `close_app_pool()`. `.env.example` documents `APP_DATABASE_URL` and the `init` step.
  - **`app/db.py`**: `Db` gains `tenant_key: str` (the resolved header or default key), set in `get_db`.
  - **`app/schemas.py`**: `CampaignStatus`, `CampaignProduct`, `CampaignOut`.
  - **Tests**:
    - `tests/app_db_fixture.py` builds `constella_app_test` on `TEST_POSTGRES_URL` (drop/create, `init`) and returns its URL.
    - `conftest.py` sets `APP_DATABASE_URL` before importing the app.
    - `tests/test_app_db.py` covers the seed and its idempotency.
  - **Frontend contracts**:
    - In `src/data/api.ts`: `ApiCampaignStatus`, `ApiCampaignProduct`, `ApiCampaign`, plus `api.campaigns.{list, activate, close}`. The POSTs send body `{}`.
    - In `src/features/campaigns/content.ts`: a `board` copy object with page title/summary, tab labels, card labels, button labels, the close dialog, the coming-soon text, the error texts and the empty/loading texts.
  - **Docs**: the CLAUDE.md backend section (app DB, `APP_DATABASE_URL`, `init`, campaign endpoints, the `app_db` layer next to `repository.py`) and the README run steps.
- **Out of scope:** repository queries, the service and routes (I2). Any React component or route change (I3, I4).
- **Contract:**
  ```python
  # app/db.py
  @dataclass(frozen=True)
  class Db: conn: psycopg.Connection; tenant_id: UUID; tenant_key: str
  # app/app_db/__init__.py
  def app_pool() -> ConnectionPool; def close_app_pool() -> None
  def get_app_db() -> Iterator[psycopg.Connection]; AppDbDep = Annotated[psycopg.Connection, Depends(get_app_db)]
  def init(conn: psycopg.Connection) -> None
  # app/schemas.py
  CampaignStatus = Literal["proposed", "active", "closed"]
  class CampaignProduct(BaseModel): sku: str; name: str
  class CampaignOut(BaseModel): id: UUID; title: str; products: list[CampaignProduct]; slogan: str
      discount_pct: int; discount_code: str; target_segment: str; status: CampaignStatus; created_at: datetime
  ```
  ```ts
  export type ApiCampaignStatus = "proposed" | "active" | "closed"
  export interface ApiCampaignProduct { sku: string; name: string }
  export interface ApiCampaign { id: string; title: string; products: ApiCampaignProduct[]; slogan: string
    discount_pct: number; discount_code: string; target_segment: string; status: ApiCampaignStatus; created_at: string }
  // on the existing exported `api` object:
  api.campaigns.list: () => Promise<ApiCampaign[]>            // GET  /campaigns
  api.campaigns.activate: (id: string) => Promise<ApiCampaign> // POST /campaigns/{id}/activate
  api.campaigns.close: (id: string) => Promise<ApiCampaign>    // POST /campaigns/{id}/close
  ```
  Table DDL: see tech plan, Data model. The HTTP endpoints these calls target are implemented in I2 (see tech plan, HTTP API).
- **Files:** `backend/app/app_db/{__init__.py,__main__.py,schema.sql,seed.sql}`, `backend/app/{config.py,main.py,db.py,schemas.py}`, `backend/.env.example`, `backend/tests/{app_db_fixture.py,conftest.py,test_app_db.py}`, `frontend/constella-frontend/src/data/api.ts`, `frontend/constella-frontend/src/features/campaigns/content.ts`, `CLAUDE.md`, `README.md`
- **Acceptance criteria:**
  - Given an empty app database, when `init` runs, then `app.campaigns` exists with 7 `harbor-street` rows (3 proposed, 2 active, 2 closed), each with every field filled and ≥ 1 product.
  - Given a seeded database where one row's status was changed, when `init` runs again, then no rows are added and the changed status is kept.
  - Given `APP_DATABASE_URL` is unset, when the API starts, then existing warehouse endpoints still work, and `get_app_db` raises `503` with code `app_db_not_configured`.
  - Given any request through `DbDep`, then `db.tenant_key` equals the `X-Tenant-Key` header, or the default tenant when it's absent. The existing API tests still pass.
  - Given the frontend, when `npm run build` and `npm run lint` run, then both pass with the new types, calls and copy in place (unused for now).
- **How to verify:** `cd backend && uv run --env-file .env pytest` (new `test_app_db.py` and the existing suite), `uv run ruff check && uv run ruff format --check`. `cd frontend/constella-frontend && npm run lint && npx tsc -b`.

### I2: Campaign API: list, activate, close — CSA-24
- **Wave:** 1 · **Depends on:** I1 · **Estimate:** M
- **Why:** The board needs to read campaigns and persist status changes, with the lifecycle rules enforced server side (FR1, FR3, FR5, FR6, FR8 / AC2, AC4–AC6, AC9, AC10).
- **Scope:**
  - **Repository** `app/app_db/campaigns.py` (the only SQL against `app.*`): `CampaignRow`, `list_campaigns`, `get_campaign`, and `transition`, a single conditional `UPDATE … RETURNING`.
  - **Service** `app/services/campaigns.py`: `ALLOWED` transitions, `list_campaigns`, and `change_status`, which returns 404 if missing (or another store's) and 409 `invalid_transition` if the status doesn't allow it.
  - **Routes** `app/api/v1/campaigns.py`: `GET /campaigns`, `POST /campaigns/{campaign_id}/activate` and `POST /campaigns/{campaign_id}/close`, each taking `DbDep` (for the tenant) and `AppDbDep`. Register the router in `app/api/v1/__init__.py`.
  - **Tests** in `tests/test_campaigns.py`.
- **Out of scope:** schema, seed, pool, config, Pydantic models (I1). Any frontend work (I3, I4).
- **Contract:**
  | Method & path | Success | Errors |
  |---|---|---|
  | `GET /api/v1/campaigns` | `200 CampaignOut[]`, `created_at desc` (ties by id); `[]` if none | `404` unknown tenant; `503 app_db_not_configured` |
  | `POST /api/v1/campaigns/{id}/activate` | `200 CampaignOut` with `status: "active"` | `404 "Unknown campaign: <id>"`; `409 {"code": "invalid_transition", "message": "This campaign is <status>; it can't be activated."}`; `422` bad UUID; `503` |
  | `POST /api/v1/campaigns/{id}/close` | `200 CampaignOut` with `status: "closed"` | `404`; `409 {"code": "invalid_transition", "message": "This campaign is closed already."}`; `422`; `503` |

  Allowed transitions: `proposed → active`, `proposed → closed`, `active → closed`. `closed` is final. Status changes also set `updated_at = now()`. Campaigns are scoped by `tenant_key = db.tenant_key`.
- **Files:** `backend/app/app_db/campaigns.py`, `backend/app/services/campaigns.py`, `backend/app/api/v1/campaigns.py`, `backend/app/api/v1/__init__.py`, `backend/tests/test_campaigns.py`
- **Acceptance criteria:**
  - Given the seeded app DB, when `GET /api/v1/campaigns` is called, then it returns all 7 harbor-street campaigns as `CampaignOut`, newest first. A tenant with no campaigns gets `[]`.
  - Given a proposed campaign, when `POST …/activate` is called, then it returns `200` with `status: "active"`, and a following `GET` shows it active. The same holds for `POST …/close` on a proposed or active campaign, which returns `status: "closed"`.
  - Given an active or closed campaign, when `POST …/activate` is called, then it returns `409 invalid_transition` and the status is unchanged. Likewise `POST …/close` on a closed campaign.
  - Given an unknown id (or another store's campaign), when activate or close is called, then it returns `404`. A malformed id returns `422`.
- **How to verify:** `cd backend && uv run --env-file .env pytest tests/test_campaigns.py` and the full suite. `uv run ruff check && uv run ruff format --check`. Manually: `init` against a local app DB, run the dev server, and exercise the endpoints in `/docs`. Tests must reset any rows they change (or use their own tenant key) so they stay order-independent.

### I3: Campaign board: card grid, tabs and states — CSA-25
- **Wave:** 1 · **Depends on:** I1 · **Estimate:** M
- **Why:** A marketing specialist needs to see constella-ai campaigns and their status at a glance (FR3, FR4, FR7, FR8 load error, FR9 / AC2, AC3, AC8, AC11, AC12).
- **Scope:**
  - **Route switch**: rename `CampaignsPage.tsx` → `LegacyCampaignsPage.tsx` (export `LegacyCampaignsPage`, unchanged behavior). In `AppPage.tsx`, `campaigns` renders `LegacyCampaignsPage` when `params.has("campaign")`, else the new `CampaignBoard`. Both stay lazy-loaded.
  - **`useCampaignBoard.ts`**: the loading / error / ready state from `api.campaigns.list()`, plus `reload()`, `notice` and `showComingSoon()`. Expose `activate`, `close` and `pending` with the final signatures, but as no-op stubs (I4 implements them).
  - **`CampaignBoard.tsx`**:
    - The page header and `SegmentedControl` tabs (All / Proposed / Active / Closed, each with its count, default All).
    - A responsive card grid in `created_at desc` order.
    - The loading state, a load-error panel with a retry (`reload`), and an empty state per tab.
    - An `aria-live="polite"` notice region.
  - **`ProposalCard.tsx`**:
    - Shows title, `ProposalStatusBadge`, every product name, slogan, `` `${discount_pct}% off` ``, discount code and target segment.
    - Activate / Close / Manage buttons, calling props. Enabled states follow the rules in the contract below.
    - Manage calls `onManage`.
  - **`ProposalStatusBadge.tsx`**: Proposed / Active / Closed. Active uses `bg-positive-soft text-positive` with a dot, like the legacy `StatusBadge`.
  - Uses copy from `content.ts` `board` (from I1). Follow CLAUDE.md visual rules (navy `action` for the primary button only, peach `star` for the selected tab, sentence case, responsive to ~375px, `motion-reduce:` on any animation).
- **Out of scope:** making Activate/Close do anything and the close confirmation dialog (I4). Backend (I2). Editing `api.ts` or `content.ts` (I1 owns them; if copy is missing, add it in I4 or ask).
- **Contract:**
  ```ts
  type BoardState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; campaigns: ApiCampaign[] }
  export function useCampaignBoard(): {
    state: BoardState; pending: ReadonlySet<string>; notice: { tone: "info" | "error"; text: string } | null
    activate(id: string): Promise<void>; close(id: string): Promise<void>; showComingSoon(): void; reload(): void }
  // ProposalCard props
  { campaign: ApiCampaign; pending: boolean; onActivate(): void; onClose(): void; onManage(): void }
  ```
  Activate is enabled iff `status === "proposed" && !pending`, Close iff `status !== "closed" && !pending`, Manage always. `CampaignBoard` must not import `data/store.ts` or `data/networks.ts`.
- **Files:** `frontend/constella-frontend/src/features/campaigns/{CampaignBoard.tsx,ProposalCard.tsx,ProposalStatusBadge.tsx,useCampaignBoard.ts,LegacyCampaignsPage.tsx}` (and removal of `CampaignsPage.tsx`), `frontend/constella-frontend/src/features/app/AppPage.tsx`
- **Acceptance criteria:**
  - Given the API returns campaigns, when the user opens `#/campaigns`, then each campaign is a card, newest first, showing title, status badge, all product names, slogan, "N% off", discount code and target segment.
  - Given the board is open, when the user selects the Active tab, then only active campaigns show, and each tab shows its count. Selecting All shows everything. A tab with no campaigns shows the empty state.
  - Given any card, when the user clicks Manage, then a "coming soon" notice is announced and nothing else changes. Given an active card, Activate is disabled. Given a closed card, Activate and Close are disabled.
  - Given the list is loading, then a loading state shows. Given the request fails, then an error panel with Retry shows instead of cards.
  - Given a link `#/campaigns?campaign=<mock id>` from Constella AI, then the legacy page opens as before.
- **How to verify:** `cd frontend/constella-frontend && npm run lint && npm run build`. Manually with the backend from I2 running, or by temporarily pointing `VITE_API_BASE` at a stub: check each AC at desktop and 375px widths, plus light/dark and reduced motion.

### I4: Campaign board: activate and close actions — CSA-26
- **Wave:** 2 · **Depends on:** I3 · **Estimate:** S
- **Why:** Specialists need to start and end campaigns, with the change persisted and failures handled visibly (FR5, FR6, FR8 / AC4–AC7, AC9, AC10).
- **Scope:**
  - **`useCampaignBoard`**: implement `activate(id)` and `close(id)`:
    - Add the id to `pending` and call `api.campaigns.activate` / `api.campaigns.close`.
    - On success, replace that campaign in state with the response. **Not optimistic.**
    - On `ApiError`, set an error `notice` and leave the card unchanged. On `409`, also re-fetch the list so the card shows its real status.
    - Always remove the id from `pending`.
  - **`ProposalCard`**: Close opens a `radix-ui` `AlertDialog` (follow `CampaignDetail.tsx:187-207`) with the I1 copy. Confirm calls `onClose`; Cancel does nothing. Activate calls `onActivate` directly.
  - **`CampaignBoard`**: wire `activate`, `close` and `pending` into each card.
- **Out of scope:** backend changes (I2). New copy beyond what I1 added (if something is missing, add it to `content.ts` and say so in the PR). Optimistic updates, undo, reopening closed campaigns.
- **Contract:** consumes `api.campaigns.activate(id)` / `api.campaigns.close(id)` from `api.ts` (I1), and the I2 behavior: `200 CampaignOut`, `409 {"code": "invalid_transition"}`, `404`. Keeps the `useCampaignBoard` and `ProposalCard` signatures from I3 unchanged.
- **Files:** `frontend/constella-frontend/src/features/campaigns/{useCampaignBoard.ts,ProposalCard.tsx,CampaignBoard.tsx}`
- **Acceptance criteria:**
  - Given a proposed card, when the user clicks Activate, then the card shows Active once the API answers, and it is still Active after a reload. Its buttons are disabled while the request is in flight.
  - Given a proposed or active card, when the user clicks Close and confirms, then the card shows Closed and stays Closed after a reload. When they cancel instead, nothing is sent and nothing changes.
  - Given the API fails (network or 5xx), when the user activates or confirms close, then an error notice is announced and the card keeps its previous status.
  - Given the campaign was changed elsewhere (API answers 409), when the user acts on it, then an error notice is shown and the card refreshes to its real status.
- **How to verify:** `cd frontend/constella-frontend && npm run lint && npm run build`. Manually against the I2 backend: activate, close, cancel, and reload persistence. Stop the backend to see the failure notice. Change a row with `psql` and then act on the stale card to see the 409 behavior.
