import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"

interface LiftMeterProps {
  lift: number
  /** Lift that fills the bar; log scale, so 2× reads as half of 4×. */
  max?: number
  className?: string
}

/** Lift as a short bar from chance (1.00×) with the value beside it, for tables and lists. */
export function LiftMeter({ lift, max = 6, className }: LiftMeterProps) {
  const share = Math.min(1, Math.max(0, Math.log(lift) / Math.log(max)))
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="relative h-1.5 w-14 overflow-hidden rounded-[2px] bg-field">
        <span className="absolute inset-y-0 left-0 rounded-[2px] bg-action" style={{ width: `${share * 100}%` }} />
      </span>
      <span className="min-w-[3.4em] text-right text-[13px] font-medium tabular-nums">{fmt.lift(lift)}</span>
    </span>
  )
}
