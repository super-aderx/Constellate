import type { KeyboardEvent, PointerEvent } from "react"
import { useElementSize } from "@/hooks/useElementSize"
import { niceScale } from "@/lib/scale"
import { cn } from "@/lib/utils"

interface ResultTrendProps {
  days: string[]
  actual: number[]
  /** Where the line would have been without the change; drawn dashed. */
  expected: number[]
  /** Index of the day the change started; marked with a rule. */
  markIndex: number
  markLabel: string
  /** Day being read out (hover or arrow keys); null shows none. */
  inspect: number | null
  onInspect: (index: number | null) => void
  format: (v: number) => string
  /** Accessible name; the caller also provides a table of the same values. */
  label: string
  height?: number
  className?: string
}

const PAD = { top: 26, right: 12, bottom: 28, left: 40 }

/**
 * Daily results on the navy sky, always in Night values: the actual line in starlight, the expected
 * line dashed in grey, and the stretch since launch shaded faintly. Hover, or focus and use the
 * arrow keys, to move a cross-hair; the caller reads out the day.
 */
export function ResultTrend({ days, actual, expected, markIndex, markLabel, inspect, onInspect, format, label, height = 240, className }: ResultTrendProps) {
  const [ref, size] = useElementSize<HTMLDivElement>({ width: 600, height })
  const width = size.width
  const { hi, ticks } = niceScale([...actual, ...expected], 3, { zero: true })
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const step = plotW / Math.max(1, days.length - 1)
  const x = (i: number) => PAD.left + i * step
  const y = (v: number) => PAD.top + plotH - (v / (hi || 1)) * plotH
  const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(3, Math.floor(plotW / 64))))

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.round((e.clientX - box.left - PAD.left) / step)
    onInspect(Math.min(days.length - 1, Math.max(0, i)))
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault()
      onInspect(e.key === "Home" ? 0 : days.length - 1)
    } else if (d != null) {
      e.preventDefault()
      onInspect(Math.min(days.length - 1, Math.max(0, (inspect ?? days.length - 1) + d)))
    }
  }

  return (
    <div data-theme="night" className={cn("text-ink", className)}>
      <div ref={ref} style={{ height }} className="w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="block rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          onPointerMove={onMove}
          onPointerLeave={() => onInspect(null)}
          onKeyDown={onKey}
          onBlur={() => onInspect(null)}
        >
          {/* Since launch: a faint wash so the before/after split reads at a glance */}
          <rect x={x(markIndex)} y={PAD.top} width={x(days.length - 1) - x(markIndex)} height={plotH} fill="var(--ink)" opacity={0.045} />
          {ticks.map((t) => (
            <g key={t} aria-hidden>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          <line x1={x(markIndex)} x2={x(markIndex)} y1={PAD.top - 14} y2={PAD.top + plotH} stroke="var(--line-strong)" />
          <text x={x(markIndex) + 6} y={PAD.top - 6} className="fill-ink-muted text-[12px] font-medium">
            {markLabel}
          </text>

          <path d={path(expected)} fill="none" stroke="var(--comm-rest)" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" />
          <path
            d={path(actual)}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            className="animate-edge-draw motion-reduce:animate-none"
            style={{ animationDuration: "1100ms" }}
          />
          <circle cx={x(actual.length - 1)} cy={y(actual[actual.length - 1])} r={4} fill="var(--ink)" stroke="var(--sky)" strokeWidth={2} />

          {inspect != null && (
            <g aria-hidden>
              <line x1={x(inspect)} x2={x(inspect)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--line-strong)" />
              <circle cx={x(inspect)} cy={y(expected[inspect])} r={4} fill="var(--comm-rest)" stroke="var(--sky)" strokeWidth={2} />
              <circle cx={x(inspect)} cy={y(actual[inspect])} r={5} fill="var(--star)" stroke="var(--sky)" strokeWidth={2} />
            </g>
          )}

          <g aria-hidden>
            {days.map((d, i) =>
              (days.length - 1 - i) % labelEvery === 0 ? (
                <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className={cn("text-[11px] tabular-nums", inspect === i ? "fill-ink font-semibold" : "fill-ink-muted")}>
                  {d}
                </text>
              ) : null,
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}
