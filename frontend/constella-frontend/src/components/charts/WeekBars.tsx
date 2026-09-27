import { type KeyboardEvent } from "react"
import { useElementSize } from "@/hooks/useElementSize"
import { niceScale } from "@/lib/scale"
import { cn } from "@/lib/utils"

interface WeekBarsProps {
  /** Axis labels, e.g. "Sep 20". */
  labels: string[]
  /** Accessible names, e.g. "Week of Sep 20". */
  longLabels: string[]
  values: number[]
  selected: number
  onSelect: (index: number) => void
  format: (v: number) => string
  /** Accessible name for the group of weeks. */
  label: string
  height?: number
  className?: string
}

const PAD = { top: 12, right: 4, bottom: 28, left: 52 }

/**
 * One column per week in navy, the selected week in peach. Columns are a radio group: click, or
 * focus and use the arrow keys. The caller shows the selected week's figure.
 */
export function WeekBars({ labels, longLabels, values, selected, onSelect, format, label, height = 200, className }: WeekBarsProps) {
  const [ref, size] = useElementSize<HTMLDivElement>({ width: 480, height })
  const width = size.width
  const { hi, ticks } = niceScale(values, 3, { zero: true })
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const slot = plotW / values.length
  const bar = Math.min(24, slot * 0.62)
  const y = (v: number) => PAD.top + plotH - (v / (hi || 1)) * plotH
  const every = width < 420 ? 3 : 2

  const onKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    let next = step == null ? null : (i + step + values.length) % values.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = values.length - 1
    if (next == null) return
    e.preventDefault()
    onSelect(next)
    const group = e.currentTarget.parentElement
    requestAnimationFrame(() => (group?.children[next] as SVGGElement | undefined)?.focus())
  }

  return (
    <div ref={ref} className={cn("w-full", className)} style={{ height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block overflow-visible">
        <g aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
        </g>
        <g role="radiogroup" aria-label={label}>
          {values.map((v, i) => {
            const on = i === selected
            const x = PAD.left + slot * i + (slot - bar) / 2
            const top = y(v)
            const h = Math.max(2, PAD.top + plotH - top)
            return (
              <g
                key={i}
                role="radio"
                aria-checked={on}
                aria-label={`${longLabels[i]}, ${format(v)}`}
                tabIndex={on ? 0 : -1}
                className="group/bar cursor-pointer outline-none"
                onClick={() => onSelect(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH + PAD.bottom} fill="transparent" />
                {/* 4px rounded top, square at the baseline */}
                <path
                  d={`M${x} ${top + h} V${top + 4} q0 -4 4 -4 H${x + bar - 4} q4 0 4 4 V${top + h} Z`}
                  className={cn("transition-colors", on ? "fill-star" : "fill-action group-hover/bar:fill-ink-muted")}
                />
                <rect
                  x={x - 3}
                  y={top - 3}
                  width={bar + 6}
                  height={h + 6}
                  rx={6}
                  fill="none"
                  stroke="var(--focus)"
                  strokeWidth={2}
                  className="opacity-0 group-focus-visible/bar:opacity-100"
                />
                {/* Every other (or third) week is labelled; the selected week always is, and its neighbours give way */}
                {(on || (i % every === (values.length - 1) % every && Math.abs(i - selected) > 1)) && (
                  <text
                    x={x + bar / 2}
                    y={height - 8}
                    textAnchor="middle"
                    className={cn("text-[11px] tabular-nums", on ? "fill-ink font-semibold" : "fill-ink-muted")}
                  >
                    {labels[i]}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
