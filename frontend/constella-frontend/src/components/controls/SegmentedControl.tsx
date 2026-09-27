import type { ReactNode } from "react"
import { ToggleGroup } from "radix-ui"
import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  /** Accessible name when the label is an icon or abbreviated. */
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Accessible name for the group. */
  label: string
  /** Full width with equal segments, e.g. on phones. */
  stretch?: boolean
  className?: string
}

/** One choice from a few: a field track with the selected option in soft peach (selected means peach). */
export function SegmentedControl<T extends string>({ options, value, onValueChange, label, stretch, className }: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={label}
      className={cn("inline-flex gap-0.5 rounded-xl bg-field p-[3px]", stretch && "flex w-full", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          aria-label={o.ariaLabel}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-3 text-[13px] font-semibold whitespace-nowrap text-ink-muted transition-colors hover:text-ink data-[state=on]:bg-star-soft data-[state=on]:text-star-ink",
            stretch && "flex-1",
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
