import type { Segment } from "@/components/assistant"
import type { LiftRow } from "@/components/charts/LiftDotPlot"
import { articulationPoints, components } from "@/components/graph"
import { summarise, type CampaignRecord } from "@/data/campaigns"
import { getNetwork } from "@/data/networks"
import {
  communities,
  communityLabel,
  periodById,
  productById,
  products,
  recentChange,
  segmentById,
  series,
  seriesOf,
  weeks,
  type PeriodId,
  type SegmentId,
} from "@/data/store"
import { fmt } from "@/lib/format"

/**
 * The business report, written from the data (simulated Constella AI). Sales use the 12 weekly
 * figures; pairs, communities and bridges use the chosen period and customers.
 */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const name = (id: string) => productById[id]?.label ?? id

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
  // The discount to run: a strong pair (lift ≥ 2.5) that the fewest of the anchor's orders include.
  const ordersOf = (id: string) => net.nodes.find((n) => n.id === id)?.orders ?? 0
  const discount = net.edges
    .filter((e) => e.lift >= 2.5)
    .map((e) => {
      const sourceLeads = ordersOf(e.source) >= ordersOf(e.target)
      return { e, anchor: sourceLeads ? e.source : e.target, addon: sourceLeads ? e.target : e.source, attach: sourceLeads ? e.confidenceAB : e.confidenceBA }
    })
    .sort((a, b) => a.attach - b.attach)[0]
  // The stock check: the product that fell most while its strongest partner grew.
  const stockCheck = falling
    .map((f) => {
      const partner = [...net.edges].filter((e) => e.source === f.p.id || e.target === f.p.id).sort((a, b) => b.lift - a.lift)[0]
      const other = partner ? (partner.source === f.p.id ? partner.target : partner.source) : null
      return { ...f, partner: other, partnerChange: other && series[other] ? recentChange(series[other].revenue) : 0 }
    })
    .find((f) => f.change < 0)
  const last4Range = `${weeks[weeks.length - 4].label} – ${weeks[weeks.length - 1].label}`

  const summary: Segment[] = [
    `Revenue from these ${products.length} products was `,
    { value: fmt.money(revenue), source: `Revenue, last 4 weeks (weeks of ${last4Range})` },
    ` over the last 4 weeks, ${revenue >= revenueBefore ? "up" : "down"} `,
    { value: fmt.change(revenue / revenueBefore - 1), source: "Revenue, last 4 weeks vs the 4 before" },
    ` on the 4 weeks before. ${growing.label} grew fastest. The strongest pair is ${name(byLift[0].source)} and ${name(byLift[0].target)}, at `,
    { value: fmt.lift(byLift[0].lift), source: `Lift, ${where}` },
    `, and ${bridges.length} bridge products hold the store's baskets together.`,
  ]

  const recommendations: { title: string; body: Segment[]; prompt?: string }[] = [
    ...(discount
      ? [
          {
            title: `Run a ${communityLabel(productById[discount.anchor]?.community)} discount on ${name(discount.addon)}`,
            body: [
              `${name(discount.addon)} is ${name(discount.anchor)}'s strong pair (`,
              { value: fmt.lift(discount.e.lift), source: `Lift, ${where}` },
              ") but only ",
              { value: fmt.pct(discount.attach), source: `Share of ${name(discount.anchor)} orders with ${name(discount.addon)}, ${where}` },
              ` of ${name(discount.anchor)} orders include it. Discount the add-on and keep ${name(discount.anchor)} at full price.`,
            ] as Segment[],
            prompt: `Design a discount for ${name(discount.addon)} with ${name(discount.anchor)}`,
          },
        ]
      : []),
    ...(stockCheck
      ? [
          {
            title: `Check ${stockCheck.p.label} stock`,
            body: [
              `${stockCheck.p.label} fell `,
              { value: fmt.change(stockCheck.change), source: `${stockCheck.p.label} revenue, last 4 weeks vs the 4 before` },
              stockCheck.partner && stockCheck.partnerChange > 0
                ? ` while ${name(stockCheck.partner)}, its strongest pair, grew. That points to supply, not demand.`
                : ". Check stock and shelf placement before changing its price.",
            ] as Segment[],
          },
        ]
      : []),
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
