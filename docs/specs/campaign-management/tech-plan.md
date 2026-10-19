# Campaign Management Page (MVP) — Technical Plan

Requirements: ./requirements.md
Last updated: 2026-10-19

## Summary
Constellate gets its own small Postgres **app database**, separate from the read-only warehouse. It holds one table, `app.campaigns`, created and seeded with mock constella-ai proposals by an idempotent init command (plain SQL, no new dependencies). The FastAPI backend gets a second connection pool for it and three endpoints: list campaigns, activate one, close one. They follow the existing routes → services → repository layering, and the status rules live in the service. On the frontend, `#/campaigns` opens a new card grid that loads from the API. It has All / Proposed / Active / Closed tabs, Activate / Close (with confirmation) / Manage ("coming soon"), plus loading, empty and error states. The existing in-memory mock Campaigns page stays in the code and is only shown when a `?campaign=` deep link from Constella AI asks for it.

## Codebase context
- **Backend layering** (CLAUDE.md, `backend/app/`): `api/v1/*` (HTTP only) → `services/*` → `repository.py` (the only SQL, against `serving.*`). The router is assembled in `app/api/v1/__init__.py`, and the app and lifespan in `app/main.py` (`close_pool()` on shutdown).
- **Warehouse connection** `backend/app/db.py`: `pool()` (cached `ConnectionPool`), `get_db` resolves the store from `X-Tenant-Key` / `CONSTELLA_DEFAULT_TENANT` via `platform.tenants` (unknown → 404) and yields `Db(conn, tenant_id)` inside one transaction. `DbDep` is what routes take.
- **Settings** `backend/app/config.py`: a frozen `Settings` dataclass built from env in `settings()`.
- **Errors**: AI routes return `detail: {code, message}` (`app/ai/errors.py`), and the tenant lookup returns `detail: "<string>"`. The frontend `errorDetail()` in `src/data/api.ts` already parses both.
- **Tests** `backend/tests/`: `conftest.py` builds a throwaway warehouse (`warehouse_fixture.build(admin_url)`) from `TEST_POSTGRES_URL` and sets `DATABASE_URL` before importing the app. API tests use the session `client` fixture.
- **No write path exists today.** The API's only role is `api_reader`, so this feature introduces the first writable store.
- **Frontend data client** `src/data/api.ts`: `request()` supports GET and POST, throws `ApiError(status, path, message, code)`, and keeps snake_case API types (`ApiStore`, `ApiCampaignDraft`, …).
- **Existing Campaigns page** `src/features/campaigns/`: `CampaignsPage.tsx` (list + `CampaignDetail` + `CampaignForm` over the in-memory `src/data/campaigns.ts`), `StatusBadge.tsx`, copy in `content.ts`. Routed in `src/features/app/AppPage.tsx` (`campaigns: () => <CampaignsPage key={route} params={params} />`, lazy-loaded). Constella AI links to `#/campaigns?campaign=<mock id>`.
- **UI building blocks to reuse**: `components/controls/SegmentedControl` (the existing filter tabs), `components/ui/button`, `AlertDialog` from `radix-ui` (the pattern in `CampaignDetail.tsx:187-207`), `aria-live="polite"` for status text, tokens such as `bg-surface-raised`, `bg-positive-soft`, `text-ink-muted`. Copy goes in `content.ts`, formats in `lib/format.ts`.
- **Mock data source**: Harbor Street SKUs and names (`HS-COFFEE` "Ground Coffee", `HS-FILTERS` "Coffee Filters", `HS-OAT` "Oat Milk", `HS-PASTA` "Spaghetti", `HS-SAUCE` "Tomato Sauce", `HS-PARMESAN` "Parmesan", `HS-CHIPS` "Tortilla Chips", `HS-SALSA` "Salsa", `HS-GUAC` "Guacamole", `HS-BREAD` "Sourdough Bread", `HS-EGGS` "Eggs (12)", `HS-MILK` "Whole Milk"), the same ones used in `tests/warehouse_fixture.py` and the frontend mock.

## Components

