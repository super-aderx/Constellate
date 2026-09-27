/**
 * Network analysis on the graph's view models, all pure. Edges are undirected; ids are product ids.
 * Relative imports only, so the module also runs under plain Node for quick checks.
 */

interface EdgeLike {
  source: string
  target: string
}

function adjacency(ids: string[], edges: EdgeLike[]) {
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]))
  for (const e of edges) {
    if (!adj.has(e.source) || !adj.has(e.target)) continue
    adj.get(e.source)!.push(e.target)
    adj.get(e.target)!.push(e.source)
  }
  return adj
}

/**
 * Articulation points: products whose removal splits their part of the network in two or more.
 * Iterative Tarjan (low-link), so deep chains can't overflow the stack.
 */
export function articulationPoints(ids: string[], edges: EdgeLike[]): Set<string> {
  const adj = adjacency(ids, edges)
  const disc = new Map<string, number>()
  const low = new Map<string, number>()
  const result = new Set<string>()
  let time = 0

  for (const root of ids) {
    if (disc.has(root)) continue
    let rootChildren = 0
    disc.set(root, time)
    low.set(root, time++)
    // Stack frames: node, parent, index of the next neighbour to visit.
    const stack: [string, string | null, number][] = [[root, null, 0]]
    while (stack.length) {
      const frame = stack[stack.length - 1]
      const [v, parent] = frame
      const next = adj.get(v)!
      if (frame[2] < next.length) {
        const w = next[frame[2]++]
        if (w === parent) continue
        if (disc.has(w)) {
          low.set(v, Math.min(low.get(v)!, disc.get(w)!))
        } else {
          disc.set(w, time)
          low.set(w, time++)
          if (v === root) rootChildren++
          stack.push([w, v, 0])
        }
      } else {
        stack.pop()
        if (parent != null) {
          low.set(parent, Math.min(low.get(parent)!, low.get(v)!))
          if (parent !== root && low.get(v)! >= disc.get(parent)!) result.add(parent)
        }
      }
    }
    if (rootChildren > 1) result.add(root)
  }
  return result
}

/** Connected groups of products, largest first. `without` leaves one product out, to show what it holds together. */
export function components(ids: string[], edges: EdgeLike[], without?: string): string[][] {
  const kept = ids.filter((id) => id !== without)
  const adj = adjacency(kept, edges)
  const seen = new Set<string>()
  const groups: string[][] = []
  for (const start of kept) {
    if (seen.has(start)) continue
    const group: string[] = []
    const queue = [start]
    seen.add(start)
    while (queue.length) {
      const v = queue.shift()!
      group.push(v)
      for (const w of adj.get(v)!) {
        if (!seen.has(w)) {
          seen.add(w)
          queue.push(w)
        }
      }
    }
    groups.push(group)
  }
  return groups.sort((a, b) => b.length - a.length)
}

/**
 * The part of the network around some products: them, everything bought with them, and every pair
 * among those, including pairs between two partners that don't involve the chosen products at all.
 */
export function egoNetwork<E extends EdgeLike>(edges: E[], focus: string[]) {
  const ids = new Set(focus)
  for (const e of edges) {
    if (focus.includes(e.source)) ids.add(e.target)
    if (focus.includes(e.target)) ids.add(e.source)
  }
  return { ids, edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)) }
}

/** Whether a pair touches any of the given products. */
export function touches(e: EdgeLike, ids: Iterable<string>) {
  for (const id of ids) if (e.source === id || e.target === id) return true
  return false
}

/** Pairs that are the only link between two parts of the network: remove one and the parts separate. */
export function bridgePairs<E extends EdgeLike>(ids: string[], edges: E[]): E[] {
  const before = components(ids, edges).length
  return edges.filter((e) => components(ids, edges.filter((x) => x !== e)).length > before)
}
