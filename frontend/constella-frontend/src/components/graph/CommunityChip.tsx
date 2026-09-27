import { cn } from "@/lib/utils"
import { communityColor } from "./types"

interface CommunityChipProps {
  community: number | null | undefined
  label: string
  /** e.g. the number of products in it */
  count?: string
  selected?: boolean
  /** Makes it a toggle button, e.g. to highlight the community on the graph. */
  onClick?: () => void
  /** Accessible name when it's a button and the label alone isn't enough. */
  actionLabel?: string
  className?: string
}

/** A community's colour dot and name. The colour never stands alone: the name is always there. */
export function CommunityChip({ community, label, count, selected, onClick, actionLabel, className }: CommunityChipProps) {
  const inner = (
    <>
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: communityColor(community) }} />
      <span className="truncate">{label}</span>
      {count && <span className={cn("text-[12px] tabular-nums", selected ? "text-star-ink/80" : "text-ink-muted")}>{count}</span>}
    </>
  )
  const base = cn(
    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full pr-3 pl-2.5 text-[13px] leading-[18px] font-medium transition-colors",
    selected ? "bg-star-soft text-star-ink" : "bg-field text-ink",
    className,
  )
  if (!onClick) return <span className={base}>{inner}</span>
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      aria-label={actionLabel}
      onClick={onClick}
      className={cn(base, "cursor-pointer", !selected && "hover:bg-[color-mix(in_srgb,var(--field)_85%,var(--ink))]")}
    >
      {inner}
    </button>
  )
}
