import { useEffect, useId, useMemo, useState, type KeyboardEvent, type SVGProps } from "react"
import { cn } from "@/lib/utils"
import { clusterLayout, pairsOf, type Positions } from "./network"
import { GRAPH_INTRO_MS } from "./timing"
import { communityColor, type ProductEdge, type ProductNode } from "./types"

interface ConstellationGraphProps {
  nodes: ProductNode[]
  edges: ProductEdge[]
  /** viewBox size; the graph scales to its container's width. */
  width?: number
  height?: number
  /** Fixed positions in viewBox units; otherwise communities are clustered automatically. */
  positions?: Positions
  selectedId: string | null
  onSelect?: (id: string | null) => void
  /** false renders a picture (no hover, focus or selection by the visitor), e.g. in demos. */
  interactive?: boolean
  /** false hides product names, for thumbnails where they'd be too small to read. */
  labels?: boolean
  label?: string
  className?: string
}

const COMMUNITY_GRADIENTS = [0, 1, 2, 3, 4, 5, 6, 7, null] as const

/**
 * The product network on the navy sky, always drawn in Night values.
 * Node size = strength, edge width = lift. Hovering or focusing a product lights up its pairs;
 * selecting one turns it peach, pops it, and sends a light along each of its pairs.
 * On load the stars appear, then the pairs draw in.
 */
