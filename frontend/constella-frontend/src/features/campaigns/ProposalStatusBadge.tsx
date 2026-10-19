import type { ApiCampaignStatus } from "@/data/api"
import { cn } from "@/lib/utils"
import { board } from "./content"

/** The word carries the status; active gets the positive tint and a dot, the others stay neutral. */
export function ProposalStatusBadge({ status, className }: { status: ApiCampaignStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold",
        status === "active" ? "bg-positive-soft text-positive" : status === "proposed" ? "bg-field text-ink" : "bg-field text-ink-muted",
        className,
      )}
    >
      {status === "active" && <span aria-hidden className="size-1.5 rounded-full bg-positive" />}
      {board.status[status]}
    </span>
  )
}
