import { useSyncExternalStore } from "react"
import { addDays, dateRange, daysBetween, shortDate, toDate } from "@/lib/dates"
import { fmt } from "@/lib/format"
import { baseNetwork, LAST_DATA_DAY, productById } from "./store"

/**
 * Mock campaigns, kept in memory so a draft saved in Constella AI shows up on the Campaigns page.
 * Resets on reload. The warehouse has no promotions yet (P1), so campaigns and their results stay
 * simulated; their products, prices and pair figures come from the real store data, and their
 * dates sit around "today", the day after the data's last complete day.
 */

export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "ended"

export interface CampaignResults {
  /** One label per day, e.g. "Sep 7", from 14 days before launch to the last day with data. */
  days: string[]
  /** Index in `days` of the launch day. */
  launchIndex: number
  /** Orders with the offer's products together, per day. */
  actual: number[]
  /** What the same days would have looked like without the campaign, from the 8 weeks before. */
  expected: number[]
  /** Order value of the products in the offer, used for revenue. */
  basketValue: number
  /** What the discount costs per redemption. */
  discountPerOrder: number
  /** Share of the anchor product's orders that also had the partner, before and during. */
  attachBefore: number
  attachDuring: number
}

export interface CampaignRecord {
  id: string
  name: string
  offer: string
  /** Product ids (SKUs); the first is the anchor, the rest are what the offer adds. */
  products: string[]
  community: number | null
  slogans: string[]
  status: CampaignStatus
  /** ISO dates. */
  start?: string
  end?: string
  /** Who drafted it. */
  source: "you" | "ai"
  /** For AI drafts: the figures the draft was based on. */
  why?: string
  results?: CampaignResults
}

export { LAST_DATA_DAY }
export const TODAY = addDays(LAST_DATA_DAY, 1)