```mermaid
flowchart LR
  subgraph Frontend
    AP[AppPage route campaigns] -->|no ?campaign| CB[CampaignBoard NEW]
    AP -->|?campaign=id| LCP[LegacyCampaignsPage renamed]
    CB --> PC[ProposalCard NEW]
    CB --> UC[useCampaignBoard NEW]
    UC --> API[data/api.ts + campaign calls]
  end
  subgraph Backend
    R[api/v1/campaigns.py NEW] --> S[services/campaigns.py NEW]
    S --> CR[app_db/campaigns.py NEW]
    R --> DB[db.py DbDep: tenant]
    CR --> ADB[app_db pool NEW]
  end
  API -->|/api/v1/campaigns| R
  ADB --> PG[(app DB: app.campaigns NEW)]
  DB --> WH[(warehouse, read-only)]
```

### App database (schema, seed, connection)
- Responsibility: own the `app.campaigns` table, seed mock proposals, and provide a per-request read/write transaction.
- Location:
  - `backend/app/app_db/__init__.py` (new): `app_pool()`, `close_app_pool()`, `get_app_db()`, `AppDbDep`
  - `backend/app/app_db/schema.sql` (new), `backend/app/app_db/seed.sql` (new)
  - `backend/app/app_db/__main__.py` (new): `uv run --env-file .env python -m app.app_db init`
  - `backend/app/config.py` (modified: `app_database_url`), `backend/app/main.py` (modified: close the app pool on shutdown), `backend/.env.example` (modified)
- Requirements covered: FR1, FR2

### Campaign repository, service and routes
- Responsibility: list a store's campaigns newest first, and apply allowed status changes atomically, rejecting invalid ones.
- Location:
  - `backend/app/app_db/campaigns.py` (new repository: the only SQL against `app.*`)
  - `backend/app/services/campaigns.py` (new: transition rules, maps rows to schemas)
  - `backend/app/api/v1/campaigns.py` (new routes), `backend/app/api/v1/__init__.py` (modified: include router)
  - `backend/app/schemas.py` (modified: `CampaignStatus`, `CampaignProduct`, `CampaignOut`)
  - `backend/app/db.py` (modified: `Db` gains `tenant_key`)
- Requirements covered: FR1, FR3 (data and order), FR5, FR6, FR8 (server side: 404 / 409)

### Backend tests
- Responsibility: a throwaway app database for tests, plus API tests for list and transitions.
- Location: `backend/tests/app_db_fixture.py` (new), `backend/tests/conftest.py` (modified: also builds the app DB and sets `APP_DATABASE_URL`), `backend/tests/test_campaigns.py` (new)
- Requirements covered: verifies FR1, FR2, FR3, FR5, FR6, FR8

### Campaign board (frontend)
- Responsibility: the new `#/campaigns` view, with the card grid, status tabs, actions, confirmation, notices, and loading / empty / error states.
- Location:
  - `src/data/api.ts` (modified: campaign types + `api.campaigns.{list, activate, close}`)
  - `src/features/campaigns/useCampaignBoard.ts` (new: load state + actions)
  - `src/features/campaigns/CampaignBoard.tsx` (new page)
  - `src/features/campaigns/ProposalCard.tsx` (new: card, its buttons, the Close `AlertDialog`)
  - `src/features/campaigns/ProposalStatusBadge.tsx` (new)
  - `src/features/campaigns/content.ts` (modified: `board` copy)
  - `src/features/campaigns/CampaignsPage.tsx` → renamed export `LegacyCampaignsPage` in `LegacyCampaignsPage.tsx`
  - `src/features/app/AppPage.tsx` (modified: route switch)
- Requirements covered: FR3, FR4, FR5, FR6, FR7, FR8, FR9

## Data model

New database owned by Constellate (dev: a `constellate` database on any local Postgres 17; reached through `APP_DATABASE_URL`).

