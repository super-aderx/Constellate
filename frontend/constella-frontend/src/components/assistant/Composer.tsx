import { useState, type FormEvent, type ReactNode } from "react"
import { ArrowUpIcon } from "lucide-react"
import { GenMark } from "@/components/brand/GenMark"
import { cn } from "@/lib/utils"

interface ComposerProps {
  onSubmit: (text: string) => void
  placeholder: string
  labels: { input: string; send: string; busy: string }
  busy?: boolean
  /** Controls under the field, e.g. the scope the answer will use. */
  footer?: ReactNode
  className?: string
}

/**
 * Where you ask Constella AI: the one control that floats (shadow-pop). Enter sends, Shift+Enter
 * adds a line; the field grows with its text.
 */
export function Composer({ onSubmit, placeholder, labels, busy, footer, className }: ComposerProps) {
  const [text, setText] = useState("")
  const ready = text.trim().length > 0 && !busy
  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!ready) return
    onSubmit(text.trim())
    setText("")
  }
  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-2 rounded-2xl bg-surface-raised p-2 shadow-pop focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus", className)}>
      <div className="flex items-end gap-2">
        <span className="inline-flex h-10 items-center pl-2">
          <GenMark size={18} />
        </span>
        <textarea
          rows={1}
          value={text}
          placeholder={placeholder}
          aria-label={labels.input}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
          }}
          className="max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-[16px] leading-6 text-ink outline-none [field-sizing:content] placeholder:text-ink-faint focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!ready}
          aria-label={busy ? labels.busy : labels.send}
          className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-action text-on-action transition-colors disabled:cursor-default disabled:bg-field disabled:text-ink-faint"
        >
          {busy ? (
            <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-ink-faint border-t-ink motion-reduce:animate-none" />
          ) : (
            <ArrowUpIcon className="size-[18px]" />
          )}
        </button>
      </div>
      {footer && <div className="px-2 pb-1">{footer}</div>}
    </form>
  )
}
