/**
 * Layouts for the network canvas. Positions are normalised to 0…1 on both axes, so the canvas can
 * map them onto whatever size it measures. Deterministic (no Math.random), so a view never jumps
 * between renders. Relative imports only, so the module also runs under plain Node for quick checks.
 */

export type UnitPositions = Record<string, [x: number, y: number]>

interface LayoutNode {
  id: string
  community?: number | null
  strength: number
}

interface LayoutEdge {
  source: string
  target: string
  /** Heavier pairs pull harder. */
  weight?: number
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/**
 * Force-directed layout (Fruchterman–Reingold with a light pull toward each community's centre),
 * seeded from a community-clustered start so groups stay together.
 * `aspect` is width / height of the canvas it will be drawn on.
 */
export function forceLayout(nodes: LayoutNode[], edges: LayoutEdge[], aspect = 1.6, iterations = 420): UnitPositions {
  const n = nodes.length
  if (n === 0) return {}
  const W = aspect
  const H = 1
  const k = Math.sqrt((W * H) / n) * 0.9
  const index = new Map(nodes.map((node, i) => [node.id, i]))

  // Start: communities on an ellipse, strongest product at each cluster's centre.
  const groups = new Map<number, number[]>()
  nodes.forEach((node, i) => {
    const key = node.community ?? -1
    groups.set(key, [...(groups.get(key) ?? []), i])
  })
  const clusters = [...groups.values()].sort((a, b) => b.length - a.length)
  const x = new Float64Array(n)
  const y = new Float64Array(n)
  clusters.forEach((members, ci) => {
    const angle = (ci / clusters.length) * Math.PI * 2 - Math.PI / 2
    const cx = W / 2 + (clusters.length > 1 ? Math.cos(angle) * W * 0.3 : 0)
    const cy = H / 2 + (clusters.length > 1 ? Math.sin(angle) * H * 0.3 : 0)
    const ordered = [...members].sort((a, b) => nodes[b].strength - nodes[a].strength)
    ordered.forEach((i, j) => {
      const r = k * 0.6 * Math.sqrt(j)
      x[i] = cx + Math.cos(j * GOLDEN + ci) * r
      y[i] = cy + Math.sin(j * GOLDEN + ci) * r
    })
  })

  const maxWeight = Math.max(1, ...edges.map((e) => e.weight ?? 1))
  const links = edges
    .filter((e) => index.has(e.source) && index.has(e.target))
    .map((e) => ({ a: index.get(e.source)!, b: index.get(e.target)!, w: 0.55 + 0.45 * Math.sqrt((e.weight ?? 1) / maxWeight) }))

  const dx = new Float64Array(n)
  const dy = new Float64Array(n)
  let temperature = W * 0.08
  const cool = temperature / (iterations + 1)

  for (let it = 0; it < iterations; it++) {
    dx.fill(0)
    dy.fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ex = x[i] - x[j]
        let ey = y[i] - y[j]
        let d2 = ex * ex + ey * ey
        if (d2 < 1e-6) {
          ex = 0.01 * ((i % 3) - 1 || 1)
          ey = 0.01
          d2 = 2e-4
        }
        const f = (k * k) / d2
        dx[i] += ex * f
        dy[i] += ey * f
        dx[j] -= ex * f
        dy[j] -= ey * f
      }
    }
    for (const { a, b, w } of links) {
      const ex = x[a] - x[b]
      const ey = y[a] - y[b]
      const d = Math.sqrt(ex * ex + ey * ey) || 1e-3
      const f = (d / k) * w
      dx[a] -= ex * f
      dy[a] -= ey * f
      dx[b] += ex * f
      dy[b] += ey * f
    }
    // Community cohesion and a gentle gravity keep loose products from drifting to the edge.
    for (const members of clusters) {
      let cx = 0
      let cy = 0
      for (const i of members) {
        cx += x[i]
        cy += y[i]
      }
      cx /= members.length
      cy /= members.length
      const pull = nodes[members[0]].community == null ? 0 : 0.35
      for (const i of members) {
        dx[i] += (cx - x[i]) * pull
        dy[i] += (cy - y[i]) * pull
      }
    }
    for (let i = 0; i < n; i++) {
      dx[i] += (W / 2 - x[i]) * 0.12
      dy[i] += (H / 2 - y[i]) * 0.12 * aspect
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1
      const step = Math.min(d, temperature)
      x[i] += (dx[i] / d) * step
      y[i] += (dy[i] / d) * step
    }
    temperature -= cool
  }

  return normalise(nodes, x, y)
}

/** Scale to fill 0…1 on both axes. */
function normalise(nodes: LayoutNode[], x: Float64Array, y: Float64Array): UnitPositions {
  const minX = Math.min(...x)
  const maxX = Math.max(...x)
  const minY = Math.min(...y)
  const maxY = Math.max(...y)
  const out: UnitPositions = {}
  nodes.forEach((node, i) => {
    out[node.id] = [(x[i] - minX) / (maxX - minX || 1), (y[i] - minY) / (maxY - minY || 1)]
  })
  return out
}

/**
 * The chosen products in the middle and everything bought with them on a ring around it, grouped by
 * community. `closeness` (0…1) pulls a partner inward: stronger pairs sit nearer the centre.
 */
export function radialLayout(nodes: LayoutNode[], focus: string[], closeness: (id: string) => number): UnitPositions {
  const out: UnitPositions = {}
  const centre: [number, number][] =
    focus.length === 1
      ? [[0.5, 0.5]]
      : focus.length === 2
        ? [
            [0.4, 0.5],
            [0.6, 0.5],
          ]
        : [
            [0.5, 0.4],
            [0.39, 0.6],
            [0.61, 0.6],
          ]
  focus.forEach((id, i) => (out[id] = centre[i] ?? [0.5, 0.5]))

  const ring = nodes
    .filter((n) => !focus.includes(n.id))
    .sort((a, b) => (a.community ?? 99) - (b.community ?? 99) || b.strength - a.strength)
  ring.forEach((node, i) => {
    const angle = (i / Math.max(1, ring.length)) * Math.PI * 2 - Math.PI / 2
    const r = 0.5 - 0.2 * Math.min(1, Math.max(0, closeness(node.id)))
    // Alternate slightly in and out so neighbours on a busy ring don't sit label to label.
    const jitter = ring.length > 10 ? (i % 2 ? 0.03 : -0.03) : 0
    out[node.id] = [0.5 + Math.cos(angle) * (r + jitter), 0.5 + Math.sin(angle) * (r + jitter)]
  })
  return out
}