```sql
-- backend/app/app_db/schema.sql (idempotent)
create schema if not exists app;

create table if not exists app.campaigns (
  campaign_id    uuid primary key default gen_random_uuid(),
  tenant_key     text not null,                       -- platform.tenants.tenant_key, e.g. 'harbor-street'
  title          text not null check (length(title) between 1 and 120),
  products       jsonb not null check (jsonb_typeof(products) = 'array' and jsonb_array_length(products) >= 1),
                                                      -- [{"sku": "HS-COFFEE", "name": "Ground Coffee"}, ...]
  slogan         text not null,
  discount_pct   smallint not null check (discount_pct between 1 and 100),
  discount_code  text not null,
  target_segment text not null,                       -- display label, e.g. 'Morning regulars'
  status         text not null default 'proposed' check (status in ('proposed', 'active', 'closed')),
  source         text not null default 'constella-ai',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_key, discount_code)
);

create index if not exists campaigns_tenant_created on app.campaigns (tenant_key, created_at desc);
```

**Seed** (`seed.sql`): 7 rows for `harbor-street` (3 proposed, 2 active, 2 closed), with distinct `created_at` values spread over the last 14 days so the "newest first" order is deterministic. It runs only when the tenant has no campaigns (`insert ... select ... where not exists (select 1 from app.campaigns where tenant_key = 'harbor-street')`), so re-running `init` never resets status changes. Product names are copied into `products` (the proposal snapshot), using the SKUs listed under Codebase context.

**Roles:** dev and tests connect with a role that owns the `app` schema. No grants to `api_reader`, and nothing is created in the warehouse.

## Interfaces & contracts

### Environment
| Variable | Required | Example | Used by |
|---|---|---|---|
| `APP_DATABASE_URL` | yes for campaign endpoints | `postgresql://postgres:postgres@localhost:5434/constellate` | `settings().app_database_url`, `app.app_db` |

`settings()` reads `APP_DATABASE_URL` as optional (`str | None`), so the rest of the API still starts without it. `get_app_db()` raises `HTTPException(503, detail={"code": "app_db_not_configured", "message": "The app database isn't configured (APP_DATABASE_URL)."})` when it's unset.

### Backend Python contracts
```python
# app/db.py
@dataclass(frozen=True)
class Db:
    conn: psycopg.Connection
    tenant_id: UUID
    tenant_key: str          # NEW: the resolved key (header or default)

# app/app_db/__init__.py
def app_pool() -> ConnectionPool: ...          # @cache, like db.pool()
def close_app_pool() -> None: ...
def get_app_db() -> Iterator[psycopg.Connection]: ...   # one transaction per request (conn.transaction())
AppDbDep = Annotated[psycopg.Connection, Depends(get_app_db)]
def init(conn: psycopg.Connection) -> None: ...        # applies schema.sql then seed.sql

# app/app_db/campaigns.py  (repository; returns plain dataclasses)
@dataclass(frozen=True)
class CampaignRow:
    campaign_id: UUID; tenant_key: str; title: str; products: list[dict[str, str]]
    slogan: str; discount_pct: int; discount_code: str; target_segment: str
    status: str; created_at: datetime

def list_campaigns(conn, tenant_key: str) -> list[CampaignRow]: ...          # order by created_at desc, campaign_id
def get_campaign(conn, tenant_key: str, campaign_id: UUID) -> CampaignRow | None: ...
def transition(conn, tenant_key: str, campaign_id: UUID,
               from_statuses: tuple[str, ...], to_status: str) -> CampaignRow | None: ...
    # single UPDATE ... WHERE campaign_id=%s AND tenant_key=%s AND status = ANY(%s)
    #   SET status=%s, updated_at=now() RETURNING *;  None if no row matched

# app/services/campaigns.py
ALLOWED: dict[str, tuple[str, ...]] = {"active": ("proposed",), "closed": ("proposed", "active")}
def list_campaigns(app_conn, tenant_key: str) -> list[CampaignOut]: ...
def change_status(app_conn, tenant_key: str, campaign_id: UUID, to: Literal["active", "closed"]) -> CampaignOut: ...
    # transition(); if None: get_campaign() → None ⇒ 404, else ⇒ 409 invalid_transition
```

