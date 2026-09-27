import {
  articulationPoints,
  bridgePairs,
  components,
  egoNetwork,
  forceLayout,
  radialLayout,
  touches,
  type UnitPositions,
} from "@/components/graph"
import { baseNetwork, getNetwork, type NetEdge, type NetNode, type Network, type PeriodId, type SegmentId } from "@/data/store"
import type { Scope } from "./content"

/** What the canvas draws for the current filters, plus the analysis the cards and insights read. */
export interface NetworkModel {
  network: Network
  nodes: NetNode[]
  edges: NetEdge[]
  /** Chosen products still in the data for this selection. */
  focus: string[]
  bridges: Set<string>
  bridgeEdges: Set<NetEdge>
  byId: Record<string, NetNode>
}

export function buildModel(period: PeriodId, segment: SegmentId, scope: Scope, chosen: string[]): NetworkModel {
  const network = getNetwork(period, segment)
  const present = new Set(network.nodes.map((n) => n.id))
  const focus = chosen.filter((id) => present.has(id))
  let nodes = network.nodes
  let edges = network.edges
  if (scope === "products") {
    const ego = egoNetwork(network.edges, focus)
    nodes = network.nodes.filter((n) => ego.ids.has(n.id))
    edges = ego.edges
  }
  const ids = nodes.map((n) => n.id)
  return {
    network,
    nodes,
    edges,
    focus,
    bridges: articulationPoints(ids, edges),
    bridgeEdges: new Set(bridgePairs(ids, edges)),
    byId: Object.fromEntries(nodes.map((n) => [n.id, n])),
  }
}

/** Products that lose their link to the rest if `id` goes: every piece but the largest. */
export function cutOffBy(model: NetworkModel, id: string): string[] {
  const ids = model.nodes.map((n) => n.id)
  const before = components(ids, model.edges).find((g) => g.includes(id)) ?? []
  const pieces = components(before, model.edges, id)
  return pieces.slice(1).flat()
}

/** Store layouts are computed once on the full 90 days, so products keep their place as filters change. */
const storeLayouts = new Map<string, UnitPositions>()
export function storeLayout(narrow: boolean): UnitPositions {
  const key = narrow ? "narrow" : "wide"
  let pos = storeLayouts.get(key)
  if (!pos) {
    const base = baseNetwork()
    pos = forceLayout(
      base.nodes,
      base.edges.map((e) => ({ source: e.source, target: e.target, weight: e.coOrders })),
      narrow ? 0.95 : 1.75,
    )
    storeLayouts.set(key, pos)
  }
  return pos
}

/** The chosen products in the middle; partners with a higher lift to them sit closer in. */
export function productLayout(model: NetworkModel): UnitPositions {
  const best = new Map<string, number>()
  for (const e of model.edges) {
    if (!touches(e, model.focus)) continue
    const partner = model.focus.includes(e.source) ? e.target : e.source
    best.set(partner, Math.max(best.get(partner) ?? 0, e.lift))
  }
  const lifts = [...best.values()]
  const lo = Math.min(...lifts)
  const range = Math.max(...lifts) - lo || 1
  return radialLayout(model.nodes, model.focus, (id) => ((best.get(id) ?? lo) - lo) / range)
}

/** A product's pairs in the whole network for the filters (not only the ones drawn), strongest lift first. */
export function pairsFor(network: Network, id: string) {
  return network.edges
    .filter((e) => e.source === id || e.target === id)
    .map((e) => ({ edge: e, partner: e.source === id ? e.target : e.source }))
    .sort((a, b) => b.edge.lift - a.edge.lift)
}

export const findEdge = (edges: NetEdge[], a: string, b: string) =>
  edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a))
