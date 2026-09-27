import { cn } from "@/lib/utils"

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  className?: string
}

/** A small trend line in currentColor with a dot on the latest value. Decorative: pair it with the figure it summarises. */
export function Sparkline({ values, width = 88, height = 28, className }: SparklineProps) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  const pad = 4
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), height - pad - ((v - min) / range) * (height - pad * 2)])
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden className={cn("block shrink-0 text-ink-muted", className)}>
      <polyline
        points={pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.75} fill="currentColor" stroke="var(--surface-raised)" strokeWidth={1.5} />
    </svg>
  )
}
