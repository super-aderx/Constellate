import type { Segment } from "@/components/assistant"
import type { LiftRow } from "@/components/charts/LiftDotPlot"
import { articulationPoints, components } from "@/components/graph"
import { summarise, type CampaignRecord } from "@/data/campaigns"
import {
  communities,
  getNetwork,
  periodById,
  productById,
  products,
  recentChange,
  segmentById,
  series,
  seriesOf,
  type PeriodId,
  type SegmentId,
} from "@/data/store"
import { fmt } from "@/lib/format"

/**
 * The business report, written from the data (simulated Constella AI). Sales use the 12 weekly
 * figures; pairs, communities and bridges use the chosen period and customers.
 */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const name = (id: string) => productById[id].label

export function buildReport(periodId: PeriodId, segmentId: SegmentId, campaigns: CampaignRecord[]) {
  const period = periodById(periodId)
  const segment = segmentById(segmentId)
  const net = getNetwork(periodId, segmentId)
  const where = `${period.range}, ${segment.label.toLowerCase()}`

  const last4 = (id: string) => sum(series[id].revenue.slice(-4))
  const prev4 = (id: string) => sum(series[id].revenue.slice(-8, -4))
  const revenue = sum(products.map((p) => last4(p.id)))
  const revenueBefore = sum(products.map((p) => prev4(p.id)))
  const byChange = products.map((p) => ({ p, change: recentChange(series[p.id].revenue), revenue: last4(p.id) }))
  const top = [...byChange].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const rising = [...byChange].sort((a, b) => b.change - a.change).slice(0, 3)
  const falling = [...byChange].sort((a, b) => a.change - b.change).slice(0, 3)

  const byLift = [...net.edges].sort((a, b) => b.lift - a.lift)
  const pairs: LiftRow[] = byLift.slice(0, 6).map((e) => ({ id: `${e.source}-${e.target}`, label: `${name(e.source)} and ${name(e.target)}`, lift: e.lift, coOrders: e.coOrders }))
  const nearChance = [...net.edges].filter((e) => e.lift < 1.8).sort((a, b) => b.coOrders - a.coOrders)[0]

  // Products and revenue follow the period and customers (the scoped network); the 4-week trend is
  // weekly sales of those products from all customers, since weekly sales aren't split by segment.
  const communityRows = communities
    .map((c) => {
      const members = net.nodes.filter((n) => n.community === c.community)
      return {
        ...c,
        products: members.length,
        revenue: sum(members.map((n) => n.revenue)),
        change: recentChange(seriesOf(members.map((n) => n.id))),
      }
    })
    .filter((c) => c.products > 0)
    .sort((a, b) => b.revenue - a.revenue)

  const ids = net.nodes.map((n) => n.id)
  const bridges = [...articulationPoints(ids, net.edges)]
    .map((id) => {
      const before = components(ids, net.edges).find((g) => g.includes(id)) ?? []
      return { id, cut: components(before, net.edges, id).slice(1).flat() }
    })
    .sort((a, b) => b.cut.length - a.cut.length)

  const results = campaigns
    .filter((c) => c.results && (c.status === "active" || c.status === "ended" || c.status === "paused"))
    .map((c) => ({ c, s: summarise(c.results!) }))

  const bestCampaign = [...results].sort((a, b) => b.s.returnRatio - a.s.returnRatio)[0]
  const weakest = [...results].sort((a, b) => a.s.returnRatio - b.s.returnRatio)[0]
  const growing = communityRows.reduce((a, b) => (b.change > a.change ? b : a))
  const pastaEdge = net.edges.find((e) => (e.source === "pasta" && e.target === "parmesan") || (e.source === "parmesan" && e.target === "pasta"))

  const summary: Segment[] = [
    "Revenue from these 30 products was ",
    { value: fmt.money(revenue), source: "Revenue, last 4 weeks (Aug 30 – Sep 26)" },
    ` over the last 4 weeks, ${revenue >= revenueBefore ? "up" : "down"} `,
    { value: fmt.change(revenue / revenueBefore - 1), source: "Revenue, last 4 weeks vs the 4 before" },
    ` on the 4 weeks before. ${growing.label} grew fastest. The strongest pair is ${name(byLift[0].source)} and ${name(byLift[0].target)}, at `,
    { value: fmt.lift(byLift[0].lift), source: `Lift, ${where}` },
    `, and ${bridges.length} bridge products hold the store's baskets together.`,
  ]

  const recommendations: { title: string; body: Segment[]; prompt?: string }[] = [
    ...(pastaEdge
      ? [
          {
            title: "Run a Pasta night discount on Parmesan",
            body: [
              "Parmesan is Spaghetti's strong pair (",
              { value: fmt.lift(pastaEdge.lift), source: `Lift, ${where}` },
              ") but only ",
              { value: fmt.pct(pastaEdge.source === "pasta" ? pastaEdge.confidenceAB : pastaEdge.confidenceBA), source: `Share of Spaghetti orders with Parmesan, ${where}` },
              " of Spaghetti orders include it. Discount the add-on and keep Spaghetti at full price.",
            ] as Segment[],
            prompt: "Design a discount campaign for Pasta night",
          },
        ]
      : []),
    {
      title: "Check Coffee Filters stock",
      body: [
        "Coffee Filters fell ",
        { value: fmt.change(recentChange(series.filters.revenue)), source: "Coffee Filters revenue, last 4 weeks vs the 4 before" },
        " while Ground Coffee grew, and the Morning coffee bundle's orders dropped in its last week. That points to supply, not demand.",
      ],
    },
    ...(bridges[0]
      ? [
          {
            title: `Keep ${name(bridges[0].id)} full price and in stock`,
            body: [`It's the only link to ${bridges[0].cut.map(name).join(", ")}. Discount the products it brings in, not ${name(bridges[0].id)} itself.`] as Segment[],
            prompt: `What happens if ${name(bridges[0].id)} is out of stock?`,
          },
        ]
      : []),
    ...(nearChance
      ? [
          {
            title: `Don't discount ${name(nearChance.source)} with ${name(nearChance.target)}`,
            body: [
              "They share ",
              { value: fmt.int(nearChance.coOrders), source: `Orders together, ${where}` },
              " orders but at ",
              { value: fmt.lift(nearChance.lift), source: `Lift, ${where}` },
              " they're only popular, not a pair. A discount would pay for sales you already have.",
            ] as Segment[],
          },
        ]
      : []),
  ]

  return {
    period,
    segment,
    where,
    summary,
    kpis: {
      revenue,
      revenueChange: revenue / revenueBefore - 1,
      orders: net.orders,
      pairs: net.edges.length,
      bridges: bridges.length,
    },
    top,
    rising,
    falling,
    pairs,
    nearChance,
    communityRows,
    bridges,
    results,
    bestCampaign,
    weakest,
    recommendations,
  }
}

export type Report = ReturnType<typeof buildReport>
