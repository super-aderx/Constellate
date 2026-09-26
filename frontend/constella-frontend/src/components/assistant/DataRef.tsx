import type { ReactNode } from "react"
import { Tooltip } from "radix-ui"

interface DataRefProps {
  /** Where the figure comes from, e.g. "Orders, Sep 20 – 26". */
  source: string
  children: ReactNode
}

/** Wraps a figure in generated text. Hover or focus names the data it came from. */
export function DataRef({ source, children }: DataRefProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          className="cursor-help rounded-[2px] font-semibold tabular-nums underline decoration-ink-faint decoration-dotted underline-offset-[3px]"
        >
          {children}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-action px-2.5 py-1.5 text-[13px] leading-[18px] text-on-action shadow-pop animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
        >
          {source}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
