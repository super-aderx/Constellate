import { useState, type ReactNode } from "react"
import { CheckIcon } from "lucide-react"
import { Popover } from "radix-ui"
import { cn } from "@/lib/utils"

export interface PickItem {
  id: string
  label: string
  /** Heading the item is listed under, e.g. its community. */
  group: string
  /** CSS colour for the dot beside it. */
  color?: string
  /** Muted text after the label, e.g. its category. */
  meta?: string
}

interface PickListProps {
  items: PickItem[]
  selected: string[]
  onToggle: (id: string) => void
  /** Once this many are picked, the rest are disabled. */
  max?: number
  /** The button that opens the list. */
  trigger: ReactNode
  labels: { search: string; empty: string; limit: (max: number) => string }
  align?: "start" | "end"
}

/** A searchable list in a floating panel for picking several items, grouped under headings. */
export function PickList({ items, selected, onToggle, max, trigger, labels, align = "start" }: PickListProps) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((i) => i.label.toLowerCase().includes(q) || i.meta?.toLowerCase().includes(q)) : items
  const groups = [...new Set(shown.map((i) => i.group))]
  const full = max != null && selected.length >= max

  return (
    <Popover.Root onOpenChange={(open) => !open && setQuery("")}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          className="z-50 flex max-h-[min(28rem,var(--radix-popover-content-available-height))] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-surface-raised text-ink shadow-pop animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
        >
          <div className="p-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
              aria-label={labels.search}
              className="h-9 w-full rounded-t-md bg-field px-3 text-[14px] shadow-[inset_0_-1px_0_var(--line-strong)] outline-none placeholder:text-ink-faint focus-visible:shadow-[inset_0_-2px_0_var(--focus)]"
            />
            {full && <p className="px-1 pt-2 text-[12px] leading-4 text-ink-muted">{labels.limit(max!)}</p>}
          </div>
          <div className="overflow-y-auto px-1 pb-1">
            {groups.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-ink-muted">{labels.empty}</p>}
            {groups.map((g) => (
              <div key={g} role="group" aria-label={g}>
                <p className="px-2 pt-2 pb-1 text-[12px] font-medium text-ink-muted">{g}</p>
                {shown
                  .filter((i) => i.group === g)
                  .map((i) => {
                    const on = selected.includes(i.id)
                    const disabled = !on && full
                    return (
                      <button
                        key={i.id}
                        type="button"
                        aria-pressed={on}
                        disabled={disabled}
                        onClick={() => onToggle(i.id)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-[14px] hover:bg-field disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
                          on && "bg-star-soft text-star-ink hover:bg-star-soft",
                        )}
                      >
                        <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: i.color ?? "var(--comm-rest)" }} />
                        <span className="min-w-0 flex-1 truncate font-medium">{i.label}</span>
                        {i.meta && <span className="text-[12px] text-ink-muted">{i.meta}</span>}
                        <CheckIcon aria-hidden className={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")} />
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
