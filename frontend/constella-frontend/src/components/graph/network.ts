import type { ProductEdge, ProductNode } from "./types"

export type Positions = Record<string, [x: number, y: number]>

/**
 * Places each community in its own cluster around the centre, with the strongest
 * products at the middle of their cluster. Deterministic, so it's safe to render on load.
 */
export function clusterLayout(nodes: ProductNode[], width: number, height: number): Positions {
  const groups = new Map<number, ProductNode[]>()
  for (const node of nodes) {
    const key = node.community ?? -1
    groups.set(key, [...(groups.get(key) ?? []), node])
  }
  const clusters = [...groups.values()].sort((a, b) => b.length - a.length)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const spacing = Math.min(width, height) * 0.075
  const positions: Positions = {}

  clusters.forEach((members, ci) => {
    const angle = (ci / clusters.length) * Math.PI * 2 - Math.PI * 0.8
    const cx = clusters.length === 1 ? width / 2 : width / 2 + Math.cos(angle) * width * 0.34
    const cy = clusters.length === 1 ? height / 2 : height / 2 + Math.sin(angle) * height * 0.3
    const byStrength = [...members].sort((a, b) => b.strength - a.strength)
    byStrength.forEach((node, i) => {
      const r = spacing * Math.sqrt(i)
      const theta = i * goldenAngle + ci * 1.3
      positions[node.id] = [cx + Math.cos(theta) * r * 1.3, cy + Math.sin(theta) * r]
    })
  })
  return positions
}

/** A product's pairs, strongest lift first. */
export function pairsOf(edges: ProductEdge[], id: string) {
  return edges
    .filter((e) => e.source === id || e.target === id)
    .map((e) => ({ partner: e.source === id ? e.target : e.source, lift: e.lift, coOrders: e.coOrders }))
    .sort((a, b) => b.lift - a.lift)
}
