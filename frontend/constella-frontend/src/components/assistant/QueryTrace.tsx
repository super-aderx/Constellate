import { ChevronRightIcon } from "lucide-react"
import { Collapsible } from "radix-ui"

export interface TraceStep {
  label: string
  /** The API call, e.g. "GET /network?start=2026-06-29&segment=champions". */
  call: string
  result: string
}

interface QueryTraceProps {
  steps: TraceStep[]
  /** Toggle text, e.g. "How this was worked out". */
  label: string
  /** "3 queries" */
  count: string
}

/** The queries behind a generated answer, collapsed by default. Steps are numbered because they ran in order. */
export function QueryTrace({ steps, label, count }: QueryTraceProps) {
  return (
    <Collapsible.Root className="group/trace rounded-xl bg-surface">
      <Collapsible.Trigger className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] font-semibold">
        <span>{label}</span>
        <span className="ml-auto font-normal text-ink-muted tabular-nums">{count}</span>
        <ChevronRightIcon aria-hidden className="size-4 text-ink-muted transition-transform group-data-[state=open]/trace:rotate-90 motion-reduce:transition-none" />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <ol className="m-0 flex list-none flex-col gap-3 px-4 pb-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-field text-[11px] font-semibold text-ink-muted tabular-nums">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[13px] leading-[18px]">{s.label}</span>
                <code className="block overflow-x-auto rounded-md bg-field px-2 py-1.5 font-mono text-[12px] whitespace-nowrap">{s.call}</code>
                <span className="text-[12px] text-ink-muted tabular-nums">{s.result}</span>
              </div>
            </li>
          ))}
        </ol>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
