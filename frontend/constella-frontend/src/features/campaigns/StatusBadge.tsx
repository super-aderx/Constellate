import type { CampaignStatus } from "@/data/campaigns"
import { cn } from "@/lib/utils"
import { status as copy } from "./content"

/** The word carries the status; live gets the positive tint and a dot, everything else stays neutral. */
export function StatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold",
        status === "active" ? "bg-positive-soft text-positive" : status === "scheduled" ? "bg-field text-ink" : "bg-field text-ink-muted",
        className,
      )}
    >
      {status === "active" && <span aria-hidden className="size-1.5 rounded-full bg-positive" />}
      {copy[status]}
    </span>
  )
}
