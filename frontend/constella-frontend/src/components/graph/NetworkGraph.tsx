import { useId, useState, type KeyboardEvent, type ReactNode } from "react"
import { useElementSize } from "@/hooks/useElementSize"
import { cn } from "@/lib/utils"
import type { UnitPositions } from "./layout"
import { communityColor, type ProductEdge, type ProductNode } from "./types"

/**
 * How a product is drawn:
 * a community index takes that community's colour; "rest" is the quiet grey; "ink" is starlight,
 * for products the view wants to stand out (bridges, pieces that would split off); "dim" recedes.
 */
export type NodeTone = number | "rest" | "ink" | "dim"

export interface NodePaint {
  tone: NodeTone
  /** A ring around the star: the products a view is centred on. */
  ring?: boolean
  /** Always show its name. */
  label?: boolean
}

/** "side" pairs are drawn dashed (e.g. between two partners of the chosen product); "strong" pairs are brighter. */
export type EdgeTone = "normal" | "strong" | "side" | "faint"

export type GraphSelection = { kind: "node"; id: string } | { kind: "edge"; source: string; target: string } | null

interface NetworkGraphProps {
  nodes: ProductNode[]
  edges: ProductEdge[]
  /** 0…1 on both axes; mapped onto the measured canvas. */
  positions: UnitPositions
  paint: (node: ProductNode) => NodePaint
  edgeTone?: (edge: ProductEdge) => EdgeTone
  /** Soft discs behind groups of products, e.g. communities. */
  groupOf?: (node: ProductNode) => number | null | undefined
  selection: GraphSelection
  onSelect: (selection: GraphSelection) => void
  /** Short text for a pair on hover, e.g. "410 orders together". */
  describeEdge: (edge: ProductEdge) => string
  /** Accessible name for the whole graph. */
  label: string
  /** Canvas height in px. */
  height: number
  /** Space kept clear at the top, e.g. for controls laid over the canvas. */
  insetTop?: number
  /** Cards and legends laid over the canvas. */
  children?: ReactNode
  className?: string
}

const PAD = { x: 56, top: 30, bottom: 42 }
const TONES: NodeTone[] = [0, 1, 2, 3, 4, 5, 6, 7, "rest", "ink", "dim"]

const toneColor = (t: NodeTone) =>
  typeof t === "number" ? communityColor(t) : t === "ink" ? "var(--ink)" : t === "dim" ? "var(--field)" : "var(--comm-rest)"

const sameEdge = (e: ProductEdge, s: GraphSelection) =>
  s?.kind === "edge" && ((e.source === s.source && e.target === s.target) || (e.source === s.target && e.target === s.source))

/**
 * The product network drawn to the size of its container, always on the navy sky in Night values.
 * Star size = strength, line width = lift. Products and pairs are both selectable: a selected
 * product turns peach and lights its pairs; a selected pair turns peach end to end.
 * Products are buttons (Tab, Enter); pairs are mouse targets, and every pair is also reachable from
 * a selected product's card. The caller keys it to replay the entrance when the data changes.
 */
