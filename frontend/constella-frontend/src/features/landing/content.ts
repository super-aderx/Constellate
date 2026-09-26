import type { Campaign } from "@/components/assistant"
import type { IconName } from "@/components/brand/Icon"
import type { LiftRow } from "@/components/charts/LiftDotPlot"
import type { Community, Positions, ProductEdge, ProductNode } from "@/components/graph"

/** All landing-page copy and sample data. Components stay free of text so they can be reused. */

export const nav = [
  { label: "The network", href: "#network" },
  { label: "Constella AI", href: "#ai" },
  { label: "Workflow", href: "#workflow" },
  { label: "Lift", href: "#lift" },
]

export const requestAccess = { label: "Request access", href: "#request-access" }

export const hero = {
  title: "Find the constellations in what you sell.",
  body: "Each product is a star, and every order draws lines between the ones bought together. Constella maps those constellations, and Constella AI reads them to plan your next bundle, discount and slogan.",
  secondary: { label: "See AI plan a campaign", href: "#ai" },
  graphLabel: "Sample product network from a grocery store. Select a product to read its strongest pair and an AI suggestion.",
  sampleNote: "Sample grocery data",
  emptyReadout: "Select a product to see what it's bought with most.",
  stopTour: "Stop the tour",
  suggestionLabel: "AI suggestion",
  /** Scripted suggestions for the demo; other products fall back to promoting their strongest pair. */
  suggestions: {
    coffee: "Bundle it with Coffee Filters. They already share 214 orders, so the bundle sells a habit customers have.",
    pasta: "Run a Pasta night kit: keep Spaghetti and Tomato Sauce at full price and discount Parmesan, the item people leave out.",
    chips: "Shelve Salsa and Guacamole next to the chips for game day. Both pairs are well above chance.",
    milk: "Keep Whole Milk at full price. It links Breakfast to Coffee and pulls other products into the basket on its own.",
  } as Record<string, string>,
}

/* ---------- Sample network (a small grocery store) ---------- */

export const communities: Community[] = [
  { community: 0, label: "Breakfast" },
  { community: 1, label: "Coffee" },
  { community: 2, label: "Pasta night" },
  { community: 3, label: "Game day" },
]

/** Strength is derived from `edges` below, so node size always matches the pairs shown. */
const products: Omit<ProductNode, "strength">[] = [
  { id: "milk", label: "Whole Milk", category: "Dairy", community: 0 },
  { id: "eggs", label: "Eggs (12)", category: "Dairy", community: 0 },
  { id: "yogurt", label: "Greek Yogurt", category: "Dairy", community: 0 },
  { id: "butter", label: "Butter", category: "Dairy", community: 0 },
  { id: "coffee", label: "Ground Coffee", category: "Pantry", community: 1 },
  { id: "filters", label: "Coffee Filters", category: "Pantry", community: 1 },
  { id: "oat", label: "Oat Milk", category: "Pantry", community: 1 },
  { id: "pasta", label: "Spaghetti", category: "Pantry", community: 2 },
  { id: "sauce", label: "Tomato Sauce", category: "Pantry", community: 2 },
  { id: "parmesan", label: "Parmesan", category: "Dairy", community: 2 },
  { id: "basil", label: "Fresh Basil", category: "Produce", community: 2 },
  { id: "chips", label: "Tortilla Chips", category: "Snacks", community: 3 },
  { id: "salsa", label: "Salsa", category: "Snacks", community: 3 },
  { id: "guac", label: "Guacamole", category: "Snacks", community: 3 },
]

export const edges: ProductEdge[] = [
  { source: "milk", target: "eggs", lift: 2.1, coOrders: 520 },
  { source: "milk", target: "yogurt", lift: 1.6, coOrders: 250 },
  { source: "milk", target: "butter", lift: 1.9, coOrders: 240 },
  { source: "eggs", target: "butter", lift: 2.4, coOrders: 230 },
  { source: "milk", target: "coffee", lift: 3.62, coOrders: 402 },
  { source: "coffee", target: "filters", lift: 5.1, coOrders: 214 },
  { source: "coffee", target: "oat", lift: 2.8, coOrders: 180 },
  { source: "pasta", target: "sauce", lift: 6.2, coOrders: 410 },
  { source: "pasta", target: "parmesan", lift: 3.9, coOrders: 160 },
  { source: "sauce", target: "basil", lift: 3.1, coOrders: 70 },
  { source: "parmesan", target: "basil", lift: 2.2, coOrders: 40 },
  { source: "chips", target: "salsa", lift: 5.8, coOrders: 330 },
  { source: "chips", target: "guac", lift: 4.4, coOrders: 120 },
  { source: "salsa", target: "guac", lift: 3.3, coOrders: 90 },
  { source: "eggs", target: "parmesan", lift: 1.3, coOrders: 60 },
]