### Schemas (`app/schemas.py`)
```python
CampaignStatus = Literal["proposed", "active", "closed"]

class CampaignProduct(BaseModel):
    sku: str
    name: str

class CampaignOut(BaseModel):
    id: UUID
    title: str
    products: list[CampaignProduct]      # ≥ 1, in proposal order
    slogan: str
    discount_pct: int                    # 1..100
    discount_code: str
    target_segment: str
    status: CampaignStatus
    created_at: datetime                 # ISO 8601 with offset
```

### HTTP API (all under `/api/v1`, all take the usual `X-Tenant-Key` header via `DbDep`)
| Method & path | Success | Errors |
|---|---|---|
| `GET /campaigns` | `200` `CampaignOut[]`, newest first (`created_at desc`). `[]` when the store has none. | `404` unknown tenant (existing). `503` `app_db_not_configured`. |
| `POST /campaigns/{campaign_id}/activate` (no body) | `200` updated `CampaignOut` (`status: "active"`) | `404` `detail: "Unknown campaign: <id>"` (missing, or another store's). `409` `detail: {"code": "invalid_transition", "message": "This campaign is <status>; it can't be activated."}`. `422` malformed UUID (FastAPI). `503` as above. |
| `POST /campaigns/{campaign_id}/close` (no body) | `200` updated `CampaignOut` (`status: "closed"`) | `404` as above. `409` `{"code": "invalid_transition", "message": "This campaign is closed already."}`. `422`, `503` as above. |

Filtering by status happens on the client. The list is small, and the tabs show counts (the same pattern as the existing page), so there's no `status` query parameter.

Example `GET /api/v1/campaigns` item:
```json
{
  "id": "3f6c2a8e-6a51-4c1e-9a43-2b7d0f3b9c11",
  "title": "Morning coffee bundle",
  "products": [{"sku": "HS-COFFEE", "name": "Ground Coffee"}, {"sku": "HS-FILTERS", "name": "Coffee Filters"}],
  "slogan": "Your morning, sorted.",
  "discount_pct": 15,
  "discount_code": "MORNING15",
  "target_segment": "Morning regulars",
  "status": "proposed",
  "created_at": "2026-10-17T09:00:00Z"
}
```

### Frontend contracts (`src/data/api.ts`)
```ts
export type ApiCampaignStatus = "proposed" | "active" | "closed"
export interface ApiCampaignProduct { sku: string; name: string }
export interface ApiCampaign {
  id: string
  title: string
  products: ApiCampaignProduct[]
  slogan: string
  discount_pct: number
  discount_code: string
  target_segment: string
  status: ApiCampaignStatus
  created_at: string
}
// grouped on the existing exported `api` object, like api.store() / api.ai.ask()
api.campaigns.list(): Promise<ApiCampaign[]>                 // GET /campaigns
api.campaigns.activate(id: string): Promise<ApiCampaign>     // POST /campaigns/{id}/activate, body {}
api.campaigns.close(id: string): Promise<ApiCampaign>        // POST /campaigns/{id}/close, body {}
```
`request()` sends a POST body only when one is given. Pass `{}` so the request carries `Content-Type: application/json` like other POSTs. The server ignores the body.

```ts
// src/features/campaigns/useCampaignBoard.ts
type BoardState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; campaigns: ApiCampaign[] }
export function useCampaignBoard(): {
  state: BoardState
  pending: ReadonlySet<string>                       // ids with a request in flight (their buttons disabled)
  notice: { tone: "info" | "error"; text: string } | null
  activate(id: string): Promise<void>                 // on success replaces the card with the response
  close(id: string): Promise<void>                    // caller has already confirmed
  showComingSoon(): void                              // Manage
  reload(): void
}
```
- Status changes are **not optimistic**. The card updates from the server response, so a failure leaves it unchanged (FR8). On a `409`, the hook re-fetches that store's list so the card shows its real status (the concurrency edge case).
- `ProposalCard` props: `{ campaign: ApiCampaign; pending: boolean; onActivate(): void; onClose(): void; onManage(): void }`. Activate is enabled only when `status === "proposed"`, Close only when `status !== "closed"`, and Manage always. The Close `AlertDialog` lives inside the card and calls `onClose` only on confirm.
- Discount renders as `` `${discount_pct}% off` ``. Products are listed by `name`, all of them, wrapping.
- Routing: in `AppPage.tsx`, `campaigns` renders `LegacyCampaignsPage` when `params.has("campaign")`, otherwise `CampaignBoard`. Both stay lazy-loaded. `CampaignBoard` must **not** import `data/store.ts` or `data/networks.ts`, so it doesn't wait on the warehouse loads.

## Decisions
- D1: **Separate app database** (`APP_DATABASE_URL`) for writable product data. Chosen because the warehouse belongs to constella-data-platform and the API's warehouse role is read-only by design (CLAUDE.md: the serving contract is the boundary). Alternatives: an `app` schema inside the warehouse (crosses the repo boundary), SQLite (a second dialect, doesn't match CI's Postgres).
- D2: **Plain SQL + an idempotent `python -m app.app_db init`**, no migration tool. Chosen because there's one table and no new dependencies. Alternative: Alembic (adds a dependency, worth it once there are several migrations). Revisit when a second table or a column change lands.
- D3: **Campaigns are keyed by `tenant_key`**, and the tenant still resolves through the warehouse's `platform.tenants` (`DbDep`), so unknown stores keep returning 404. Chosen so the seed doesn't need the warehouse's tenant UUID. Alternative: store `tenant_id` and look it up at seed time (couples `init` to the warehouse running).
- D4: **Products stored as a snapshot `[{sku, name}]`** in `jsonb`. Chosen because a constella-ai proposal is a point-in-time artifact, there's no cross-database join, and cards render without the warehouse catalog. Alternative: SKUs only, with names looked up from `serving.products` (a second query, and it breaks for retired SKUs).
- D5: **Status transitions as action endpoints** (`POST …/activate`, `POST …/close`) with one conditional `UPDATE`. Chosen because it encodes the rules server side, makes concurrent changes safe (the second request gets `409`), and fits `api.ts`, which only does GET/POST. Alternative: `PATCH /campaigns/{id} {status}` (needs PATCH support and puts transition validation in the same place anyway).
- D6: **Non-optimistic UI updates.** Chosen because FR8 requires the card to stay unchanged on failure, and a small list makes the round-trip unnoticeable.
- D7: **Keep the legacy mock page behind `?campaign=`.** Chosen so the existing Constella AI "saved to Campaigns" links keep working while the board replaces the default view. Alternative: delete the legacy page (breaks Constella AI flows, out of MVP scope).
- D8: **Manage and errors use an inline `aria-live` notice** at the top of the board instead of a toast library. Following convention: no new UI dependencies, and the existing pages use `aria-live` text.

## Risks, rollout & open questions
- **New infrastructure in dev and CI.** Developers need a database for `APP_DATABASE_URL` plus a one-time `init`. In CI, `backend.yml` already runs a postgres:17 service for `TEST_POSTGRES_URL`, and the test fixture creates `constella_app_test` there, so no workflow change is needed. Update `backend/.env.example`, the CLAUDE.md backend section (architecture and setup) and the README run steps.
- **Tests skip without `TEST_POSTGRES_URL`**, like the existing API tests. The frontend still has no test runner (CLAUDE.md), so the frontend ACs are verified by `npm run build`, `npm run lint` and manual checks in the browser.
- **No auth.** Anyone who can reach the API can change campaign status for the default store. That's acceptable for the MVP (requirements: no new roles). Revisit with sign-in.
- **Legacy and new campaign data diverge**: Constella AI drafts still go to the in-memory store and won't appear on the board. This is accepted in the requirements (out of scope), and real constella-ai integration will write to `app.campaigns`.
- **Discount codes** are unique per store at the database level. Seed codes are hand-picked, so there's no generation logic in the MVP.
- **Rollout:** no feature flag. The board replaces the default Campaigns view as soon as it ships. Rolling back is a revert of the `AppPage` route switch.
- Open questions: none blocking.
