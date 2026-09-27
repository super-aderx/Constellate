import type { Community, ProductEdge, ProductNode } from "@/components/graph"

/**
 * Mock data for the signed-in app, standing in for the API until the pages call it.
 * One grocery store, Harbor Street Market: 30 products in 5 communities, 12 weeks of sales ending
 * Sat Sep 26, 2026, and 90 days of pairs (Jun 29 – Sep 26). The last two weeks match the Home page's
 * top sellers, so figures agree across pages. Periods and customer segments rescale the 90 days with
 * seeded variation; there's no randomness at runtime.
 */

export const storeInfo = {
  name: "Harbor Street Market",
  asOf: "Sep 27, 06:00",
  /** Orders in the 90-day base window. */
  orders90: 24_120,
}

/* ---------- Catalog ---------- */

export const communities: Community[] = [
  { community: 0, label: "Breakfast" },
  { community: 1, label: "Coffee" },
  { community: 2, label: "Pasta night" },
  { community: 3, label: "Game day" },
  { community: 4, label: "Lunchbox" },
]

export const communityLabel = (c?: number | null) => communities.find((x) => x.community === c)?.label ?? "No community"

export interface Product {
  id: string
  label: string
  category: string
  community: number | null
  price: number
  /** Orders containing it in an average week. */
  weekly: number
}

export const products: Product[] = [
  { id: "milk", label: "Whole Milk", category: "Dairy", community: 0, price: 3.89, weekly: 620 },
  { id: "eggs", label: "Eggs (12)", category: "Dairy", community: 0, price: 4.49, weekly: 440 },
  { id: "yogurt", label: "Greek Yogurt", category: "Dairy", community: 0, price: 5.29, weekly: 190 },
  { id: "butter", label: "Butter", category: "Dairy", community: 0, price: 4.79, weekly: 170 },
  { id: "bread", label: "Sourdough Bread", category: "Bakery", community: 0, price: 5.49, weekly: 180 },
  { id: "jam", label: "Strawberry Jam", category: "Pantry", community: 0, price: 4.29, weekly: 70 },
  { id: "bananas", label: "Bananas", category: "Produce", community: 0, price: 1.69, weekly: 400 },
  { id: "granola", label: "Granola", category: "Pantry", community: 0, price: 6.49, weekly: 95 },
  { id: "coffee", label: "Ground Coffee", category: "Pantry", community: 1, price: 11.99, weekly: 250 },
  { id: "filters", label: "Coffee Filters", category: "Household", community: 1, price: 3.49, weekly: 60 },
  { id: "oat", label: "Oat Milk", category: "Dairy", community: 1, price: 4.59, weekly: 130 },
  { id: "biscotti", label: "Almond Biscotti", category: "Bakery", community: 1, price: 5.99, weekly: 45 },
  { id: "pasta", label: "Spaghetti", category: "Pantry", community: 2, price: 1.99, weekly: 132 },
  { id: "sauce", label: "Tomato Sauce", category: "Pantry", community: 2, price: 3.29, weekly: 140 },
  { id: "parmesan", label: "Parmesan", category: "Dairy", community: 2, price: 7.49, weekly: 150 },
  { id: "basil", label: "Fresh Basil", category: "Produce", community: 2, price: 2.49, weekly: 55 },
  { id: "garlic", label: "Garlic", category: "Produce", community: 2, price: 0.89, weekly: 160 },
  { id: "oil", label: "Olive Oil", category: "Pantry", community: 2, price: 10.99, weekly: 60 },
  { id: "wine", label: "Red Wine", category: "Drinks", community: 2, price: 13.99, weekly: 70 },
  { id: "chips", label: "Tortilla Chips", category: "Snacks", community: 3, price: 3.99, weekly: 300 },
  { id: "salsa", label: "Salsa", category: "Snacks", community: 3, price: 3.79, weekly: 210 },
  { id: "guac", label: "Guacamole", category: "Snacks", community: 3, price: 5.49, weekly: 110 },
  { id: "lager", label: "Lager (6-pack)", category: "Drinks", community: 3, price: 10.49, weekly: 100 },
  { id: "sourcream", label: "Sour Cream", category: "Dairy", community: 3, price: 2.39, weekly: 75 },
  { id: "limes", label: "Limes", category: "Produce", community: 3, price: 0.59, weekly: 140 },
  { id: "turkey", label: "Sliced Turkey", category: "Deli", community: 4, price: 6.99, weekly: 120 },
  { id: "cheddar", label: "Cheddar", category: "Dairy", community: 4, price: 5.99, weekly: 130 },
  { id: "apples", label: "Apples", category: "Produce", community: 4, price: 4.99, weekly: 150 },
  { id: "juice", label: "Juice Boxes", category: "Drinks", community: 4, price: 4.49, weekly: 90 },
  { id: "towels", label: "Paper Towels", category: "Household", community: null, price: 7.99, weekly: 85 },
]

