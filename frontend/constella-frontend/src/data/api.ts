/**
 * The Constella API (backend/), which reads the warehouse's serving views. Responses keep the API's
 * snake_case shapes; `store.ts` and `networks.ts` adapt them to the app's view models.
 * Requests go to /api/v1 (proxied to the backend in dev). VITE_TENANT_KEY picks a store; without
 * it the API uses its default store.
 *
 * Failures throw `ApiError` (status 0 when the API can't be reached; `code` when the API names the
 * error, as the AI endpoints do). A request aborted through its `signal` rethrows the browser's own
 * `AbortError` instead, so callers can tell their own timeout from a failure.
 */

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1"
const TENANT = import.meta.env.VITE_TENANT_KEY as string | undefined

export class ApiError extends Error {
  readonly status: number
  readonly path: string
  /** The API's error code, when it names one (e.g. "not_configured" from the AI endpoints). */
  readonly code: string | undefined
  constructor(status: number, path: string, message: string, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.path = path
    this.code = code
  }
}

type Params = Record<string, string | number | undefined>

interface RequestOptions {
  params?: Params
  body?: unknown
  signal?: AbortSignal
}

/** The API's error detail: a message, or `{code, message}` from the AI endpoints. */
function errorDetail(body: unknown, fallback: string): { message: string; code?: string } {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === "string") return { message: detail }
  if (detail && typeof detail === "object" && "code" in detail) {
    const { code, message } = detail as { code?: unknown; message?: unknown }
    return { message: typeof message === "string" ? message : fallback, code: typeof code === "string" ? code : undefined }
  }
  return { message: fallback }
}

async function request<T>(method: "GET" | "POST", path: string, { params = {}, body, signal }: RequestOptions = {}): Promise<T> {
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) query.set(k, String(v))
  const url = `${BASE}${path}${query.size ? `?${query}` : ""}`
  const headers: Record<string, string> = TENANT ? { "X-Tenant-Key": TENANT } : {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  let response: Response
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new ApiError(0, path, "Couldn't reach the Constella API.")
  }
  if (!response.ok) {
    const { message, code } = errorDetail(await response.json().catch(() => null), response.statusText)
    throw new ApiError(response.status, path, `The Constella API answered ${response.status} for ${path}: ${message}`, code)
  }
  return (await response.json()) as T
}

const get = <T>(path: string, params: Params = {}) => request<T>("GET", path, { params })

export const post = <T>(path: string, body: unknown, { signal }: { signal?: AbortSignal } = {}) =>
  request<T>("POST", path, { body, signal })

/* ---------- Response shapes ---------- */

export interface ApiStore {
  key: string
  name: string
  timezone: string
  currency: string
  first_day: string | null
  last_complete_day: string | null
  last_event_at: string | null
  refreshed_at: string | null
}

export interface ApiSegment {
  id: string
  label: string
  description: string
  orders: number
  share: number
}

export interface ApiProduct {
  id: string
  name: string
  category_id: string
  category: string
  top_category_id: string
  top_category: string
  price: number
  status: "active" | "inactive"
}

export interface ApiNetwork {
  meta: { start: string; end: string; segment: string; total_orders: number; node_count: number; edge_count: number; truncated: boolean }
  nodes: { id: string; label: string; category: string; orders: number; revenue: number; degree: number; strength: number; community: number }[]
  edges: { source: string; target: string; co_orders: number; support: number; conf_source_to_target: number; conf_target_to_source: number; lift: number }[]
  communities: { community: number; label: string; size: number }[]
}

export interface ApiSales {
  start: string
  end: string
  segment: string
  products: { id: string; orders: number; qty: number; revenue: number }[]
}

export interface ApiWeekly {
  week_starts: string[]
  end: string
  products: { id: string; orders: number[]; qty: number[]; revenue: number[] }[]
}

export interface ApiSummary {
  start: string
  end: string
  segment: string
  total_orders: number
  total_revenue: number
  avg_basket_size: number
  daily: { day: string; orders: number; revenue: number }[]
}

export interface Range {
  start: string
  end: string
  segment?: string
}

export interface NetworkParams extends Range {
  min_co_orders?: number
  min_lift?: number
  max_edges?: number
}

/* ---------- Constella AI (backend app/ai/schemas.py) ---------- */

export type Language = "en" | "zh-Hant"

