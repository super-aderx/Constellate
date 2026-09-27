import type { Segment } from "@/components/assistant"
import { communityLabel, communitySeries, communities, productById, recentChange, type NetEdge, type Period, type Segment as CustomerSegment } from "@/data/store"
import { fmt } from "@/lib/format"
import type { Scope, View } from "./content"
import { cutOffBy, type NetworkModel } from "./model"

/**
 * Simulated Constella AI reading of the graph in view. Every figure is computed from the same model
 * the canvas draws, so the text always matches the picture.
 */

export type Signal = "strong" | "watch" | "opportunity"

export interface Insights {
  headline: Segment[]
  points: { signal: Signal; text: Segment[] }[]
  /** A follow-up question for Constella AI. */
  ask: string
  /** A campaign request for Constella AI. */
  draft: string
}

interface Context {
  scope: Scope
  view: View
  period: Period
  segment: CustomerSegment
}

const name = (id: string) => productById[id]?.label ?? id
const other = (e: NetEdge, id: string) => (e.source === id ? e.target : e.source)
const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`)

export function readNetwork(model: NetworkModel, ctx: Context): Insights {
  const where = `${ctx.period.range}, ${ctx.segment.label.toLowerCase()}`
  const src = {
    pair: (a: string, b: string) => `Orders with ${name(a)} and ${name(b)}, ${where}`,
    lift: (a: string, b: string) => `Lift for ${name(a)} and ${name(b)}, ${where}`,
    pairs: `Pairs in view, ${where}`,
    product: (id: string) => `Pairs for ${name(id)}, ${where}`,
    revenue: (label: string) => `${label} revenue, ${where}`,
    trend: (label: string) => `${label} revenue, last 4 weeks vs the 4 before`,
  }
  const edges = model.edges
  if (edges.length === 0) {
    return { headline: ["There are no pairs to read in this selection."], points: [], ask: "", draft: "" }
  }
  const byLift = [...edges].sort((a, b) => b.lift - a.lift)

  if (ctx.scope === "products" && model.focus.length > 0) return readProducts(model, src)

  if (ctx.view === "bridges") {
    const ranked = [...model.bridges]
      .map((id) => ({ id, cut: cutOffBy(model, id) }))
      .sort((a, b) => b.cut.length - a.cut.length)
    if (ranked.length === 0) {
      return {
        headline: ["No single product holds this network together: every part is linked more than one way."],
        points: [],
        ask: "Which products hold baskets together?",
        draft: "",
      }
    }
    const [top, ...rest] = ranked
    const topCut = top.cut.map(name)
    const fragile = [...model.bridgeEdges].sort((a, b) => a.coOrders - b.coOrders)[0]
    return {
      headline: [
        { value: String(ranked.length), source: src.pairs },
        ` products hold your store together. Without ${name(top.id)}, `,
        { value: String(top.cut.length), source: src.product(top.id) },
        ` ${top.cut.length === 1 ? "product loses its" : "products lose their"} only link to the rest: ${list(topCut.slice(0, 4))}${topCut.length > 4 ? " and more" : ""}.`,
      ],
      points: [
        ...rest.slice(0, 2).map((r) => ({
          signal: "strong" as Signal,
          text: [`${name(r.id)} is the only way into ${list(r.cut.slice(0, 3).map(name))}${r.cut.length > 3 ? " and more" : ""}.`] as Segment[],
        })),
        ...(fragile
          ? [
              {
                signal: "watch" as Signal,
                text: [
                  `The thinnest link is ${name(fragile.source)} with ${name(fragile.target)}, in only `,
                  { value: fmt.int(fragile.coOrders), source: src.pair(fragile.source, fragile.target) },
                  " orders. If either goes out of stock, that side of the store stops being bought with the rest.",
                ] as Segment[],
              },
            ]
          : []),
        {
          signal: "opportunity",
          text: [`Keep ${name(top.id)} at full price and on the shelf. Discount the products it brings in instead.`],
        },
      ],
      ask: `What happens to baskets if ${name(top.id)} is out of stock?`,
      draft: `Design a campaign around ${name(top.id)}`,
    }
  }

  if (ctx.view === "communities") {
    const present = communities.filter((c) => model.nodes.some((n) => n.community === c.community))
    const revenue = present
      .map((c) => ({ ...c, revenue: model.nodes.filter((n) => n.community === c.community).reduce((s, n) => s + n.revenue, 0) }))
      .sort((a, b) => b.revenue - a.revenue)
    const trends = present.map((c) => ({ ...c, change: recentChange(communitySeries(c.community)) })).sort((a, b) => b.change - a.change)
    const rising = trends[0]
    const slowest = trends[trends.length - 1]
    const cross = byLift.filter((e) => productById[e.source].community !== productById[e.target].community)
    const link = cross[0]
    return {
      headline: [
        "Your orders form ",
        { value: String(present.length), source: src.pairs },
        ` communities. ${revenue[0].label} is the biggest, with `,
        { value: fmt.money(revenue[0].revenue), source: src.revenue(revenue[0].label) },
        " in sales.",
      ],
      points: [
        {
          signal: "strong",
          text: [`${rising.label} is growing fastest, up `, { value: fmt.change(rising.change), source: src.trend(rising.label) }, " on the 4 weeks before."],
        },
        {
          signal: "watch",
          text: [
            `${slowest.label} is ${slowest.change < 0 ? "down " : "only up "}`,
            { value: fmt.change(slowest.change), source: src.trend(slowest.label) },
            ". Check whether a key product in it ran short.",
          ],
        },
        ...(link
          ? [
              {
                signal: "opportunity" as Signal,
                text: [
                  `The strongest link between communities is ${name(link.source)} (${communityLabel(productById[link.source].community)}) with ${name(link.target)} (${communityLabel(productById[link.target].community)}), at `,
                  { value: fmt.lift(link.lift), source: src.lift(link.source, link.target) },
                  ". A cross-community bundle could pull shoppers from one into the other.",
                ] as Segment[],
              },
            ]
          : []),
      ],
      ask: `Why is ${slowest.label} ${slowest.change < 0 ? "falling" : "growing slowly"}?`,
      draft: `Design a discount campaign for ${rising.label}`,
    }
  }

  // Pairs
  const top = byLift[0]
  const hub = [...model.nodes].sort((a, b) => b.degree - a.degree || b.strength - a.strength)[0]
  const untapped = byLift.filter((e) => e.lift >= 3).sort((a, b) => a.coOrders - b.coOrders)[0]
  const popular = [...edges].filter((e) => e.lift < 1.8).sort((a, b) => b.coOrders - a.coOrders)[0]
  return {
    headline: [
      `${name(top.source)} and ${name(top.target)} are your strongest pair, bought together `,
      { value: fmt.lift(top.lift), source: src.lift(top.source, top.target) },
      " as often as chance, in ",
      { value: fmt.int(top.coOrders), source: src.pair(top.source, top.target) },
      " orders.",
    ],
    points: [
      {
        signal: "strong",
        text: [
          `${hub.label} is bought with `,
          { value: String(hub.degree), source: src.product(hub.id) },
          " products, more than anything else, which makes it the easiest way into other baskets.",
        ],
      },
      ...(popular
        ? [
            {
              signal: "watch" as Signal,
              text: [
                `${name(popular.source)} and ${name(popular.target)} share `,
                { value: fmt.int(popular.coOrders), source: src.pair(popular.source, popular.target) },
                " orders, but at ",
                { value: fmt.lift(popular.lift), source: src.lift(popular.source, popular.target) },
                " that's close to chance: they're both just popular. Don't spend a discount on them.",
              ] as Segment[],
            },
          ]
        : []),
      ...(untapped && untapped !== top
        ? [
            {
              signal: "opportunity" as Signal,
              text: [
                `${name(untapped.source)} and ${name(untapped.target)} are bought together `,
                { value: fmt.lift(untapped.lift), source: src.lift(untapped.source, untapped.target) },
                " as often as chance, but in only ",
                { value: fmt.int(untapped.coOrders), source: src.pair(untapped.source, untapped.target) },
                " orders. Shelving them side by side could grow the pair.",
              ] as Segment[],
            },
          ]
        : []),
    ],
    ask: `What else sells with ${hub.label}?`,
    draft: untapped ? `Design a bundle for ${name(untapped.source)} and ${name(untapped.target)}` : `Design a bundle for ${name(top.source)} and ${name(top.target)}`,
  }

  function readProducts(m: NetworkModel, s: typeof src): Insights {
    const focus = m.focus
    const partnersOf = (id: string) => m.edges.filter((e) => e.source === id || e.target === id)
    const side = [...m.edges].filter((e) => !focus.includes(e.source) && !focus.includes(e.target)).sort((a, b) => b.lift - a.lift)[0]

    if (focus.length > 1) {
      const sets = focus.map((id) => new Set(partnersOf(id).map((e) => other(e, id))))
      const shared = [...sets[0]].filter((id) => !focus.includes(id) && sets.every((set) => set.has(id)))
      const direct = m.edges.filter((e) => focus.includes(e.source) && focus.includes(e.target))
      return {
        headline: [
          `${list(focus.map(name))} share `,
          { value: String(shared.length), source: s.pairs },
          ` ${shared.length === 1 ? "partner" : "partners"}${shared.length ? `: ${list(shared.slice(0, 4).map(name))}` : ""}.`,
        ],
        points: [
          ...direct.map((e) => ({
            signal: "strong" as Signal,
            text: [`${name(e.source)} and ${name(e.target)} are bought together themselves, `, { value: fmt.lift(e.lift), source: s.lift(e.source, e.target) }, " as often as chance."] as Segment[],
          })),
          ...(direct.length === 0
            ? [{ signal: "watch" as Signal, text: [`${list(focus.map(name))} aren't bought together directly. They only meet through the partners they share.`] as Segment[] }]
            : []),
          ...(side
            ? [
                {
                  signal: "opportunity" as Signal,
                  text: [`${name(side.source)} and ${name(side.target)} connect these baskets on their own, at `, { value: fmt.lift(side.lift), source: s.lift(side.source, side.target) }, "."] as Segment[],
                },
              ]
            : []),
        ],
        ask: `How do ${list(focus.map(name))} compare?`,
        draft: `Design a campaign for ${list(focus.map(name))}`,
      }
    }

    const id = focus[0]
    const mine = partnersOf(id).sort((a, b) => b.lift - a.lift)
    const best = mine[0]
    const byCategory = new Map<string, number>()
    for (const e of mine) {
      const cat = productById[other(e, id)].category
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + e.coOrders)
    }
    const total = mine.reduce((sum, e) => sum + e.coOrders, 0)
    const [topCategory, topCategoryOrders] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]
    const lowAttach = mine.filter((e) => e.lift >= 2.5).sort((a, b) => (a.source === id ? a.confidenceAB : a.confidenceBA) - (b.source === id ? b.confidenceAB : b.confidenceBA))[0]
    const attach = lowAttach ? (lowAttach.source === id ? lowAttach.confidenceAB : lowAttach.confidenceBA) : 0
    return {
      headline: [
        `${name(id)} is bought with `,
        { value: String(mine.length), source: s.product(id) },
        ` products. Its strongest pair is ${name(other(best, id))}, `,
        { value: fmt.lift(best.lift), source: s.lift(best.source, best.target) },
        " as often as chance, in ",
        { value: fmt.int(best.coOrders), source: s.pair(best.source, best.target) },
        " orders.",
      ],
      points: [
        ...(side
          ? [
              {
                signal: "strong" as Signal,
                text: [
                  `${name(side.source)} and ${name(side.target)}, both bought with ${name(id)}, are also bought with each other, `,
                  { value: fmt.lift(side.lift), source: s.lift(side.source, side.target) },
                  " as often as chance. A three-product bundle would sell a basket people already make.",
                ] as Segment[],
              },
            ]
          : []),
        {
          signal: "watch",
          text: [`${topCategory} products are in `, { value: fmt.pct(topCategoryOrders / (total || 1)), source: s.product(id) }, ` of its paired orders.`],
        },
        ...(lowAttach
          ? [
              {
                signal: "opportunity" as Signal,
                text: [
                  `Only `,
                  { value: fmt.pct(attach), source: s.pair(lowAttach.source, lowAttach.target) },
                  ` of ${name(id)} orders include ${name(other(lowAttach, id))}, though the pair is strong. A small discount on ${name(other(lowAttach, id))} with ${name(id)} could lift that.`,
                ] as Segment[],
              },
            ]
          : []),
      ],
      ask: `What sells with ${name(id)}?`,
      draft: lowAttach ? `Design a discount for ${name(other(lowAttach, id))} with ${name(id)}` : `Write slogans for ${name(id)}`,
    }
  }
}
