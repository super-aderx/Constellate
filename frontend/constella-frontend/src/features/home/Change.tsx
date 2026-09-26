import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"

/** A relative change as ▲ 4.2% or ▼ 3.2%: the glyph carries direction, so it never relies on colour alone. */
export function Change({ from, to, ratio, className }: { from?: number; to?: number; ratio?: number; className?: string }) {
  const r = ratio ?? (to ?? 0) / (from || 1) - 1
  const up = r >= 0
  return (
    <span className={cn("font-semibold whitespace-nowrap tabular-nums", up ? "text-positive" : "text-negative", className)}>
      <span aria-hidden>{up ? "▲" : "▼"} </span>
      <span className="sr-only">{up ? "up " : "down "}</span>
      {fmt.change(r)}
    </span>
  )
}
