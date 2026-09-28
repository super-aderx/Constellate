import { api } from "./api"
import { baseNetwork, communities, MIN_CO_ORDERS, periods, segments, toNetwork, type Network, type PeriodId, type SegmentId } from "./store"

/**
 * The network for every period and customer segment, loaded up front (a top-level await, like
 * `store.ts`) so the Network page, Constella AI and the report can switch filters instantly.
 * Only those pages import this module, so Home doesn't wait for it.
 */

const key = (period: PeriodId, segment: SegmentId) => `${period}/${segment}`

const loaded = await Promise.all(
  periods.flatMap((p) =>
    segments.map(async (s) => {
      const k = key(p.id, s.id)
      if (k === key("90d", "all")) return [k, baseNetwork()] as const
      const n = await api.network({ start: p.start, end: p.end, segment: s.id, min_co_orders: MIN_CO_ORDERS })
      return [k, toNetwork(n)] as const
    }),
  ),
)
const networks = new Map<string, Network>(loaded)

export function getNetwork(period: PeriodId, segment: SegmentId): Network {
  return networks.get(key(period, segment)) ?? baseNetwork()
}

/**
 * How much more (or less) a segment buys from each community than all customers do, by revenue
 * share in the period: 1.3 means 30% more. Indexed by community.
 */
export function segmentAffinity(period: PeriodId, segment: SegmentId): number[] {
  const share = (n: Network) => {
    const total = n.nodes.reduce((s, x) => s + x.revenue, 0) || 1
    return communities.map((c) => n.nodes.filter((x) => x.community === c.community).reduce((s, x) => s + x.revenue, 0) / total)
  }
  const mine = share(getNetwork(period, segment))
  const all = share(getNetwork(period, "all"))
  return mine.map((v, i) => (all[i] ? v / all[i] : 1))
}
