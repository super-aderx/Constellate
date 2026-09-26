import { DataRef } from "@/components/assistant"
import { GenMark } from "@/components/brand/GenMark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { overview, type Segment, type Signal } from "./content"

/** Status words carry the meaning; the colour and glyph only reinforce them. */
const SIGNAL: Record<Signal, { glyph: string; className: string }> = {
  rising: { glyph: "▲", className: "bg-positive-soft text-positive" },
  falling: { glyph: "▼", className: "bg-negative-soft text-negative" },
  opportunity: { glyph: "+", className: "bg-field text-ink" },
}

function Text({ segments }: { segments: Segment[] }) {
  return segments.map((s, i) =>
    typeof s === "string" ? (
      s
    ) : (
      <DataRef key={i} source={s.source}>
        {s.value}
      </DataRef>
    ),
  )
}

/** A short generated read of the week: one headline, three signals, and the next step. */
export function AiOverview() {
  return (
    <section aria-labelledby="overview-title" className="flex flex-col rounded-xl bg-surface-raised p-5 md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
          <GenMark size={16} />
          {overview.kind}
        </span>
        <span className="text-[13px] text-ink-muted tabular-nums">{overview.asOf}</span>
      </header>

      <h2 id="overview-title" className="mt-3 max-w-[40ch] text-[21px] leading-[1.35] font-semibold tracking-[-0.018em] text-pretty md:text-[23px]">
        <Text segments={overview.headline} />
      </h2>

      <ul className="m-0 mt-5 flex list-none flex-col p-0 [&>li+li]:border-t [&>li+li]:border-line">
        {overview.points.map((p) => {
          const s = SIGNAL[p.signal]
          return (
            <li key={p.signal} className="grid gap-x-4 gap-y-1.5 py-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
              <span>
                <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold", s.className)}>
                  <span aria-hidden>{s.glyph}</span>
                  {overview.signals[p.signal]}
                </span>
              </span>
              <p className="max-w-[62ch] text-[15px] leading-6">
                <Text segments={p.text} />
              </p>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button asChild className="h-10 rounded-xl px-4 max-sm:w-full">
          <a href={overview.primary.href}>{overview.primary.label}</a>
        </Button>
        <Button asChild variant="secondary" className="h-10 rounded-xl px-4 max-sm:w-full">
          <a href={overview.secondary.href}>{overview.secondary.label}</a>
        </Button>
      </div>
    </section>
  )
}