export function NetworkGraph({
  nodes,
  edges,
  positions,
  paint,
  edgeTone,
  groupOf,
  selection,
  onSelect,
  describeEdge,
  label,
  height,
  insetTop = PAD.top,
  children,
  className,
}: NetworkGraphProps) {
  const [ref, size] = useElementSize<HTMLDivElement>({ width: 800, height })
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [hoverEdge, setHoverEdge] = useState<number | null>(null)
  const gid = "n" + useId().replace(/[^A-Za-z0-9_-]/g, "")

  const width = size.width
  const narrow = width < 520
  const px = (id: string): [number, number] | null => {
    const p = positions[id]
    if (!p) return null
    const padX = narrow ? 36 : PAD.x
    return [padX + p[0] * (width - padX * 2), insetTop + p[1] * (height - insetTop - PAD.bottom)]
  }

  const maxStrength = Math.max(1, ...nodes.map((n) => n.strength))
  const radius = (n: ProductNode) => (narrow ? 0.8 : 1) * (4 + 11 * Math.sqrt(n.strength / maxStrength))
  const lifts = edges.map((e) => e.lift)
  const minLift = Math.min(...lifts)
  const liftRange = Math.max(...lifts) - minLift || 1
  const edgeWidth = (e: ProductEdge) => 0.75 + 3.25 * ((e.lift - minLift) / liftRange)

  const selectedNode = selection?.kind === "node" ? selection.id : null
  const focusId = hoverNode ?? selectedNode
  const lit = new Set<string>()
  if (focusId) {
    lit.add(focusId)
    for (const e of edges) {
      if (e.source === focusId) lit.add(e.target)
      if (e.target === focusId) lit.add(e.source)
    }
  }
  if (selection?.kind === "edge") {
    lit.add(selection.source)
    lit.add(selection.target)
  }
  const anyFocus = focusId != null || selection?.kind === "edge"

  const pickNode = (id: string) => onSelect(selectedNode === id ? null : { kind: "node", id })
  const onNodeKey = (ev: KeyboardEvent<SVGGElement>, id: string) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault()
      pickNode(id)
    }
    if (ev.key === "Escape") onSelect(null)
  }

  // Soft discs behind each group: centred on its members, sized to reach the farthest one.
  const halos: { key: number; x: number; y: number; r: number }[] = []
  if (groupOf) {
    const groups = new Map<number, [number, number][]>()
    for (const n of nodes) {
      const g = groupOf(n)
      const p = px(n.id)
      if (g == null || !p) continue
      groups.set(g, [...(groups.get(g) ?? []), p])
    }
    for (const [key, pts] of groups) {
      const x = pts.reduce((s, p) => s + p[0], 0) / pts.length
      const y = pts.reduce((s, p) => s + p[1], 0) / pts.length
      const r = Math.max(34, ...pts.map((p) => Math.hypot(p[0] - x, p[1] - y) + 26))
      halos.push({ key, x, y, r })
    }
  }

  const hovered = hoverEdge != null ? edges[hoverEdge] : null
  const hoveredMid = hovered ? [px(hovered.source), px(hovered.target)] : null

  return (
    <div data-theme="night" className={cn("relative overflow-hidden bg-sky text-ink", className)}>
      <div ref={ref} style={{ height }} className="w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label={label}
          className="block"
          onClick={(e) => {
            // A click on empty sky clears the selection.
            if (e.target === e.currentTarget) onSelect(null)
          }}
        >
          <defs>
            {TONES.map((t) => {
              const color = toneColor(t)
              return (
                <radialGradient key={String(t)} id={`${gid}-${t}`} cx="35%" cy="30%" r="75%">
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

          <g aria-hidden className="pointer-events-none">
            {halos.map((h) => (
              <circle
                key={h.key}
                cx={h.x}
                cy={h.y}
                r={h.r}
                style={{ fill: `color-mix(in srgb, ${communityColor(h.key)} 13%, transparent)` }}
                className="animate-in fade-in duration-700 motion-reduce:animate-none"
              />
            ))}
          </g>

          <g aria-hidden>
            {edges.map((e, i) => {
              const a = px(e.source)
              const b = px(e.target)
              if (!a || !b) return null
              const selected = sameEdge(e, selection)
              const touchesFocus = focusId != null && (e.source === focusId || e.target === focusId)
              const tone = edgeTone?.(e) ?? "normal"
              const hot = selected || touchesFocus || hoverEdge === i
              const faded = (anyFocus && !hot) || tone === "faint"
              return (
                <g key={`${e.source}-${e.target}`}>
                  <line
                    x1={a[0]}
                    y1={a[1]}
                    x2={b[0]}
                    y2={b[1]}
                    pathLength={1}
                    strokeDasharray={tone === "side" && !selected ? "0.012 0.012" : 1}
                    strokeWidth={edgeWidth(e) + (selected ? 1 : 0)}
                    strokeLinecap="round"
                    stroke={selected ? "var(--star)" : hot || tone === "strong" ? "var(--edge-strong)" : "var(--edge)"}
                    opacity={faded ? 0.3 : 1}
                    className={cn(tone !== "side" && "animate-edge-draw motion-reduce:animate-none")}
                    style={{ animationDelay: `${520 + i * 14}ms`, transition: "stroke 200ms, opacity 200ms" }}
                  />
                  {/* Wide invisible line: the pair's hit target */}
                  <line
                    x1={a[0]}
                    y1={a[1]}
                    x2={b[0]}
                    y2={b[1]}
                    stroke="transparent"
                    strokeWidth={14}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverEdge(i)}
                    onMouseLeave={() => setHoverEdge(null)}
                    onClick={() => onSelect(selected ? null : { kind: "edge", source: e.source, target: e.target })}
                  />
                </g>
              )
            })}
          </g>

          <g>
            {nodes.map((n, i) => {
              const p = px(n.id)
              if (!p) return null
              const r = radius(n)
              const look = paint(n)
              const selected = selectedNode === n.id
              const dim = anyFocus && !lit.has(n.id)
              return (
                <g
                  key={n.id}
                  transform={`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`}
                  tabIndex={0}
                  role="button"
                  aria-label={n.category ? `${n.label}, ${n.category}` : n.label}
                  aria-pressed={selected}
                  className="group/node cursor-pointer outline-none"
                  style={{ opacity: dim ? 0.32 : 1, transition: "opacity 200ms" }}
                  onMouseEnter={() => setHoverNode(n.id)}
                  onMouseLeave={() => setHoverNode(null)}
                  onFocus={() => setHoverNode(n.id)}
                  onBlur={() => setHoverNode(null)}
                  onClick={() => pickNode(n.id)}
                  onKeyDown={(ev) => onNodeKey(ev, n.id)}
                >
                  <g
                    className="origin-center animate-star-in [transform-box:fill-box] motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 18}ms` }}
                  >
                    <circle r={Math.max(r + 4, 14)} fill="transparent" />
                    {look.ring && <circle r={r + 5} fill="none" stroke="var(--ink)" strokeWidth={1.5} opacity={0.85} />}
                    {selected ? (
                      <g className="origin-center animate-star-pop [transform-box:fill-box] motion-reduce:animate-none">
                        <circle r={r * 2.4 + 8} fill={`url(#${gid}-glow)`} />
                        <circle r={r} fill={`url(#${gid}-star)`} />
                      </g>
                    ) : (
                      <circle r={r} fill={`url(#${gid}-${look.tone})`} />
                    )}
                    <circle r={r + (look.ring ? 9 : 4)} fill="none" stroke="var(--focus)" strokeWidth={2} className="opacity-0 group-focus-visible/node:opacity-100" />
                  </g>
                </g>
              )
            })}
          </g>

          <g aria-hidden className="pointer-events-none">
            {nodes.map((n) => {
              const p = px(n.id)
              if (!p) return null
              const r = radius(n)
              const look = paint(n)
              const show = anyFocus ? lit.has(n.id) : look.label || r >= (narrow ? 10 : 11.5)
              if (!show) return null
              return (
                <text
                  key={n.id}
                  x={p[0]}
                  y={p[1] + r + (look.ring ? 19 : 15)}
                  textAnchor="middle"
                  className={cn("fill-ink text-[12px]", selectedNode === n.id || look.ring ? "font-semibold" : "font-medium")}
                  style={{ paintOrder: "stroke", stroke: "var(--sky)", strokeWidth: 4, strokeLinejoin: "round" }}
                >
                  {n.label}
                </text>
              )
            })}
            {hovered && hoveredMid?.[0] && hoveredMid[1] && (
              <text
                x={(hoveredMid[0][0] + hoveredMid[1][0]) / 2}
                y={(hoveredMid[0][1] + hoveredMid[1][1]) / 2 - 8}
                textAnchor="middle"
                className="fill-ink text-[12px] font-semibold tabular-nums"
                style={{ paintOrder: "stroke", stroke: "var(--sky)", strokeWidth: 5, strokeLinejoin: "round" }}
              >
                {describeEdge(hovered)}
              </text>
            )}
          </g>
        </svg>
      </div>
      {children}
    </div>
  )
}