export const productById = Object.fromEntries(products.map((p) => [p.id, p])) as Record<string, Product>
export const categories = [...new Set(products.map((p) => p.category))].sort()

/** Pairs over the 90-day base window: [a, b, orders with both, lift]. */
const basePairs: [string, string, number, number][] = [
  // Breakfast
  ["milk", "eggs", 1150, 2.1],
  ["milk", "yogurt", 420, 1.6],
  ["milk", "butter", 460, 1.9],
  ["eggs", "butter", 430, 2.4],
  ["bread", "butter", 380, 2.6],
  ["bread", "jam", 290, 3.4],
  ["bread", "eggs", 260, 1.8],
  ["yogurt", "granola", 330, 4.1],
  ["yogurt", "bananas", 300, 2.0],
  ["bananas", "granola", 160, 1.7],
  ["milk", "granola", 210, 1.8],
  // Coffee, joined to Breakfast only through Whole Milk
  ["milk", "coffee", 520, 3.62],
  ["coffee", "filters", 340, 5.1],
  ["coffee", "oat", 300, 2.8],
  ["coffee", "biscotti", 190, 3.3],
  ["oat", "biscotti", 60, 2.2],
  // Pasta night, joined to Breakfast only through Eggs and Parmesan
  ["pasta", "sauce", 900, 6.2],
  ["pasta", "parmesan", 400, 3.9],
  ["sauce", "basil", 210, 3.1],
  ["parmesan", "basil", 120, 2.2],
  ["pasta", "garlic", 260, 2.5],
  ["garlic", "oil", 180, 2.9],
  ["oil", "pasta", 150, 2.4],
  ["sauce", "garlic", 190, 2.1],
  ["wine", "parmesan", 140, 2.7],
  ["wine", "pasta", 110, 2.0],
  ["eggs", "parmesan", 130, 1.3],
  // Game day, joined to Lunchbox only through Cheddar
  ["chips", "salsa", 650, 5.8],
  ["chips", "guac", 300, 4.4],
  ["salsa", "guac", 220, 3.3],
  ["guac", "limes", 150, 3.6],
  ["chips", "lager", 280, 3.0],
  ["lager", "limes", 90, 2.4],
  ["chips", "sourcream", 120, 2.6],
  ["salsa", "sourcream", 70, 2.3],
  ["lager", "towels", 40, 1.5],
  // Lunchbox
  ["turkey", "cheddar", 310, 4.0],
  ["turkey", "bread", 190, 2.2],
  ["apples", "juice", 200, 3.8],
  ["turkey", "juice", 120, 2.9],
  ["cheddar", "apples", 110, 2.1],
  ["apples", "bananas", 140, 1.6],
  ["cheddar", "chips", 170, 1.9],
  ["cheddar", "sourcream", 50, 1.7],
]

/* ---------- Periods and customer segments ---------- */

export type PeriodId = "30d" | "90d" | "12m"

export const periods: { id: PeriodId; label: string; range: string; factor: number }[] = [
  { id: "30d", label: "30 days", range: "Aug 28 – Sep 26", factor: 0.34 },
  { id: "90d", label: "90 days", range: "Jun 29 – Sep 26", factor: 1 },
  { id: "12m", label: "12 months", range: "Sep 27, 2025 – Sep 26, 2026", factor: 3.9 },
]