/** Small seeded wobble so daily lines look like real days. */
function wobble(seed: number, i: number) {
  const x = Math.sin(seed * 97.13 + i * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function simulate(opts: {
  seed: number
  start: string
  /** Last day with data: the end date, or yesterday for live campaigns. */
  through: string
  baseline: number
  /** Relative lift while it runs, e.g. 0.4 = 40% more orders than expected. */
  uplift: number
  /** Optional slump over the last n days (e.g. out of stock): [days, factor]. */
  slump?: [number, number]
  basketValue: number
  discountPerOrder: number
  attachBefore: number
}): CampaignResults {
  const pre = 14
  const running = daysBetween(opts.start, opts.through) + 1
  const days: string[] = []
  const actual: number[] = []
  const expected: number[] = []
  for (let i = -pre; i < running; i++) {
    const iso = addDays(opts.start, i)
    const weekend = [0, 5, 6].includes(toDate(iso).getUTCDay()) ? 1.25 : 0.92
    const exp = opts.baseline * weekend
    let act = exp * (0.88 + wobble(opts.seed, i) * 0.24)
    if (i >= 0) {
      const ramp = Math.min(1, (i + 1) / 4)
      act *= 1 + opts.uplift * ramp
      if (opts.slump && i >= running - opts.slump[0]) act *= opts.slump[1]
    }
    days.push(shortDate(iso))
    expected.push(Number(exp.toFixed(1)))
    actual.push(Math.round(act))
  }
  const during = actual.slice(pre)
  const expectedDuring = expected.slice(pre)
  const ratio = during.reduce((a, b) => a + b, 0) / (expectedDuring.reduce((a, b) => a + b, 0) || 1)
  return {
    days,
    launchIndex: pre,
    actual,
    expected,
    basketValue: opts.basketValue,
    discountPerOrder: opts.discountPerOrder,
    attachBefore: opts.attachBefore,
    attachDuring: Math.min(0.9, opts.attachBefore * ratio),
  }
}

/** Summary figures for a campaign's results. */
export function summarise(r: CampaignResults) {
  const during = r.actual.slice(r.launchIndex)
  const expected = r.expected.slice(r.launchIndex)
  const redemptions = during.reduce((a, b) => a + b, 0)
  const extraOrders = Math.max(0, redemptions - expected.reduce((a, b) => a + b, 0))
  const extraRevenue = extraOrders * r.basketValue
  const discountCost = redemptions * r.discountPerOrder
  return {
    days: during.length,
    redemptions,
    extraOrders: Math.round(extraOrders),
    extraRevenue,
    discountCost,
    /** Extra revenue per dollar of discount. */
    returnRatio: discountCost ? extraRevenue / discountCost : 0,
    uplift: redemptions / (expected.reduce((a, b) => a + b, 0) || 1) - 1,
  }
}

const price = (id: string) => productById[id]?.price ?? 0
const day = (n: number) => addDays(TODAY, n)
const name = (id: string) => productById[id]?.label ?? id

/** "Coffee Filters joins Ground Coffee in 340 orders over 90 days, 5.10× as often as chance." */
function pairWhy(anchor: string, addon: string) {
  const e = baseNetwork().edges.find((x) => (x.source === anchor && x.target === addon) || (x.source === addon && x.target === anchor))
  return e
    ? `${name(addon)} joins ${name(anchor)} in ${fmt.int(e.coOrders)} orders over 90 days, ${fmt.lift(e.lift)} as often as chance.`
    : `${name(addon)} and ${name(anchor)} share customers.`
}

type Seed = Omit<CampaignRecord, "community">

const seeds: Seed[] = [
  {
    id: "c-coffee",
    name: "Morning coffee bundle",
    offer: "$1.50 off Coffee Filters with Ground Coffee",
    products: ["HS-COFFEE", "HS-FILTERS"],
    slogans: ["Brew it right from the first scoop.", "Coffee's best pair, in one bundle."],
    status: "active",
    start: day(-20),
    end: day(7),
    source: "ai",
    why: pairWhy("HS-COFFEE", "HS-FILTERS"),
    results: simulate({
      seed: 1,
      start: day(-20),
      through: LAST_DATA_DAY,
      baseline: 3.7,
      uplift: 0.34,
      slump: [7, 0.58],
      basketValue: price("HS-COFFEE") + price("HS-FILTERS"),
      discountPerOrder: 1.5,
      attachBefore: 0.105,
    }),
  },
  {
    id: "c-lunch",
    name: "Back-to-school lunchbox",
    offer: "Juice Boxes 2 for $8 with Sliced Turkey",
    products: ["HS-TURKEY", "HS-JUICE"],
    slogans: ["Lunch, packed.", "Two boxes, zero morning rush."],
    status: "active",
    start: day(-34),
    end: day(7),
    source: "you",
    results: simulate({
      seed: 2,
      start: day(-34),
      through: LAST_DATA_DAY,
      baseline: 1.5,
      uplift: 0.62,
      basketValue: price("HS-TURKEY") + price("HS-JUICE") * 2,
      discountPerOrder: 0.98,
      attachBefore: 0.077,
    }),
  },
  {
    id: "c-gameday",
    name: "Game day kit",
    offer: "15% off Salsa with Tortilla Chips",
    products: ["HS-CHIPS", "HS-SALSA"],
    slogans: ["Kickoff tastes better with salsa.", "Chips, meet your match."],
    status: "ended",
    start: day(-57),
    end: day(-27),
    source: "ai",
    why: pairWhy("HS-CHIPS", "HS-SALSA"),
    results: simulate({
      seed: 3,
      start: day(-57),
      through: day(-27),
      baseline: 6.4,
      uplift: 0.48,
      basketValue: price("HS-CHIPS") + price("HS-SALSA"),
      discountPerOrder: 0.57,
      attachBefore: 0.19,
    }),
  },
  {
    id: "c-pasta-oil",
    name: "Summer pasta",
    offer: "20% off Olive Oil with Spaghetti",
    products: ["HS-PASTA", "HS-OIL"],
    slogans: ["A drizzle of summer."],
    status: "ended",
    start: day(-83),
    end: day(-63),
    source: "you",
    results: simulate({
      seed: 4,
      start: day(-83),
      through: day(-63),
      baseline: 1.6,
      uplift: 0.14,
      basketValue: price("HS-PASTA") + price("HS-OIL"),
      discountPerOrder: 2.2,
      attachBefore: 0.087,
    }),
  },
  {
    id: "c-breakfast",
    name: "Weekend breakfast",
    offer: "Free Strawberry Jam with two Sourdough loaves",
    products: ["HS-BREAD", "HS-JAM"],
    slogans: ["Saturday starts with sourdough.", "Toast, but better."],
    status: "scheduled",
    start: day(6),
    end: day(28),
    source: "you",
  },
  {
    id: "c-oat",
    name: "Oat milk latte kit",
    offer: "10% off Oat Milk with Ground Coffee",
    products: ["HS-COFFEE", "HS-OAT"],
    slogans: ["Your latte, your way.", "Oat milk, brewed for it."],
    status: "draft",
    source: "ai",
    why: pairWhy("HS-COFFEE", "HS-OAT"),
  },
]

/** The sample campaigns are written for Harbor Street; another store starts with the ones whose products it sells. */
const seed: CampaignRecord[] = seeds
  .filter((c) => c.products.every((id) => productById[id]))
  .map((c) => ({ ...c, community: productById[c.products[0]].community }))

/* ---------- The in-memory store ---------- */

let state: CampaignRecord[] = seed
const listeners = new Set<() => void>()

function emit(next: CampaignRecord[]) {
  state = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCampaigns() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

let counter = 0
export const newCampaignId = () => `c-new-${++counter}`

/** Adds a campaign at the top of the list; returns its id. */
export function addCampaign(c: Omit<CampaignRecord, "id"> & { id?: string }) {
  const id = c.id ?? newCampaignId()
  emit([{ ...c, id }, ...state])
  return id
}

export function updateCampaign(id: string, patch: Partial<CampaignRecord>) {
  emit(state.map((c) => (c.id === id ? { ...c, ...patch } : c)))
}

export function removeCampaign(id: string) {
  emit(state.filter((c) => c.id !== id))
}

export { addDays, dateRange, daysBetween, shortDate }
