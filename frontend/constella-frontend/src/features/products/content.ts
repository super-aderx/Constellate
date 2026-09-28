import { LAST_DATA_DAY } from "@/data/store"
import { shortDate } from "@/lib/dates"
import { fmt } from "@/lib/format"

/** Products page copy. */

export const page = {
  title: "Products",
  summary: (store: string, count: number) =>
    `${count} products at ${store}. Sales over the 12 weeks to ${shortDate(LAST_DATA_DAY)}; pairs over the 90 days to ${shortDate(LAST_DATA_DAY)}.`,
}

export const toolbar = {
  search: "Search products",
  category: "Category",
  allCategories: "All categories",
  count: (shown: number, total: number) => (shown === total ? `${total} products` : `${shown} of ${total} products`),
}

export const table = {
  caption: "Products with their sales, trend and strongest pair. Select a product to see its details.",
  product: "Product",
  revenue: "Revenue, 12 weeks",
  trend: "Trend",
  change: "Last 4 weeks",
  pairs: "Pairs",
  topPair: "Strongest pair",
  sortBy: (col: string) => `Sort by ${col.toLowerCase()}`,
  select: (name: string) => `Show ${name}`,
  noPairs: "No pairs",
  empty: "No products match. Clear the search or pick another category.",
  clear: "Clear filters",
}

export const detail = {
  close: "Close",
  each: (category: string, price: string) => `${category}, ${price} each`,
  noCommunity: "No community",
  revenue: "Revenue, 12 weeks",
  units: "Units, 12 weeks",
  share: "In orders",
  shareNote: "Share of all orders, last 90 days",
  change: "Last 4 weeks",
  weekly: "Weekly revenue",
  weeksLabel: "Week to read out",
  weekReadout: (week: string) => `Week of ${week}`,
  vsBefore: "vs the week before",
  pairs: "Bought with",
  pairsNote: "Last 90 days, strongest lift first",
  together: (n: number) => `${fmt.int(n)} orders`,
  noPairs: "Not bought with anything at least 5 times in the last 90 days.",
  network: "Open in Network",
  ask: "Ask about it",
  askPrompt: (name: string) => `What sells with ${name}?`,
  empty: "Select a product to see its sales, trend and pairs.",
}

export const heat = {
  title: "Which products sell together",
  body: "Every pair in the store over the last 90 days. Products are grouped by community; darker cells are bought together more.",
  metricLabel: "Shade by",
  metrics: [
    { value: "lift" as const, label: "Lift" },
    { value: "orders" as const, label: "Orders together" },
  ],
  label: "Pairs of products, as a grid. Use the arrow keys to move between pairs and Enter to select one.",
  describe: (a: string, b: string, value: string | null) => (value ? `${a} and ${b}, ${value}` : `${a} and ${b}, not bought together`),
  legend: {
    lift: { bins: ["1–2×", "2–3×", "3–4.5×", "4.5× and up"], empty: "Not bought together" },
    orders: { bins: ["5–99", "100–249", "250–499", "500 and up"], empty: "Not bought together" },
  },
  prompt: "Point at or select a cell to read the pair.",
  readout: (a: string, b: string) => `${a} and ${b}`,
  readoutFigures: (orders: number, lift: number) => `${fmt.int(orders)} orders together, ${fmt.lift(lift)} as often as chance`,
  notTogether: "Not bought together at least 5 times.",
  openPair: "Open in Network",
}
