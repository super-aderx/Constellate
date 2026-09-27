import { CampaignCard, GenText, QueryTrace, SuggestedQuestions } from "@/components/assistant"
import { GenMark } from "@/components/brand/GenMark"
import { LiftDotPlot } from "@/components/charts/LiftDotPlot"
import { RankList } from "@/components/charts/RankList"
import { Button } from "@/components/ui/button"
import { addCampaign } from "@/data/campaigns"
import { storeInfo } from "@/data/store"
import { fmt } from "@/lib/format"
import { appHref } from "@/lib/route"
import { answer as copy, report as reportCopy } from "./content"
import { markSaved, nextSlogans, type Turn } from "./conversation"
import type { Evidence } from "./engine"

const FORMATS: Record<Extract<Evidence, { kind: "rank" }>["format"], (v: number) => string> = {
  money: fmt.money,
  up: (v) => `▲ ${fmt.change(v)}`,
  down: (v) => `▼ ${fmt.change(v)}`,
  count: (v) => fmt.int(v),
}

/** One generated answer: marked as generated, with its figures sourced, its evidence and the queries behind it. */
export function AnswerView({ turn, onAsk }: { turn: Turn; onAsk: (q: string) => void }) {
  const a = turn.answer
  return (
    <article aria-busy={!turn.ready} className="flex flex-col gap-4 rounded-xl bg-surface-raised p-5 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
          <GenMark size={16} />
          {copy.kind}
        </span>
        <span className="text-[12px] text-ink-muted tabular-nums">{copy.asOf(storeInfo.asOf)}</span>
      </header>

      {!turn.ready ? (
        <div className="flex flex-col gap-2.5" aria-live="polite">
          <span className="text-[14px] text-ink-muted">{a.reading}…</span>
          {[94, 82, 58].map((w, i) => (
            <span key={i} className="h-3 animate-pulse rounded-[3px] bg-field motion-reduce:animate-none" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-in fade-in-0 duration-300 motion-reduce:animate-none">
          <p className="max-w-[62ch] text-[17px] leading-[1.5] font-semibold tracking-[-0.01em] text-pretty">
            <GenText segments={a.headline} />
          </p>
          {a.points.length > 0 && (
            <ul className="m-0 flex max-w-[62ch] list-disc flex-col gap-1.5 pl-5 text-[15px] leading-6 marker:text-ink-faint">
              {a.points.map((p, i) => (
                <li key={i}>
                  <GenText segments={p} />
                </li>
              ))}
            </ul>
          )}

          {a.evidence?.kind === "lift" && (
            <div className="rounded-xl bg-surface px-4 pt-3 pb-2">
              <p className="text-[12px] font-medium text-ink-muted">{a.evidence.caption}</p>
              <LiftDotPlot rows={a.evidence.rows} caption={a.evidence.caption} className="mt-1 [--plot-surface:var(--surface)]" />
            </div>
          )}
          {a.evidence?.kind === "rank" && (
            <div className="rounded-xl bg-surface px-4 pt-3 pb-1">
              <p className="text-[12px] font-medium text-ink-muted">{a.evidence.label}</p>
              <RankList items={a.evidence.items} label={a.evidence.label} format={FORMATS[a.evidence.format]} />
            </div>
          )}

          {a.campaign && (
            <div className="flex flex-col gap-3">
              <CampaignCard
                key={turn.sloganSet}
                kind={copy.campaignKind}
                reveal={turn.sloganSet === 0}
                className="bg-surface shadow-none"
                campaign={{ name: a.campaign.name, offer: a.campaign.offer, slogans: a.campaign.sloganSets[turn.sloganSet], why: a.campaign.why }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {turn.savedAs ? (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]" role="status">
                    <span className="font-semibold text-positive">✓ {copy.saved}</span>
                    <a href={appHref("campaigns", { campaign: turn.savedAs })} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {copy.openCampaigns}
                    </a>
                  </p>
                ) : (
                  <Button
                    className="h-9 rounded-xl px-3.5"
                    onClick={() => {
                      const c = a.campaign!
                      const id = addCampaign({
                        name: c.name,
                        offer: c.offer,
                        products: c.products,
                        community: c.community,
                        slogans: c.sloganSets[turn.sloganSet],
                        status: "draft",
                        source: "ai",
                        why: c.why,
                      })
                      markSaved(turn.id, id)
                    }}
                  >
                    {copy.save}
                  </Button>
                )}
                {!turn.savedAs && a.campaign.sloganSets.length > 1 && (
                  <Button variant="secondary" className="h-9 rounded-xl px-3.5" onClick={() => nextSlogans(turn.id)}>
                    {copy.moreSlogans}
                  </Button>
                )}
              </div>
            </div>
          )}

          {a.report && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface p-4">
              <div>
                <p className="text-[15px] font-semibold">{reportCopy.ready}</p>
                <p className="text-[13px] text-ink-muted">{reportCopy.title}</p>
              </div>
              <Button asChild className="h-9 rounded-xl px-3.5">
                <a href={appHref("report", { period: turn.scope.period, segment: turn.scope.segment })}>{reportCopy.open}</a>
              </Button>
            </div>
          )}

          {a.networkProduct && !a.campaign && (
            <div>
              <Button asChild variant="secondary" className="h-9 rounded-xl px-3.5">
                <a href={appHref("network", { product: a.networkProduct })}>{copy.openNetwork}</a>
              </Button>
            </div>
          )}

          {a.trace.length > 0 && <QueryTrace steps={a.trace} label={copy.trace} count={copy.queries(a.trace.length)} />}

          {a.followUps.length > 0 && <SuggestedQuestions questions={a.followUps} onPick={onAsk} label={copy.followUps} />}
        </div>
      )}
    </article>
  )
}