export const nodes: ProductNode[] = products.map((p) => ({
  ...p,
  strength: edges.reduce((sum, e) => (e.source === p.id || e.target === p.id ? sum + (e.coOrders ?? 0) : sum), 0),
}))

export const defaultSelectedId = "coffee"

/** After the entrance, the graph visits one product per community, then settles back. */
export const tour = {
  stops: ["pasta", "chips", "milk", "coffee"],
  firstStepMs: 5200,
  everyMs: 4200,
}

/* ---------- Constella AI: a short chat ---------- */

export interface DemoChat {
  id: string
  /** Chip label. */
  label: string
  /** What the visitor "types". */
  prompt: string
  /** Shown with a spinner while the AI reads the network. */
  reading: string
  /** The part of the network the AI reads, placed on a 320 × 200 canvas. */
  positions: Positions
  /** The product the AI lands on; it turns peach once found. */
  focus: string
  /** The reply. Wrap key figures in **double asterisks** to bold them. */
  answer: string
  /** For campaign requests, the draft that builds up under the reply. */
  campaign?: Campaign
}

const demoChats: DemoChat[] = [
  {
    id: "pasta",
    label: "Pasta night discount",
    prompt: "Design a discount campaign for Pasta night",
    reading: "Reading the Pasta night community",
    positions: { pasta: [105, 78], sauce: [205, 58], parmesan: [150, 140], basil: [250, 125] },
    focus: "parmesan",
    answer:
      "Spaghetti and Tomato Sauce already share **410** orders, but Parmesan joins Spaghetti in only **160**. Discount the add-on, not the pair:",
    campaign: {
      name: "Pasta night kit",
      offer: "20% off Parmesan with Spaghetti and Tomato Sauce",
      slogans: ["Pasta night, sorted.", "A grate finish, now 20% off."],
    },
  },
  {
    id: "coffee",
    label: "Coffee bundle slogans",
    prompt: "Write slogans for a coffee bundle",
    reading: "Reading the Coffee community",
    positions: { milk: [62, 72], coffee: [150, 102], filters: [250, 62], oat: [232, 152] },
    focus: "coffee",
    answer:
      "Coffee Filters is Ground Coffee's strongest pair, bought together **5.10×** as often as chance, in **214** orders. These sell the two as one habit:",
    campaign: {
      name: "Morning coffee bundle",
      offer: "Ground Coffee and Coffee Filters, sold as one",
      slogans: ["Brew it right from the first scoop.", "Coffee's best pair, in one bundle."],
    },
  },
  {
    id: "anchors",
    label: "Which products hold baskets together?",
    prompt: "Which products hold baskets together?",
    reading: "Reading the whole network",
    positions: {
      coffee: [50, 60],
      milk: [125, 90],
      yogurt: [70, 150],
      butter: [178, 152],
      eggs: [210, 88],
      parmesan: [268, 55],
      pasta: [272, 140],
    },
    focus: "milk",
    answer:
      "**Whole Milk** holds the most baskets together: it's in **4** pairs and links Breakfast to Coffee. **Eggs (12)** comes next, the only link to Pasta night. Keep both at full price; they pull the rest of the basket in.",
  },
]

export const ai = {
  title: "Ask Constella AI. It reads the network for you.",
  body: "Ask a question or give it a goal. Constella AI reads the constellations in your orders, answers with the figures that matter and, when you ask for one, drafts the campaign.",
  points: [
    { title: "Grounded in your network", body: "Every answer and draft starts from real pairs and communities in your orders." },
    { title: "Shows the figures", body: "Key numbers are in the reply, so you can check them before you act." },
    { title: "Knows its limits", body: "It works from past orders and won't pretend to forecast." },
  ],
  goalsLabel: "Example questions",
  placeholder: "Ask Constella AI or give it a goal",
  name: "Constella AI",
  kind: "Campaign draft",
  footnote: "Sample data. Constella AI drafts; you decide what to launch.",
  replay: "Play again",
  chats: demoChats,
}

/* ---------- Workflow ---------- */

export type Actor = "you" | "constella" | "ai"

