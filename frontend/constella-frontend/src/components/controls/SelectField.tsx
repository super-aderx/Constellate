import type { ReactNode } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { Select } from "radix-ui"
import { cn } from "@/lib/utils"

export interface SelectOption<T extends string> {
  value: T
  label: string
  /** A second line in the menu, e.g. what an RFM segment means. */
  description?: string
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: SelectOption<T>[]
  onValueChange: (value: T) => void
  /** Something before the value, such as an icon. */
  leading?: ReactNode
  /** Hide the visible label (it stays the accessible name). */
  hideLabel?: boolean
  className?: string
}

/** A filled field with an underline (Constella's input shape) that opens a floating menu. */
export function SelectField<T extends string>({ label, value, options, onValueChange, leading, hideLabel, className }: SelectFieldProps<T>) {
  const current = options.find((o) => o.value === value)
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className={cn("text-[12px] leading-4 font-medium text-ink-muted", hideLabel && "sr-only")}>{label}</span>
      <Select.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
        <Select.Trigger
          aria-label={label}
          className="inline-flex h-9 w-full cursor-pointer items-center gap-2 rounded-t-md bg-field pr-2 pl-3 text-left text-[14px] font-medium text-ink shadow-[inset_0_-1px_0_var(--line-strong)] hover:shadow-[inset_0_-2px_0_var(--line-strong)]"
        >
          {leading}
          <span className="min-w-0 flex-1 truncate">
            <Select.Value>{current?.label}</Select.Value>
          </span>
          <Select.Icon>
            <ChevronDownIcon className="size-4 text-ink-muted" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl bg-surface-raised text-ink shadow-pop animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
          >
            <Select.Viewport className="p-1">
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex cursor-pointer flex-col rounded-md py-2 pr-8 pl-3 outline-none select-none data-[highlighted]:bg-field"
                >
                  <Select.ItemText>
                    <span className="text-[14px] font-medium">{o.label}</span>
                  </Select.ItemText>
                  {o.description && <span className="text-[12px] leading-4 text-ink-muted">{o.description}</span>}
                  <Select.ItemIndicator className="absolute top-2.5 right-2.5">
                    <CheckIcon className="size-4 text-action" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  )
}
