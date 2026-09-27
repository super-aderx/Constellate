import { fmt } from "@/lib/format"

/** Network page copy. Figures in generated text come from `insights.ts`, computed from the data. */

export type Scope = "store" | "products"
export type View = "pairs" | "bridges" | "communities"

export const page = {
  title: "Network",
  summary: (store: string, range: string) => `How products are bought together at ${store}, ${range}.`,
}

export const filters = {
  scopeLabel: "Show",
  scopes: [
    { value: "store" as Scope, label: "Whole store" },
    { value: "products" as Scope, label: "Chosen products" },
  ],
  period: "Period",
  periodOption: (label: string) => `Last ${label}`,
  customers: "Customers",
  products: "Products",
  addProduct: "Add product",
  removeProduct: (name: string) => `Remove ${name}`,
  pickSearch: "Search products",
  pickEmpty: "No product matches that name.",
  pickLimit: (max: number) => `Compare up to ${max} products at a time.`,
}

export const views = {
  label: "Graph view",
  options: [
    { value: "pairs" as View, label: "Pairs" },
    { value: "bridges" as View, label: "Bridges" },
    { value: "communities" as View, label: "Communities" },
  ],
  /** One line under the canvas explaining the view. */
  about: {
    pairs: "Every pair bought together at least 5 times. Bigger stars are in more paired orders; thicker lines are pairs bought together more often than chance.",
    bridges:
      "Bridge products (articulation points) are the only link between parts of your store: take one away and the network splits. Select one to see what it holds together.",
    communities: "Groups of products bought with each other more than with anything else, found from the pairs.",
  } satisfies Record<View, string>,
}

export const legend = {
  size: "Size = orders in pairs",
  width: "Width = lift",
  selected: "Selected",
  bridge: "Bridge product",
  cutOff: "Would be cut off",
  chosen: "Chosen product",
  side: "Pair between its partners",
  hidden: (n: number) => `${n} ${n === 1 ? "product has" : "products have"} no pairs in this selection and ${n === 1 ? "isn't" : "aren't"} shown.`,
}

export const graph = {
  label: (products: number, pairs: number) => `Product network: ${products} products, ${pairs} pairs. Select a product to see its details.`,
  edge: (coOrders: number, lift: number) => `${fmt.int(coOrders)} orders together, ${fmt.lift(lift)}`,
}

export const empty = {
  title: "No pairs for this selection",
  body: (names: string, segment: string, range: string) =>
    `${names} wasn't bought with anything at least 5 times by ${segment.toLowerCase()} between ${range}. Try a longer period or all customers.`,
  action: "Show all customers",
}

export const node = {
  close: "Close",
  orders: "Orders",
  revenue: "Revenue",
  pairs: "Pairs",
  inPairs: "Orders in pairs",
  noCommunity: "No community",
  boughtWith: "Bought with",
  byCategory: "Pairs by category",
  byCategoryNote: "Share of its paired orders, by the partner's category",
  bridgeTitle: "Holds the store together",
  bridgeBody: (name: string, count: number, names: string) =>
    `Without ${name}, ${count} ${count === 1 ? "product loses its" : "products lose their"} only link to the rest of the store: ${names}.`,
  explore: "Explore its pairs",
  viewProduct: "View product",
  pairAction: (partner: string) => `Show the pair with ${partner}`,
}

export const pair = {
  title: (a: string, b: string) => `${a} and ${b}`,
  together: "Orders together",
  lift: "Lift",
  liftNote: "times as often as chance",
  /** Follows the share, e.g. "27%" + "of Ground Coffee orders include Whole Milk". */
  confidence: (a: string, b: string) => `of ${a} orders include ${b}`,
  bridge: "The only link between two parts of the store. Keep both in stock.",
  side: (focus: string) => `Neither is ${focus}: they're bought together on their own.`,
  draft: "Draft a bundle",
  draftPrompt: (a: string, b: string) => `Design a bundle for ${a} and ${b}`,
}

export const communityTable = {
  title: "Communities in this view",
  note: "Figures cover the products shown. Revenue follows the period and customers; the 4-week trend is weekly sales from all customers.",
  caption: "Communities, their size, sales and strongest pair",
  community: "Community",
  products: "Products",
  revenue: "Revenue",
  change: "Last 4 weeks",
  topPair: "Strongest pair",
  select: (name: string) => `Highlight ${name}`,
  none: "–",
}

export const insights = {
  title: "AI insights",
  asOf: (asOf: string) => `Data as of ${asOf}`,
  reading: "Reading the network…",
  signals: { strong: "Strongest", watch: "Watch", opportunity: "Opportunity" },
  ask: "Ask a follow-up",
  draft: "Draft a campaign",
  note: "Constella AI reads the graph you're looking at. Change the view or filters and it reads again.",
}