export const workflow = {
  title: "From order history to a launched campaign",
  body: "You bring the orders and make the final call. Constella does the analysis and the drafting in between.",
  replay: "Play again",
  actors: { you: "You", constella: "Constella", ai: "Constella AI" } satisfies Record<Actor, string>,
  steps: [
    { id: "connect", actor: "you", title: "Connect your orders", body: "Upload an order export or connect your store." },
    {
      id: "map",
      actor: "constella",
      title: "Constella maps the network",
      body: "Pairs, lift, communities and anchor products, updated as new orders arrive.",
    },
    { id: "goal", actor: "you", title: "Give Constella AI a goal", body: "Ask for a campaign, a bundle or an answer about any product." },
    { id: "draft", actor: "ai", title: "Constella AI drafts the campaign", body: "Offer and slogans, with the figures behind them." },
    { id: "launch", actor: "you", title: "Launch and compare", body: "Run it, then see how the pair's lift moves in next month's network." },
  ] satisfies { id: string; actor: Actor; title: string; body: string }[],
  preview: {
    file: "orders.csv",
    orders: 12480,
    ordersLabel: "orders",
    goal: "Design a discount campaign for Pasta night",
    campaign: "Pasta night kit",
    offer: "20% off Parmesan",
    slogan: "Pasta night, sorted.",
    pair: "Spaghetti + Parmesan",
    before: "This month",
    after: "Next month",
    beforeLift: 3.9,
    waiting: "Pending",
  },
}

/* ---------- Lift ---------- */

export const lift = {
  title: "Lift shows which pairs take off.",
  body: [
    "Popular products turn up next to everything, so counting orders alone points you at the best sellers. Lift corrects for that. At 1.00×, two products are bought together exactly as often as chance predicts: that's the launch pad. The further a pair flies past it, the more the two belong together. Pairs that stay below it rarely meet.",
    "Whole Milk shares more orders with Ground Coffee than Coffee Filters does, but the filters are the stronger pair. Lift is also the figure Constella AI leans on most when it picks what to bundle.",
  ],
  caption: "Lift and orders for six product pairs in the sample data",
  rows: [
    { id: "pasta-sauce", label: "Spaghetti + Tomato Sauce", lift: 6.2, coOrders: 410 },
    { id: "chips-salsa", label: "Tortilla Chips + Salsa", lift: 5.8, coOrders: 330 },
    { id: "coffee-filters", label: "Ground Coffee + Coffee Filters", lift: 5.1, coOrders: 214 },
    { id: "milk-coffee", label: "Whole Milk + Ground Coffee", lift: 3.62, coOrders: 402 },
    { id: "eggs-parmesan", label: "Eggs + Parmesan", lift: 1.3, coOrders: 60 },
    { id: "yogurt-chips", label: "Greek Yogurt + Tortilla Chips", lift: 0.62, coOrders: 18 },
  ] satisfies LiftRow[],
}

/* ---------- What each half does: the network finds patterns, the AI turns them into a plan ---------- */

type FeatureIcon = IconName | "ai"

export const features = {
  title: "Network analysis finds the patterns. AI turns them into a plan.",
  groups: [
    {
      name: "The network",
      icon: "network",
      items: [
        {
          icon: "network",
          title: "Pairs worth promoting",
          body: "Every pair of products bought together, with co-orders, confidence and lift, filtered to the ones above chance.",
        },
        {
          icon: "centrality",
          title: "Anchor products",
          body: "The products that connect otherwise separate baskets, ranked by how many pairs they're in and how many they bridge.",
        },
        {
          icon: "communities",
          title: "Communities that sell as a set",
          body: "Clusters of products bought together more than with anything else, found automatically.",
        },
      ],
    },
    {
      name: "Constella AI",
      icon: "ai",
      items: [
        {
          icon: "ai",
          title: "Answers you can check",
          body: "Ask in plain language. It shows the figures it used, and each one comes from your network.",
        },
        {
          icon: "tag",
          title: "Discount campaigns",
          body: "Which products to bundle, which one to discount and for whom, drafted from the pairs in your network.",
        },
        {
          icon: "pen",
          title: "Slogans and campaign copy",
          body: "Several lines for each campaign, written around what customers already buy together.",
        },
      ],
    },
  ] satisfies { name: string; icon: FeatureIcon; items: { icon: FeatureIcon; title: string; body: string }[] }[],
}

/* ---------- Call to action and footer ---------- */

export const cta = {
  title: "Find the constellations in your orders.",
  body: "Connect your order history. Constella maps the network, and Constella AI starts planning with it.",
}

export const footer = {
  tagline: "Network analysis and AI for retail: the constellations in your orders, and what to do with them.",
  legal: "© 2026 Constella",
}
