import type { ReactNode } from "react"
import { communityColor } from "@/components/graph"
import { cn } from "@/lib/utils"

export interface RankItem {
  id: string
  name: string
  score: number
  community?: number | null
  /** Optional second figure under the score, e.g. a change. */
  detail?: ReactNode
}

interface RankListProps {
  items: RankItem[]
  label: string
  format: (v: number) => string
  className?: string
}

/**
 * Top-N by one score, each with a quiet bar scaled to the leader and its community's colour dot.
 * Ranks come from the list order, so pass items already sorted.
 */
export function RankList({ items, label, format, className }: RankListProps) {
  const top = Math.max(1, ...items.map((i) => i.score))
  return (
    <ol aria-label={label} className={cn("m-0 list-none p-0 [&>li+li]:border-t [&>li+li]:border-line", className)}>
      {items.map((it, i) => (
        <li key={it.id} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 py-3">
          <span className="text-[13px] font-medium text-ink-faint tabular-nums">{i + 1}</span>
          <span className="flex min-w-0 flex-col gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[15px] leading-5 font-medium">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: communityColor(it.community) }} />
              <span className="truncate">{it.name}</span>
            </span>
            <span aria-hidden className="block h-1 rounded-[2px] bg-field">
              <span className="block h-full rounded-[2px] bg-ink-muted" style={{ width: `${(it.score / top) * 100}%` }} />
            </span>
          </span>
          <span className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-[15px] leading-5 font-semibold tabular-nums">{format(it.score)}</span>
            {it.detail && <span className="text-[12px] leading-4 tabular-nums">{it.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
