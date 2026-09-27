import { useId, type KeyboardEvent } from "react"
import { niceScale } from "@/lib/scale"
import { cn } from "@/lib/utils"

export interface TrendDay {
  id: string
  /** Axis label, e.g. "Sat 26". */
  short: string
  /** Accessible name, e.g. "Saturday, September 26". */
  long: string
}

interface WeekTrendProps {
  days: TrendDay[]
  /** One value per day, same order as `days`. */
  current: number[]
  /** The same weekdays one period earlier, drawn faintly behind. */
  previous: number[]
  selected: number
  onSelect: (index: number) => void
  /** Pointer or focus over a day; null when it leaves. */
  onPreview?: (index: number | null) => void
  preview?: number | null
  formatTick: (v: number) => string
  /** Accessible name for the group of days. */
  label: string
  /** viewBox size; the chart scales to its container's width. Use a narrower box on phones so text stays legible. */
  width?: number
  height?: number
  className?: string
}

const PAD = { top: 20, right: 16, bottom: 34, left: 54 }

/**
 * A week drawn as a constellation on the navy sky, always in Night values: each day is a star joined
 * to the next, and the previous period runs faintly behind. The selected day turns peach.
 * Days are a radio group: click, or focus and use the arrow keys. Keyed by the caller to redraw on a
 * new metric; on mount the stars appear, then the line draws through them.
 */
export function WeekTrend({
  days,
  current,
  previous,
  selected,
  onSelect,
  onPreview,
  preview = null,
  formatTick,
  label,
  width = 640,
  height = 260,
  className,
}: WeekTrendProps) {
  const gid = "t" + useId().replace(/[^A-Za-z0-9_-]/g, "")
  const { lo, hi, ticks } = niceScale([...current, ...previous])
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const slot = plotW / days.length
  const x = (i: number) => PAD.left + slot * (i + 0.5)
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH
  const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  const focusDay = preview ?? selected

  const onKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    let next = step == null ? null : (i + step + days.length) % days.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = days.length - 1
    if (next == null) return
    e.preventDefault()
    onSelect(next)
    // Roving focus: the newly selected day becomes the one tab stop.
    const group = e.currentTarget.parentElement
    requestAnimationFrame(() => (group?.children[next] as SVGGElement | undefined)?.focus())
  }

  return (
    <div data-theme="night" className={cn("text-ink", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full overflow-visible">
        <defs>
          <radialGradient id={`${gid}-star`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" style={{ stopColor: "var(--star-light)" }} />
            <stop offset="100%" style={{ stopColor: "var(--star-deep)" }} />
          </radialGradient>
          <radialGradient id={`${gid}-glow`}>
            <stop offset="0%" style={{ stopColor: "var(--star)", stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: "var(--star)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        {/* Grid: hairlines at round values */}
        <g aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[11px] tabular-nums">
                {formatTick(t)}
              </text>
            </g>
          ))}
        </g>

        {/* Crosshair on the day being previewed */}
        {preview != null && (
          <line
            aria-hidden
            x1={x(preview)}
            x2={x(preview)}
            y1={PAD.top - 6}
            y2={PAD.top + plotH}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />
        )}

        {/* Previous period: thin and faint, so it reads as context */}
        <g aria-hidden className="animate-in fade-in duration-700 [animation-fill-mode:backwards] motion-reduce:animate-none" style={{ animationDelay: "500ms" }}>
          <path d={path(previous)} fill="none" stroke="var(--comm-rest)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          {previous.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill="var(--comm-rest)" />
          ))}
        </g>

        {/* This period: the constellation line */}
        <path
          aria-hidden
          d={path(current)}
          fill="none"
          stroke="var(--edge-strong)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-edge-draw motion-reduce:animate-none"
          style={{ animationDelay: "380ms", animationDuration: "900ms" }}
        />

        <g role="radiogroup" aria-label={label}>
          {days.map((d, i) => {
            const on = i === selected
            const cx = x(i)
            const cy = y(current[i])
            return (
              <g
                key={d.id}
                role="radio"
                aria-checked={on}
                aria-label={d.long}
                tabIndex={on ? 0 : -1}
                className="group/day cursor-pointer outline-none"
                onClick={() => onSelect(i)}
                onKeyDown={(e) => onKey(e, i)}
                onPointerEnter={() => onPreview?.(i)}
                onPointerLeave={() => onPreview?.(null)}
                onFocus={() => onPreview?.(i)}
                onBlur={() => onPreview?.(null)}
              >
                {/* The whole column is the hit target, not the star */}
                <rect x={PAD.left + slot * i} y={PAD.top - 12} width={slot} height={plotH + PAD.bottom + 12} fill="transparent" />
                <g
                  className="origin-center animate-star-in [transform-box:fill-box] motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  {on ? (
                    <g key={`on-${i}`} className="origin-center animate-star-pop [transform-box:fill-box] motion-reduce:animate-none">
                      <circle cx={cx} cy={cy} r={22} fill={`url(#${gid}-glow)`} />
                      <circle cx={cx} cy={cy} r={8} fill={`url(#${gid}-star)`} stroke="var(--sky)" strokeWidth={2} />
                    </g>
                  ) : (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={focusDay === i ? 6.5 : 5}
                      fill="var(--ink)"
                      stroke="var(--sky)"
                      strokeWidth={2}
                      style={{ transition: "r 160ms" }}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={on ? 12 : 10}
                    fill="none"
                    stroke="var(--focus)"
                    strokeWidth={2}
                    className="opacity-0 group-focus-visible/day:opacity-100"
                  />
                </g>
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  className={cn(
                    "text-[12px] tabular-nums transition-colors",
                    on ? "fill-ink font-semibold" : "fill-ink-muted group-hover/day:fill-ink",
                  )}
                >
                  {d.short}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
