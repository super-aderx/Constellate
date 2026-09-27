import type { TrendDay } from "@/components/charts/WeekTrend"
import { fmt } from "@/lib/format"

/**
 * Home page copy and mock data: one grocery store's last 7 complete days (Sun Sep 20 – Sat Sep 26, 2026)
 * against the 7 before. Figures in the AI overview are written out, so they must match the numbers here.
 */

export const period = {
  current: "Sep 20 – 26",
  previous: "Sep 13 – 19",
  asOf: "Sep 27, 06:00",
}

export const header = {
  greeting: (hour: number, name: string) =>
    `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, ${name}`,
  summary: (store: string) => `Here's how ${store} did from Sep 20 to 26, compared with the 7 days before.`,
}

/* ---------- The week ---------- */

export const days: TrendDay[] = [
  { id: "2026-09-20", short: "Sun 20", long: "Sunday, September 20" },
  { id: "2026-09-21", short: "Mon 21", long: "Monday, September 21" },
  { id: "2026-09-22", short: "Tue 22", long: "Tuesday, September 22" },
  { id: "2026-09-23", short: "Wed 23", long: "Wednesday, September 23" },
  { id: "2026-09-24", short: "Thu 24", long: "Thursday, September 24" },
  { id: "2026-09-25", short: "Fri 25", long: "Friday, September 25" },
  { id: "2026-09-26", short: "Sat 26", long: "Saturday, September 26" },
]

/** The same weekday one week earlier, for the readout. */
export const previousDays = ["Sun 13", "Mon 14", "Tue 15", "Wed 16", "Thu 17", "Fri 18", "Sat 19"]

const revenue = { current: [7480, 6120, 5890, 6340, 6710, 7390, 8280], previous: [7210, 5980, 5760, 6050, 6420, 6930, 7910] }
const orders = { current: [296, 242, 231, 250, 263, 288, 332], previous: [290, 240, 229, 248, 262, 285, 316] }
const sum = (vs: number[]) => vs.reduce((a, b) => a + b, 0)
const ratio = (a: number[], b: number[]) => a.map((v, i) => v / b[i])

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
    total: sum(revenue.current) / sum(orders.current),
    previousTotal: sum(revenue.previous) / sum(orders.previous),
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

export const overview = {
  kind: "Generated overview",
  asOf: `Data as of ${period.asOf}`,
  headline: [
    "Revenue rose ",
    { value: "4.2%", source: `Revenue, ${period.current} vs ${period.previous}` },
    " to ",
    { value: "$48,210", source: `Revenue, ${period.current}` },
    ". Every day beat the same day last week, and Saturday was the best day in two weeks.",
  ] satisfies Segment[],
  signals: { rising: "Rising", falling: "Falling", opportunity: "Opportunity" } satisfies Record<Signal, string>,
  points: [
    {
      signal: "rising",
      text: [
        "Game day carried Saturday. Tortilla Chips and Salsa were bought together in ",
        { value: "58", source: `Orders with both, ${period.current}` },
        " orders, up from ",
        { value: "39", source: `Orders with both, ${period.previous}` },
        ".",
      ],
    },
    {
      signal: "falling",
      text: [
        "Ground Coffee sold more, but only ",
        { value: "21", source: `Orders with Ground Coffee and Coffee Filters, ${period.current}` },
        " orders included Coffee Filters, down from ",
        { value: "30", source: `Orders with Ground Coffee and Coffee Filters, ${period.previous}` },
        ". Check whether the filters were in stock.",
      ],
    },
    {
      signal: "opportunity",
      text: [
        "Parmesan went into ",
        { value: "31", source: `Orders with Spaghetti and Parmesan, ${period.current}` },
        " of ",
        { value: "132", source: `Orders with Spaghetti, ${period.current}` },
        " Spaghetti orders, fewer than 1 in 4. A Parmesan discount with pasta could grow the Pasta night basket.",
      ],
    },
  ] satisfies { signal: Signal; text: Segment[] }[],
  primary: { label: "Draft a Pasta night discount", href: "#/ask?q=Design%20a%20discount%20campaign%20for%20Pasta%20night" },
  secondary: { label: "Ask a follow-up", href: "#/ask" },
}

/* ---------- Top sellers ---------- */

export const topSellers = {
  title: "Top sellers",
  subtitle: `By revenue, ${period.current}`,
  listLabel: "Top five products by revenue",
  items: [
    { id: "coffee", name: "Ground Coffee", community: 1, revenue: 3120, change: 0.061 },
    { id: "milk", name: "Whole Milk", community: 0, revenue: 2480, change: 0.018 },
    { id: "eggs", name: "Eggs (12)", community: 0, revenue: 1960, change: -0.032 },
    { id: "chips", name: "Tortilla Chips", community: 3, revenue: 1410, change: 0.184 },
    { id: "parmesan", name: "Parmesan", community: 2, revenue: 1180, change: 0.041 },
  ],
  vsPrevious: `Changes vs ${period.previous}`,
  link: { label: "See all products", href: "#/products" },
}