export type AiErrorCode = "not_configured" | "limit_reached" | "provider_error" | "timeout" | "unverified" | "refused"

/** A run of answer text; with a `source` it's a figure, and `text` is the value as displayed. */
export interface ApiPart {
  text: string
  source: string | null
}

export interface ApiTraceStep {
  label: string
  call: string
  result: string
}

export interface ApiAskRequest {
  question: string
  start?: string | null
  end?: string | null
  segment?: string
  language: Language
  /** Earlier turns of this conversation, oldest first; at most 12. */
  history?: { role: "user" | "assistant"; content: string }[]
}

export interface ApiLiftEvidence {
  kind: "lift"
  caption: string
  rows: { id: string; label: string; lift: number; co_orders: number }[]
}

export interface ApiRankEvidence {
  kind: "rank"
  label: string
  format: "money" | "up" | "down" | "count"
  items: { id: string; name: string; community: number | null; score: number }[]
}

export type ApiOfferType = "n_for_price" | "buy_x_get_y" | "pct_off_set" | "coupon_percent" | "coupon_fixed"

export interface ApiCampaignDraft {
  name: string
  offer: string
  offer_type: ApiOfferType
  /** [anchor SKU, add-on SKU] */
  products: [string, string]
  community: number | null
  slogan_sets: string[][]
  why: ApiPart[]
}

export interface ApiAskAnswer {
  headline: ApiPart[]
  points: ApiPart[][]
  focus_product: string | null
  evidence: ApiLiftEvidence | ApiRankEvidence | null
  campaign: ApiCampaignDraft | null
  offer_report: boolean
  follow_ups: string[]
  trace: ApiTraceStep[]
}

interface ApiPairFact {
  a: string
  b: string
  lift: number
  co_orders: number
}

/** Names and numbers only: exactly what the report page shows. Changes are ratios (0.058 = up 5.8%). */
export interface ApiReportFacts {
  revenue_4w: number
  revenue_change: number
  orders: number
  pairs: number
  bridge_count: number
  product_count: number
  top: { name: string; revenue_4w: number; change: number }[]
  rising: { name: string; change: number }[]
  falling: { name: string; change: number }[]
  strongest_pairs: ApiPairFact[]
  near_chance_pair: ApiPairFact | null
  communities: { label: string; products: number; revenue: number; change: number }[]
  bridges: { name: string; holds: string[] }[]
  campaigns: { name: string; status: string; redemptions: number; extra_revenue: number; discount_cost: number; return_ratio: number }[]
  discount_candidate: { anchor: string; addon: string; lift: number; attach: number } | null
  stock_check: { name: string; change: number; partner: string | null; partner_change: number | null } | null
}

export interface ApiReportRequest {
  language: Language
  period_label: string
  segment_label: string
  weeks_label: string
  facts: ApiReportFacts
}

export interface ApiReportText {
  summary: ApiPart[]
  recommendations: { title: string; body: ApiPart[]; prompt: string | null }[]
}

export interface ApiAiStatus {
  enabled: boolean
  daily_limit: number
  used_today: number
  remaining: number
}

/* ---------- Endpoints ---------- */

async function allProducts() {
  const items: ApiProduct[] = []
  let cursor: string | undefined
  do {
    const page = await get<{ items: ApiProduct[]; next_cursor: string | null }>("/products", { limit: 200, cursor })
    items.push(...page.items)
    cursor = page.next_cursor ?? undefined
  } while (cursor)
  return items
}

export const api = {
  store: () => get<ApiStore>("/store"),
  segments: (r: Range) => get<ApiSegment[]>("/segments", { ...r }),
  products: allProducts,
  network: (p: NetworkParams) => get<ApiNetwork>("/network", { max_edges: 5000, ...p }),
  sales: (r: Range) => get<ApiSales>("/sales/products", { ...r }),
  weekly: (weeks: number, end: string) => get<ApiWeekly>("/sales/weekly", { weeks, end }),
  summary: (r: Range) => get<ApiSummary>("/summary", { ...r }),
  ai: {
    status: () => get<ApiAiStatus>("/ai/status"),
    ask: (body: ApiAskRequest, signal?: AbortSignal) => post<ApiAskAnswer>("/ai/ask", body, { signal }),
    report: (body: ApiReportRequest, signal?: AbortSignal) => post<ApiReportText>("/ai/report", body, { signal }),
  },
}
