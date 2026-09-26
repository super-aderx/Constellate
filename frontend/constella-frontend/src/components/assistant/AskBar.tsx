import { ArrowUpIcon } from "lucide-react"
import { GenMark } from "@/components/brand/GenMark"
import { cn } from "@/lib/utils"

interface AskBarProps {
  /** Text being typed; the placeholder shows when empty. */
  draft: string
  placeholder: string
  /** Show a blinking caret. */
  typing?: boolean
}

/** Display-only ask bar for demos: shows a question being typed and a send button that lights up. */
export function AskBar({ draft, placeholder, typing }: AskBarProps) {
  return (
    <div aria-hidden className="flex items-center gap-3 rounded-xl bg-field py-2 pr-2 pl-4">
      <GenMark size={16} />
      <span className={cn("min-w-0 flex-1 truncate text-[15px]", !draft && "text-ink-muted")}>
        {draft || placeholder}
        {typing && draft && <span className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-ink" />}
      </span>
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg transition-colors duration-200",
          draft ? "bg-action text-on-action" : "bg-surface-raised text-ink-faint",
        )}
      >
        <ArrowUpIcon className="size-4" />
      </span>
    </div>
  )
}