export type Period = (typeof periods)[number]

export type SegmentId = "all" | "champions" | "loyal" | "potential" | "new" | "atRisk" | "hibernating"

export interface Segment {
  id: SegmentId
  label: string
  /** What the RFM scores mean for this group, in plain words. */
  description: string
  /** Share of orders. */
  share: number
  /** How much more (or less) this group buys from each community, Breakfast … Lunchbox. */
  affinity: number[]
}

export const segments: Segment[] = [
  { id: "all", label: "All customers", description: "Every order in the period", share: 1, affinity: [1, 1, 1, 1, 1] },
  { id: "champions", label: "Champions", description: "Bought recently, buy often and spend the most", share: 0.38, affinity: [1.1, 1.5, 1.3, 0.8, 1] },
  { id: "loyal", label: "Loyal", description: "Buy often, spend a little less", share: 0.24, affinity: [1.3, 1, 1, 0.9, 1.4] },
  { id: "potential", label: "Potential loyalists", description: "Recent customers buying more each month", share: 0.14, affinity: [1, 1.1, 1.2, 1.1, 0.9] },
  { id: "new", label: "New customers", description: "First order in the last 30 days", share: 0.08, affinity: [0.9, 0.6, 0.8, 1.6, 1.1] },
  { id: "atRisk", label: "At risk", description: "Used to buy often, less so lately", share: 0.1, affinity: [1, 1.2, 0.7, 1, 1.1] },
  { id: "hibernating", label: "Hibernating", description: "Haven't ordered in a long while", share: 0.06, affinity: [0.9, 0.8, 0.9, 1.3, 1] },
]

export const periodById = (id: PeriodId) => periods.find((p) => p.id === id) ?? periods[1]
export const segmentById = (id: SegmentId) => segments.find((s) => s.id === id) ?? segments[0]

/** Pairs need at least this many orders together to be drawn. */
export const MIN_CO_ORDERS = 5

/* ---------- The network for a period and segment ---------- */

export interface NetNode extends ProductNode {
  category: string
  orders: number
  revenue: number
  degree: number
}

export interface NetEdge extends ProductEdge {
  coOrders: number
  /** Share of the source's orders that also have the target, and the other way round. */
  confidenceAB: number
  confidenceBA: number
}

export interface Network {
  nodes: NetNode[]
  edges: NetEdge[]
  orders: number
  /** Products with no pair above the threshold, left out of the drawing. */
  hidden: number
}

/** A stable number in [0, 1) for a string, so variation is the same on every load. */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}
const vary = (key: string, spread: number) => 1 + (hash(key) * 2 - 1) * spread

const affinityOf = (segment: Segment, id: string) => {
  const c = productById[id].community
  return c == null ? 1 : segment.affinity[c]
}

const cache = new Map<string, Network>()

export function getNetwork(periodId: PeriodId, segmentId: SegmentId): Network {
  const key = `${periodId}/${segmentId}`
  const hit = cache.get(key)
  if (hit) return hit

  const period = periodById(periodId)
  const segment = segmentById(segmentId)
  const exact = periodId === "90d" && segmentId === "all"
  const scale = period.factor * segment.share

  const orderCount = new Map<string, number>()
  for (const p of products) {
    const base = p.weekly * 13
    orderCount.set(p.id, exact ? base : Math.max(1, Math.round(base * scale * affinityOf(segment, p.id) * vary(`${key}/${p.id}`, 0.08))))
  }

  const edges: NetEdge[] = []
  for (const [a, b, co, lift] of basePairs) {
    const coOrders = exact
      ? co
      : Math.round(co * scale * Math.sqrt(affinityOf(segment, a) * affinityOf(segment, b)) * vary(`${key}/${a}/${b}`, 0.18))
    if (coOrders < MIN_CO_ORDERS) continue
    const oa = orderCount.get(a)!
    const ob = orderCount.get(b)!
    edges.push({
      source: a,
      target: b,
      coOrders,
      lift: exact ? lift : Math.max(1.05, Number((lift * vary(`${key}/${a}/${b}/lift`, 0.14)).toFixed(2))),
      confidenceAB: Math.min(0.95, coOrders / oa),
      confidenceBA: Math.min(0.95, coOrders / ob),
    })
  }

  const nodes: NetNode[] = []
  for (const p of products) {
    const mine = edges.filter((e) => e.source === p.id || e.target === p.id)
    if (mine.length === 0) continue
    const orders = orderCount.get(p.id)!
    nodes.push({
      id: p.id,
      label: p.label,
      category: p.category,
      community: p.community,
      orders,
      revenue: orders * p.price,
      degree: mine.length,
      strength: mine.reduce((s, e) => s + e.coOrders, 0),
    })
  }

  const network: Network = {
    nodes,
    edges,
    orders: Math.round(storeInfo.orders90 * (exact ? 1 : scale * vary(`${key}/orders`, 0.04))),
    hidden: products.length - nodes.length,
  }
  cache.set(key, network)
  return network
}

