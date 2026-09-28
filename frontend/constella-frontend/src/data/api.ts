/**
 * The Constella API (backend/), which reads the warehouse's serving views. Responses keep the API's
 * snake_case shapes; `store.ts` and `networks.ts` adapt them to the app's view models.
 * Requests go to /api/v1 (proxied to the backend in dev). VITE_TENANT_KEY picks a store; without
 * it the API uses its default store.
 */

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1"
const TENANT = import.meta.env.VITE_TENANT_KEY as string | undefined

export class ApiError extends Error {
  readonly status: number
  readonly path: string
  constructor(status: number, path: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.path = path
  }
}

type Params = Record<string, string | number | undefined>

async function get<T>(path: string, params: Params = {}): Promise<T> {
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) query.set(k, String(v))
  const url = `${BASE}${path}${query.size ? `?${query}` : ""}`
  let response: Response
  try {
    response = await fetch(url, { headers: TENANT ? { "X-Tenant-Key": TENANT } : undefined })
  } catch {
    throw new ApiError(0, path, "Couldn't reach the Constella API.")
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
    const detail = typeof body?.detail === "string" ? body.detail : response.statusText
    throw new ApiError(response.status, path, `The Constella API answered ${response.status} for ${path}: ${detail}`)
  }
  return (await response.json()) as T
}

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
}
