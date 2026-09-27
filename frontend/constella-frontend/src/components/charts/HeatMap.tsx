import { useState, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

export interface HeatItem {
  id: string
  label: string
  /** CSS colour of the dot beside its name, e.g. its community. */
  color: string
}

export type HeatPair = { a: string; b: string }

interface HeatMapProps {
  /** Rows and columns, in this order. */
  items: HeatItem[]
  /** The pair's value, or null when the two aren't bought together. */
  value: (a: string, b: string) => number | null
  /** Lower bounds of every bin after the first, e.g. [2, 3, 4.5] gives four bins. */
  thresholds: number[]
  /** One legend label per bin, plus the empty cell's. */
  legend: { bins: string[]; empty: string }
  selected: HeatPair | null
  onSelect: (pair: HeatPair | null) => void
  onHover?: (pair: HeatPair | null) => void
  /** A product to cross-hair, e.g. the one picked in a table. */
  highlight?: string | null
  /** Accessible name for a cell, e.g. "Spaghetti and Tomato Sauce, 6.20× lift". */
  describe: (a: HeatItem, b: HeatItem, value: number | null) => string
  label: string
  className?: string
}

const CELL = 20
const GAP = 2
const LEFT = 132
const TOP = 104

/** Navy steps on the raised surface: one hue, light to dark. Discrete, so each step is readable and gradients stay on the graph. */
const STEPS = [20, 42, 68, 100]
const heatStep = (bin: number) => `color-mix(in srgb, var(--action) ${STEPS[bin]}%, var(--surface-raised))`
const EMPTY = "color-mix(in srgb, var(--field) 60%, var(--surface-raised))"

/**
 * Every pair in the store as a symmetric matrix: one row and one column per product, cells shaded
 * by bin. Cells are a grid: Tab in, then arrow keys, Enter to select. Scrolls sideways inside its
 * own box on narrow screens.
 */
export function HeatMap({ items, value, thresholds, legend, selected, onSelect, onHover, highlight, describe, label, className }: HeatMapProps) {
  const [active, setActive] = useState<[number, number]>([0, 1])
  const [hover, setHover] = useState<[number, number] | null>(null)
  const n = items.length
  // Room on the right for the last column's slanted label
  const width = LEFT + n * CELL + 64
  const height = TOP + n * CELL

  const binOf = (v: number) => thresholds.filter((t) => v >= t).length
  const isSelected = (r: number, c: number) =>
    selected != null &&
    ((items[r].id === selected.a && items[c].id === selected.b) || (items[r].id === selected.b && items[c].id === selected.a))
  const hot = (i: number) => items[i].id === highlight || hover?.[0] === i || hover?.[1] === i

  const choose = (r: number, c: number) => {
    if (r === c || value(items[r].id, items[c].id) == null) return
    onSelect(isSelected(r, c) ? null : { a: items[r].id, b: items[c].id })
  }
  const enter = (r: number, c: number) => {
    setHover([r, c])
    onHover?.(r === c ? null : { a: items[r].id, b: items[c].id })
  }
  const leave = () => {
    setHover(null)
    onHover?.(null)
  }

  const onKey = (e: KeyboardEvent<SVGElement>) => {
    const [r, c] = active
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      choose(r, c)
      return
    }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    const next: [number, number] = [Math.min(n - 1, Math.max(0, r + m[0])), Math.min(n - 1, Math.max(0, c + m[1]))]
    setActive(next)
    enter(next[0], next[1])
    const cell = e.currentTarget.ownerSVGElement?.querySelector<SVGElement>(`[data-cell="${next[0]}-${next[1]}"]`)
    requestAnimationFrame(() => cell?.focus())
  }

  const hl = highlight ? items.findIndex((i) => i.id === highlight) : -1

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" onMouseLeave={leave}>
          {/* Cross-hair behind the highlighted product's row and column */}
          {hl >= 0 && (
            <g aria-hidden>
              <rect x={0} y={TOP + hl * CELL - 1} width={width} height={CELL + 2} rx={4} fill="var(--star-soft)" />
              <rect x={LEFT + hl * CELL - 1} y={0} width={CELL + 2} height={height} rx={4} fill="var(--star-soft)" />
            </g>
          )}

          <g aria-hidden>
            {items.map((it, i) => (
              <g key={it.id}>
                <circle cx={LEFT - 10} cy={TOP + i * CELL + CELL / 2} r={3.5} style={{ fill: it.color }} />
                <text
                  x={LEFT - 20}
                  y={TOP + i * CELL + CELL / 2}
                  dy="0.34em"
                  textAnchor="end"
                  className={cn("text-[12px]", hot(i) ? "fill-ink font-semibold" : "fill-ink-muted")}
                >
                  {it.label}
                </text>
                <g transform={`translate(${LEFT + i * CELL + CELL / 2} ${TOP - 8}) rotate(-55)`}>
                  <circle cx={0} cy={0} r={3.5} style={{ fill: it.color }} />
                  <text x={10} y={0} dy="0.34em" className={cn("text-[12px]", hot(i) ? "fill-ink font-semibold" : "fill-ink-muted")}>
                    {it.label}
                  </text>
                </g>
              </g>
            ))}
          </g>

          <g role="grid" aria-label={label} onKeyDown={onKey}>
            {items.map((row, r) => (
              <g key={row.id} role="row">
                {items.map((col, c) => {
                  const v = r === c ? null : value(row.id, col.id)
                  const x = LEFT + c * CELL
                  const y = TOP + r * CELL
                  const on = isSelected(r, c)
                  const isActive = active[0] === r && active[1] === c
                  return (
                    <g
                      key={col.id}
                      role="gridcell"
                      data-cell={`${r}-${c}`}
                      aria-label={r === c ? row.label : describe(row, col, v)}
                      aria-selected={on}
                      tabIndex={isActive ? 0 : -1}
                      className={cn("group/cell outline-none", v != null && "cursor-pointer")}
                      onMouseEnter={() => enter(r, c)}
                      onFocus={() => {
                        setActive([r, c])
                        enter(r, c)
                      }}
                      onClick={() => {
                        setActive([r, c])
                        choose(r, c)
                      }}
                    >
                      {r === c ? (
                        <circle cx={x + CELL / 2} cy={y + CELL / 2} r={2.5} style={{ fill: row.color }} />
                      ) : (
                        <rect
                          x={x + GAP / 2}
                          y={y + GAP / 2}
                          width={CELL - GAP}
                          height={CELL - GAP}
                          rx={3}
                          style={{ fill: v == null ? EMPTY : heatStep(binOf(v)) }}
                        />
                      )}
                      {on && <rect x={x - 0.5} y={y - 0.5} width={CELL + 1} height={CELL + 1} rx={4} fill="none" stroke="var(--star)" strokeWidth={2.5} />}
                      {!on && hover?.[0] === r && hover?.[1] === c && r !== c && (
                        <rect x={x} y={y} width={CELL} height={CELL} rx={4} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
                      )}
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={CELL + 4}
                        height={CELL + 4}
                        rx={5}
                        fill="none"
                        stroke="var(--focus)"
                        strokeWidth={2}
                        className="opacity-0 group-focus-visible/cell:opacity-100"
                      />
                    </g>
                  )
                })}
              </g>
            ))}
          </g>
        </svg>
      </div>

      <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-2 p-0 text-[12px] text-ink-muted tabular-nums">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-[3px]" style={{ background: EMPTY }} />
          {legend.empty}
        </li>
        {legend.bins.map((b, i) => (
          <li key={b} className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[3px]" style={{ background: heatStep(i) }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}