export function ConstellationGraph({
  nodes,
  edges,
  width = 640,
  height = 420,
  positions: fixedPositions,
  selectedId,
  onSelect,
  interactive = true,
  labels = true,
  label,
  className,
}: ConstellationGraphProps) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [introDone, setIntroDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setIntroDone(true), GRAPH_INTRO_MS)
    return () => clearTimeout(timer)
  }, [])
  const selectionDelay = introDone ? "0ms" : `${GRAPH_INTRO_MS}ms`
  const positions = useMemo(
    () => fixedPositions ?? clusterLayout(nodes, width, height),
    [fixedPositions, nodes, width, height],
  )
  const gid = "g" + useId().replace(/[^A-Za-z0-9_-]/g, "")

  const maxStrength = Math.max(1, ...nodes.map((n) => n.strength))
  const lifts = edges.map((e) => e.lift)
  const minLift = Math.min(...lifts)
  const liftRange = Math.max(...lifts) - minLift || 1
  const radius = (n: ProductNode) => 3 + 11 * Math.sqrt(n.strength / maxStrength)
  const edgeWidth = (e: ProductEdge) => 0.5 + 3.5 * ((e.lift - minLift) / liftRange)

  // Stars appear strongest first; the entrance order is stable across re-renders.
  const entranceOrder = new Map([...nodes].sort((a, b) => b.strength - a.strength).map((n, i) => [n.id, i]))

  const focusId = hoverId ?? selectedId
  const lit = new Set<string>()
  if (focusId) {
    lit.add(focusId)
    for (const e of edges) {
      if (e.source === focusId) lit.add(e.target)
      if (e.target === focusId) lit.add(e.source)
    }
  }

  const toggle = (id: string) => onSelect?.(id === selectedId ? null : id)
  const nodeControls = (n: ProductNode): SVGProps<SVGGElement> =>
    interactive
      ? {
          tabIndex: 0,
          role: "button",
          "aria-label": n.category ? `${n.label}, ${n.category}` : n.label,
          "aria-pressed": selectedId === n.id,
          className: "group/node cursor-pointer outline-none",
          onMouseEnter: () => setHoverId(n.id),
          onMouseLeave: () => setHoverId(null),
          onFocus: () => setHoverId(n.id),
          onBlur: () => setHoverId(null),
          onClick: () => toggle(n.id),
          onKeyDown: (ev: KeyboardEvent<SVGGElement>) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault()
              toggle(n.id)
            }
          },
        }
      : {}
  const gradient = (community?: number | null) =>
    `url(#${gid}-${community == null || community < 0 || community >= 8 ? "rest" : community})`

  return (
    <div data-theme="night" className={cn("bg-sky text-ink", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role={interactive ? "group" : "img"}
        aria-label={label ?? `Product network: ${nodes.length} products, ${edges.length} pairs`}
        // overflow-visible: labels near the edge may run into the container's padding instead of being clipped
        className="block h-auto w-full overflow-visible"
      >
        <defs>
          {COMMUNITY_GRADIENTS.map((c) => {
            const color = communityColor(c)
            return (
              <radialGradient key={c ?? "rest"} id={`${gid}-${c ?? "rest"}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${color} 45%, #ffffff)` }} />
                <stop offset="100%" style={{ stopColor: color }} />
              </radialGradient>
            )
          })}
          <radialGradient id={`${gid}-star`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" style={{ stopColor: "var(--star-light)" }} />
            <stop offset="100%" style={{ stopColor: "var(--star-deep)" }} />
          </radialGradient>
          <radialGradient id={`${gid}-glow`}>
            <stop offset="0%" style={{ stopColor: "var(--star)", stopOpacity: 0.55 }} />
            <stop offset="100%" style={{ stopColor: "var(--star)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        <g aria-hidden>
          {edges.map((e, i) => {
            const a = positions[e.source]
            const b = positions[e.target]
            if (!a || !b) return null
            const hot = focusId != null && (e.source === focusId || e.target === focusId)
            return (
              <line
                key={`${e.source}-${e.target}`}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                pathLength={1}
                strokeDasharray={1}
                strokeWidth={edgeWidth(e)}
                strokeLinecap="round"
                stroke={hot ? "var(--edge-strong)" : "var(--edge)"}
                opacity={focusId != null && !hot ? 0.35 : 1}
                className="animate-edge-draw motion-reduce:animate-none"
                style={{ animationDelay: `${650 + i * 40}ms`, transition: "stroke 240ms, opacity 240ms" }}
              />
            )
          })}
        </g>

        {/* A light runs from the selected star to each partner; keyed so it replays per selection */}
        <g aria-hidden className="motion-reduce:hidden">
          {selectedId &&
            positions[selectedId] &&
            pairsOf(edges, selectedId).map((pair, i) => {
              const a = positions[selectedId]
              const b = positions[pair.partner]
              if (!b) return null
              return (
                <line
                  key={`${selectedId}-${pair.partner}`}
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  pathLength={1}
                  strokeDasharray="0.14 2"
                  strokeWidth={3}
                  strokeLinecap="round"
                  stroke="var(--star-light)"
                  className="animate-signal"
                  style={{ animationDelay: `calc(${selectionDelay} + ${i * 90}ms)` }}
                />
              )
            })}
        </g>

        <g>
          {nodes.map((n) => {
            const p = positions[n.id]
            if (!p) return null
            const r = radius(n)
            const selected = selectedId === n.id
            const dim = focusId != null && !lit.has(n.id)
            return (
              <g
                key={n.id}
                transform={`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`}
                style={{ opacity: dim ? 0.35 : 1, transition: "opacity 240ms" }}
                {...nodeControls(n)}
              >
                <g
                  className="origin-center animate-star-in [transform-box:fill-box] motion-reduce:animate-none"
                  style={{ animationDelay: `${(entranceOrder.get(n.id) ?? 0) * 45}ms` }}
                >
                  {/* Hit area larger than small stars */}
                  {interactive && <circle r={Math.max(r, 14)} fill="transparent" />}
                  {selected ? (
                    <g
                      className="origin-center animate-star-pop [transform-box:fill-box] motion-reduce:animate-none"
                      style={{ animationDelay: selectionDelay }}
                    >
                      <circle r={r * 2.6 + 6} fill={`url(#${gid}-glow)`} />
                      <circle r={r} fill={`url(#${gid}-star)`} />
                    </g>
                  ) : (
                    <circle r={r} fill={gradient(n.community)} />
                  )}
                  <circle
                    r={r + 4}
                    fill="none"
                    stroke="var(--focus)"
                    strokeWidth={2}
                    className="opacity-0 group-focus-visible/node:opacity-100"
                  />
                </g>
              </g>
            )
          })}
        </g>

        <g aria-hidden>
          {nodes.map((n) => {
            const p = positions[n.id]
            if (!p) return null
            const r = radius(n)
            const show = focusId == null ? r >= 12 : lit.has(n.id)
            if (!labels || !show) return null
            return (
              <text
                key={n.id}
                x={p[0]}
                y={p[1] + r + 14}
                textAnchor="middle"
                className="pointer-events-none fill-ink text-[12px] font-medium"
                style={{ paintOrder: "stroke", stroke: "var(--sky)", strokeWidth: 4, strokeLinejoin: "round" }}
              >
                {n.label}
              </text>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