/** Every pair in the base window, for pages that aren't filtered (Products, reports). */
export const baseNetwork = () => getNetwork("90d", "all")

/* ---------- Weekly sales, 12 weeks ending Sat Sep 26 ---------- */

export const weeks = [
  "Jul 5",
  "Jul 12",
  "Jul 19",
  "Jul 26",
  "Aug 2",
  "Aug 9",
  "Aug 16",
  "Aug 23",
  "Aug 30",
  "Sep 6",
  "Sep 13",
  "Sep 20",
].map((start, i) => ({ id: `w${i}`, label: start, long: `Week of ${start}` }))

/** The last two weeks for the Home page's top sellers: [Sep 20 – 26, Sep 13 – 19] revenue. */
const pinned: Record<string, [number, number]> = {
  coffee: [3120, 3120 / 1.061],
  milk: [2480, 2480 / 1.018],
  eggs: [1960, 1960 / 0.968],
  chips: [1410, 1410 / 1.184],
  parmesan: [1180, 1180 / 1.041],
}

/** Each product's direction over the 12 weeks, per week (e.g. 0.02 = about 2% a week). */
const drift: Record<string, number> = {
  chips: 0.03,
  salsa: 0.028,
  guac: 0.02,
  lager: 0.018,
  apples: 0.025,
  juice: 0.03,
  turkey: 0.012,
  filters: -0.028,
  biscotti: -0.02,
  yogurt: -0.012,
  wine: 0.015,
  oat: 0.02,
  towels: -0.006,
  basil: -0.015,
}

export interface WeeklySeries {
  revenue: number[]
  units: number[]
}

export const series: Record<string, WeeklySeries> = Object.fromEntries(
  products.map((p) => {
    const d = drift[p.id] ?? 0.004
    const revenue = weeks.map((_, i) => {
      const base = p.weekly * p.price * (1 + d * (i - 8))
      return Math.round(base * vary(`${p.id}/w${i}`, 0.06))
    })
    const pin = pinned[p.id]
    if (pin) {
      revenue[11] = pin[0]
      revenue[10] = Math.round(pin[1])
    } else {
      // Keep the Home page's top five on top.
      revenue[11] = Math.min(revenue[11], 1100)
      revenue[10] = Math.min(revenue[10], 1100)
    }
    return [p.id, { revenue, units: revenue.map((r) => Math.round(r / p.price)) }]
  }),
)

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Last 4 weeks against the 4 before, as a ratio change (0.05 = up 5%). */
export function recentChange(values: number[]) {
  const last = sum(values.slice(-4))
  const before = sum(values.slice(-8, -4))
  return last / (before || 1) - 1
}

/** Weekly revenue summed over some products. */
export function seriesOf(ids: string[]): number[] {
  return weeks.map((_, i) => sum(ids.map((id) => series[id].revenue[i])))
}

export function communitySeries(community: number): number[] {
  return seriesOf(products.filter((p) => p.community === community).map((p) => p.id))
}

export const totals = {
  revenue12w: sum(products.map((p) => sum(series[p.id].revenue))),
}
