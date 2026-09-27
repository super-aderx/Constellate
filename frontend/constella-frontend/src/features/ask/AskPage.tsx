import { useEffect, useRef } from "react"
import { Composer } from "@/components/assistant"
import { GenMark } from "@/components/brand/GenMark"
import { SelectField } from "@/components/controls/SelectField"
import { Button } from "@/components/ui/button"
import { periods, segments, storeInfo } from "@/data/store"
import { prefersReducedMotion } from "@/lib/motion"
import { appHref } from "@/lib/route"
import { AnswerView } from "./AnswerView"
import { composer, page, presets, report } from "./content"
import { ask, clearConversation, setScope, useScope, useTurns } from "./conversation"

/** The last question asked from a link, so a remount (or StrictMode's double effect) doesn't ask it twice. */
let lastLinked: string | null = null

/**
 * Constella AI: a conversation about the store. Empty, it offers questions to start from and the
 * one-click business report. `?q=` (from other pages) asks that question straight away.
 */
export function AskPage({ params }: { params: URLSearchParams }) {
  const turns = useTurns()
  const scope = useScope()
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((t) => !t.ready)
  const linked = params.get("q")

  const send = (q: string) => {
    // The pause only simulates reading; with reduced motion the answer is shown finished.
    ask(q, prefersReducedMotion() ? 0 : 1200)
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "end" }))
  }

  useEffect(() => {
    if (linked && linked !== lastLinked) {
      lastLinked = linked
      send(linked)
    }
  }, [linked])

  const reportHref = appHref("report", { period: scope.period, segment: scope.segment })

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-3xl flex-col px-4 pt-6 md:min-h-dvh md:px-8 md:pt-10">
      {turns.length === 0 ? (
        <div className="flex flex-1 flex-col">
          <header>
            <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-muted">
              <GenMark size={20} />
              {page.title}
            </p>
            <h1 className="mt-3 text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em] text-balance">
              {page.intro(storeInfo.name)}
            </h1>
            <p className="mt-3 max-w-[58ch] text-[15px] leading-6 text-ink-muted md:text-base">{page.body}</p>
          </header>

          <section aria-label={presets.label} className="mt-8 grid gap-6 sm:grid-cols-3">
            {presets.groups.map((g) => (
              <div key={g.title}>
                <h2 className="text-[13px] font-semibold text-ink-muted">{g.title}</h2>
                <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                  {g.questions.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => send(q)}
                        className="w-full cursor-pointer rounded-xl bg-surface-raised px-4 py-3 text-left text-[14px] leading-5 font-medium transition-colors hover:bg-field"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section aria-labelledby="report-title" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-raised p-5">
            <div className="max-w-[46ch]">
              <h2 id="report-title" className="text-[17px] leading-6 font-semibold">
                {report.title}
              </h2>
              <p className="mt-1 text-[14px] leading-[21px] text-ink-muted">{report.body}</p>
            </div>
            <Button asChild className="h-10 rounded-xl px-4 max-sm:w-full">
              <a href={reportHref}>{report.action}</a>
            </Button>
          </section>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="inline-flex items-center gap-2 text-[21px] leading-7 font-bold tracking-[-0.02em]">
              <GenMark size={20} />
              {page.title}
            </h1>
            <div className="flex gap-2">
              <Button variant="ghost" className="h-9 rounded-xl px-3" onClick={clearConversation} disabled={busy}>
                {page.newChat}
              </Button>
              <Button asChild variant="secondary" className="h-9 rounded-xl px-3.5">
                <a href={reportHref}>{page.reportShort}</a>
              </Button>
            </div>
          </header>

          <ol className="m-0 mt-6 flex list-none flex-col gap-5 p-0">
            {turns.map((t) => (
              <li key={t.id} className="flex flex-col gap-3">
                <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-field px-4 py-2.5 text-[15px] leading-6">{t.question}</p>
                <AnswerView turn={t} onAsk={send} />
              </li>
            ))}
          </ol>
          <div ref={endRef} className="h-2" />
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 bg-surface px-4 pt-2 pb-4 md:-mx-2 md:px-2">
        <Composer
          onSubmit={send}
          busy={busy}
          placeholder={composer.placeholder}
          labels={{ input: composer.input, send: composer.send, busy: composer.busy }}
          footer={
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[12px] font-medium text-ink-muted">{composer.scope}</span>
              <SelectField
                label={composer.period}
                hideLabel
                className="w-36"
                value={scope.period}
                onValueChange={(v) => setScope({ period: v })}
                options={periods.map((p) => ({ value: p.id, label: composer.periodOption(p.label), description: p.range }))}
              />
              <SelectField
                label={composer.customers}
                hideLabel
                className="w-44"
                value={scope.segment}
                onValueChange={(v) => setScope({ segment: v })}
                options={segments.map((s) => ({ value: s.id, label: s.label, description: s.description }))}
              />
            </div>
          }
        />
        <p className="mt-2 text-center text-[12px] leading-4 text-ink-muted">{composer.disclaimer}</p>
      </div>
    </div>
  )
}
