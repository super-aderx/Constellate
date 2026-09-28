import type { TrendDay } from "@/components/charts/WeekTrend"
import { baseNetwork, communityLabel, productById, storeInfo, week } from "@/data/store"
import { weekdayLong } from "@/lib/dates"
import { fmt } from "@/lib/format"
import { appHref } from "@/lib/route"

/**
 * Home page copy and data: the store's last 7 complete days against the 7 before, from the
 * warehouse. The AI overview (simulated Constella AI) is written from the same figures, so every
 * number in it is real.
 */

export const period = {
  current: week.current.range,
  previous: week.previous.range,
  asOf: storeInfo.asOf,
}

export const header = {
  greeting: (hour: number, name: string) =>
    `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, ${name}`,
  summary: (store: string) => `Here's how ${store} did from ${period.current.replace(" – ", " to ")}, compared with the 7 days before.`,
}

/* ---------- The week ---------- */

export const days: TrendDay[] = week.days

/** The same weekday one week earlier, for the readout. */
export const previousDays = week.previousDays

const revenue = week.revenue
const orders = week.orders
const sum = (vs: number[]) => vs.reduce((a, b) => a + b, 0)
const ratio = (a: number[], b: number[]) => a.map((v, i) => (b[i] ? v / b[i] : 0))

export type MetricId = "revenue" | "orders" | "basket"

export interface Metric {
  id: MetricId
  label: string
  /** Daily values, this week and the one before. */
  current: number[]
  previous: number[]
  /** The whole week's figure: a total, or an average across all orders for the basket. */
  total: number
  previousTotal: number
  format: (v: number) => string
  formatTick: (v: number) => string
}

export const metrics: Metric[] = [
  {
    id: "revenue",
    label: "Revenue",
    ...revenue,
    total: sum(revenue.current),
    previousTotal: sum(revenue.previous),
    format: fmt.money,
    formatTick: fmt.money,
  },
  {
    id: "orders",
    label: "Orders",
    ...orders,
    total: sum(orders.current),
    previousTotal: sum(orders.previous),
    format: fmt.int,
    formatTick: fmt.int,
  },
  {
    id: "basket",
    label: "Average basket",
    current: ratio(revenue.current, orders.current),
    previous: ratio(revenue.previous, orders.previous),
    total: sum(revenue.current) / (sum(orders.current) || 1),
    previousTotal: sum(revenue.previous) / (sum(orders.previous) || 1),
    format: fmt.price,
    formatTick: fmt.price,
  },
]

export const trend = {
  title: "Last 7 days",
  tabsLabel: "Metric to chart",
  daysLabel: "Day to read out",
  vsPrevious: `vs ${period.previous}`,
  vsDay: (day: string) => `vs ${day}`,
  tableCaption: (metric: string) => `${metric} by day, ${period.current} and ${period.previous}`,
  dayColumn: "Day",
  thisWeek: "This week",
  lastWeek: "Week before",
}

/* ---------- AI overview ---------- */

/** Text, or a figure that names the data it came from. */
export type Segment = string | { value: string; source: string }

export type Signal = "rising" | "falling" | "opportunity"

const name = (id: string) => productById[id]?.label ?? id
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
const together = (w: "current" | "previous", a: string, b: string) => week.pairs[w].get(pairKey(a, b)) ?? 0
const soldIn = (w: "current" | "previous", id: string) => week.sales[w].get(id)?.orders ?? 0
const inWeek = (w: "current" | "previous") => (w === "current" ? period.current : period.previous)
const src = {
  pair: (w: "current" | "previous", a: string, b: string) => `Orders with ${name(a)} and ${name(b)}, ${inWeek(w)}`,
  product: (w: "current" | "previous", id: string) => `Orders with ${name(id)}, ${inWeek(w)}`,
}

/** "fewer than 1 in 4", "fewer than half" … for an attach rate. */
function share(r: number) {
  if (r < 0.25) return "fewer than 1 in 4"
  if (r < 1 / 3) return "fewer than 1 in 3"
  if (r < 0.5) return "fewer than half"
  return `${fmt.pct(r)} of them`
}

function headline(): Segment[] {
  const cur = sum(revenue.current)
  const prev = sum(revenue.previous)
  const change = cur / (prev || 1) - 1
  const beat = revenue.current.filter((v, i) => v > revenue.previous[i]).length
  const all = [...revenue.previous, ...revenue.current]
  const best = all.indexOf(Math.max(...all))
  const days =
    beat === 7 ? "Every day beat the same day last week" : beat === 0 ? "No day beat the same day last week" : `${beat} of 7 days beat the same day last week`
  const bestDay = best >= 7 ? `, and ${weekdayLong(week.days[best - 7].id)} was the best day in two weeks.` : "."
  return [
    `Revenue ${change >= 0 ? "rose" : "fell"} `,
    { value: fmt.change(change), source: `Revenue, ${period.current} vs ${period.previous}` },
    " to ",
    { value: fmt.money(cur), source: `Revenue, ${period.current}` },
    `. ${days}${bestDay}`,
  ]
}

