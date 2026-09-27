import { useEffect, useState } from "react"
import { GenText } from "@/components/assistant"
import { GenMark } from "@/components/brand/GenMark"
import { Button } from "@/components/ui/button"
import { appHref } from "@/lib/route"
import { cn } from "@/lib/utils"
import { insights as copy } from "./content"
import type { Insights, Signal } from "./insights"

/** Status words carry the meaning; colour and glyph only reinforce them. Same treatment as Home's overview. */
const SIGNAL: Record<Signal, { glyph: string; className: string }> = {
  strong: { glyph: "▲", className: "bg-positive-soft text-positive" },
  watch: { glyph: "!", className: "bg-negative-soft text-negative" },
  opportunity: { glyph: "+", className: "bg-field text-ink" },
}

const READ_MS = 650

/**
 * Constella AI's reading of the graph in view. When the view changes (`readKey`), it shows a short
 * "reading" state before the new text, so it's clear the insight was redone for what's on screen.
 */
export function InsightsPanel({ insights, readKey, asOf, className }: { insights: Insights; readKey: string; asOf: string; className?: string }) {
  const [doneKey, setDoneKey] = useState(readKey)
  useEffect(() => {
    const t = setTimeout(() => setDoneKey(readKey), READ_MS)
    return () => clearTimeout(t)
  }, [readKey])
  const reading = doneKey !== readKey

  return (
    <aside aria-labelledby="insights-title" aria-busy={reading} className={cn("flex flex-col rounded-xl bg-surface-raised p-5", className)}>
      <header className="flex flex-col gap-0.5">
        <h2 id="insights-title" className="inline-flex items-center gap-2 text-[17px] leading-6 font-semibold">
          <GenMark size={18} />
          {copy.title}
        </h2>
        <p className="text-[12px] leading-4 text-ink-muted tabular-nums">{copy.asOf(asOf)}</p>
      </header>

      {/* Reserves roughly the reading's height, so swapping skeleton and text doesn't shove the page */}
      <div className="min-h-[19rem]">
      {reading ? (
        <div className="mt-5 flex flex-col gap-2.5" aria-live="polite">
          <span className="text-[13px] text-ink-muted">{copy.reading}</span>
          {[92, 80, 64, 88, 52].map((w, i) => (
            <span key={i} className="h-3 animate-pulse rounded-[3px] bg-field motion-reduce:animate-none" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in-0 duration-300 motion-reduce:animate-none" aria-live="polite">
          <p className="mt-4 text-[17px] leading-[1.45] font-semibold tracking-[-0.012em] text-pretty">
            <GenText segments={insights.headline} />
          </p>
          <ul className="m-0 mt-4 flex list-none flex-col p-0 [&>li+li]:border-t [&>li+li]:border-line">
            {insights.points.map((p, i) => {
              const s = SIGNAL[p.signal]
              return (
                <li key={i} className="flex flex-col items-start gap-1.5 py-3">
                  <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold", s.className)}>
                    <span aria-hidden>{s.glyph}</span>
                    {copy.signals[p.signal]}
                  </span>
                  <p className="text-[14px] leading-[21px]">
                    <GenText segments={p.text} />
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      </div>

      {(insights.ask || insights.draft) && (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {insights.draft && (
            <Button asChild className="h-9 rounded-xl px-3.5">
              <a href={appHref("ask", { q: insights.draft })}>{copy.draft}</a>
            </Button>
          )}
          {insights.ask && (
            <Button asChild variant="secondary" className="h-9 rounded-xl px-3.5">
              <a href={appHref("ask", { q: insights.ask })}>{copy.ask}</a>
            </Button>
          )}
        </div>
      )}
      <p className="mt-4 text-[12px] leading-4 text-ink-muted">{copy.note}</p>
    </aside>
  )
}