// Pairs worth talking about: the 90-day network's pairs (bought together more than chance).
const known = baseNetwork().edges
const moves = known
  .map((e) => ({ e, now: together("current", e.source, e.target), before: together("previous", e.source, e.target) }))
  .map((m) => ({ ...m, delta: m.now - m.before }))

function risingPoint(): Segment[] | null {
  const up = [...moves].filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta)[0]
  if (!up) return null
  const { e } = up
  return [
    `${name(e.source)} and ${name(e.target)} were bought together in `,
    { value: fmt.int(up.now), source: src.pair("current", e.source, e.target) },
    " orders, up from ",
    { value: fmt.int(up.before), source: src.pair("previous", e.source, e.target) },
    ".",
  ]
}

function fallingPoint(): Segment[] | null {
  const down = [...moves].filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta)[0]
  if (!down) return null
  // The product people came for is the one with more orders; the pair lost its partner.
  const [anchor, partner] = soldIn("current", down.e.source) >= soldIn("current", down.e.target) ? [down.e.source, down.e.target] : [down.e.target, down.e.source]
  const anchorUp = soldIn("current", anchor) >= soldIn("previous", anchor)
  return [
    `${name(anchor)} sold ${anchorUp ? "more" : "less"}, but only `,
    { value: fmt.int(down.now), source: src.pair("current", anchor, partner) },
    ` orders included ${name(partner)}, down from `,
    { value: fmt.int(down.before), source: src.pair("previous", anchor, partner) },
    `. Check whether ${name(partner)} was in stock.`,
  ]
}

/** A strong pair (lift ≥ 2.5 over 90 days) that few of the anchor's orders include this week. */
const opportunity = known
  .filter((e) => e.lift >= 2.5)
  .map((e) => {
    const [anchor, addon] = soldIn("current", e.source) >= soldIn("current", e.target) ? [e.source, e.target] : [e.target, e.source]
    const anchorOrders = soldIn("current", anchor)
    return { anchor, addon, anchorOrders, both: together("current", anchor, addon) }
  })
  .filter((o) => o.anchorOrders >= 30)
  .sort((a, b) => a.both / a.anchorOrders - b.both / b.anchorOrders)[0]

function opportunityPoint(): Segment[] | null {
  if (!opportunity) return null
  const { anchor, addon, anchorOrders, both } = opportunity
  const community = productById[anchor]?.community
  const basket = community != null ? `the ${communityLabel(community)} basket` : "the basket"
  return [
    `${name(addon)} went into `,
    { value: fmt.int(both), source: src.pair("current", anchor, addon) },
    " of ",
    { value: fmt.int(anchorOrders), source: src.product("current", anchor) },
    ` ${name(anchor)} orders, ${share(both / anchorOrders)}. A ${name(addon)} discount with ${name(anchor)} could grow ${basket}.`,
  ]
}

const points = (
  [
    ["rising", risingPoint()],
    ["falling", fallingPoint()],
    ["opportunity", opportunityPoint()],
  ] as [Signal, Segment[] | null][]
)
  .filter(([, text]) => text)
  .map(([signal, text]) => ({ signal, text: text! }))

const draftCommunity = opportunity ? productById[opportunity.anchor]?.community : null
const draftLabel = draftCommunity != null ? communityLabel(draftCommunity) : null

export const overview = {
  kind: "Generated overview",
  asOf: `Data as of ${period.asOf}`,
  headline: headline(),
  signals: { rising: "Rising", falling: "Falling", opportunity: "Opportunity" } satisfies Record<Signal, string>,
  points,
  primary: draftLabel
    ? { label: `Draft a ${draftLabel} discount`, href: appHref("ask", { q: `Design a discount campaign for ${draftLabel}` }) }
    : { label: "Draft a campaign", href: appHref("ask", { q: "Which pair should I discount?" }) },
  secondary: { label: "Ask a follow-up", href: "#/ask" },
}

/* ---------- Top sellers ---------- */

const ranked = [...week.sales.current.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5)

export const topSellers = {
  title: "Top sellers",
  subtitle: `By revenue, ${period.current}`,
  listLabel: "Top five products by revenue",
  items: ranked.map(([id, s]) => ({
    id,
    name: name(id),
    community: productById[id]?.community ?? null,
    revenue: s.revenue,
    change: s.revenue / (week.sales.previous.get(id)?.revenue || s.revenue) - 1,
  })),
  vsPrevious: `Changes vs ${period.previous}`,
  link: { label: "See all products", href: "#/products" },
}
