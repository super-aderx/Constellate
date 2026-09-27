import { useEffect, type ReactNode } from "react"
import { ArrowLeftIcon, CheckIcon } from "lucide-react"
import { GenText } from "@/components/assistant"
import { GenMark } from "@/components/brand/GenMark"
import { Change } from "@/components/charts/Change"
import { LiftDotPlot } from "@/components/charts/LiftDotPlot"
import { CommunityChip } from "@/components/graph"
import { Button } from "@/components/ui/button"
import { dateRange, useCampaigns } from "@/data/campaigns"
import { periods, productById, segments, storeInfo, type PeriodId, type SegmentId } from "@/data/store"
import { status as statusCopy } from "@/features/campaigns/content"
import { useTimeline } from "@/hooks/useTimeline"
import { fmt } from "@/lib/format"
import { appHref } from "@/lib/route"
import { cn } from "@/lib/utils"
import { report as copy } from "./content"
import { buildReport } from "./report"

const STEP_MS = 480

/**
 * The one-click business report: a short "writing" sequence, then a document you can read, print or
 * save as PDF. `?period=` and `?segment=` carry the scope chosen in Constella AI.
 */
export function ReportPage({ params }: { params: URLSearchParams }) {
  const periodId = (periods.find((p) => p.id === params.get("period"))?.id ?? "90d") as PeriodId
  const segmentId = (segments.find((s) => s.id === params.get("segment"))?.id ?? "all") as SegmentId
  const campaigns = useCampaigns()
  const r = buildReport(periodId, segmentId, campaigns)

  const total = copy.steps.length * STEP_MS
  const elapsed = useTimeline(total, true, `${periodId}/${segmentId}`)
  const step = Math.min(copy.steps.length, Math.floor(elapsed / STEP_MS))
  const done = elapsed >= total

  useEffect(() => {
    if (done) window.scrollTo(0, 0)
  }, [done])

  if (!done) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-4" aria-live="polite" aria-busy>
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold">
          <GenMark size={20} />
          {copy.generating}
        </p>
        <ol className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
          {copy.steps.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3 text-[15px] transition-colors", i < step ? "text-ink" : i === step ? "text-ink" : "text-ink-faint")}>
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-semibold",
                  i < step ? "bg-action text-on-action" : i === step ? "bg-star-soft text-star-ink" : "bg-field",
                )}
              >
                {i < step ? <CheckIcon className="size-3.5" /> : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-16 md:px-8 md:pt-10 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" className="h-9 rounded-xl px-3 text-ink-muted">
          <a href="#/ask">
            <ArrowLeftIcon />
            {copy.back}
          </a>
        </Button>
        <Button className="h-10 rounded-xl px-4" onClick={() => window.print()}>
          {copy.print}
        </Button>
      </div>

      <article className="mt-4 rounded-2xl bg-surface-raised px-5 py-8 md:px-12 md:py-12 animate-in fade-in-0 duration-500 motion-reduce:animate-none print:rounded-none print:px-0 print:py-0">
        <header className="border-b border-line pb-8">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
            <GenMark size={16} />
            {copy.kind}
          </p>
          <h1 className="mt-3 text-[clamp(1.75rem,1.3rem+1.8vw,2.75rem)] leading-[1.1] font-bold tracking-[-0.035em] text-balance">
            {copy.title(storeInfo.name)}
          </h1>
          <p className="mt-3 text-[14px] leading-[21px] text-ink-muted">{copy.scope(r.period.range, r.segment.label)}</p>
          <p className="text-[14px] leading-[21px] text-ink-muted tabular-nums">{copy.generated(storeInfo.asOf)}</p>
        </header>

        <Section title={copy.summaryTitle}>
          <p className="max-w-[64ch] text-[19px] leading-[1.55] tracking-[-0.01em] text-pretty">
            <GenText segments={r.summary} />
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <Kpi label={copy.kpis.revenue} value={fmt.money(r.kpis.revenue)} detail={<><Change ratio={r.kpis.revenueChange} /> <span className="text-ink-muted">{copy.kpis.vsBefore}</span></>} />
            <Kpi label={copy.kpis.orders} value={fmt.int(r.kpis.orders)} />
            <Kpi label={copy.kpis.pairs} value={fmt.int(r.kpis.pairs)} />
            <Kpi label={copy.kpis.bridges} value={fmt.int(r.kpis.bridges)} />
          </dl>
        </Section>

        <Section title={copy.salesTitle}>
          <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
            <SalesTable title={copy.topTitle} rows={r.top.map((t) => ({ id: t.p.id, revenue: t.revenue, change: t.change }))} />
            <div className="flex flex-col gap-8">
              <SalesTable title={copy.risingTitle} rows={r.rising.map((t) => ({ id: t.p.id, change: t.change }))} compact />
              <SalesTable title={copy.fallingTitle} rows={r.falling.map((t) => ({ id: t.p.id, change: t.change }))} compact />
            </div>
          </div>
        </Section>

        <Section title={copy.pairsTitle} body={copy.pairsBody}>
          <LiftDotPlot rows={r.pairs} caption={copy.pairsCaption} />
          {r.nearChance && (
            <p className="mt-3 text-[14px] leading-[21px] text-ink-muted">{copy.nearChance(productById[r.nearChance.source].label, productById[r.nearChance.target].label)}</p>
          )}
        </Section>

        <Section title={copy.communitiesTitle}>
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-ink-muted">
                <th scope="col" className="pb-2 font-medium">{copy.community}</th>
                <th scope="col" className="pb-2 text-right font-medium">{copy.products}</th>
                <th scope="col" className="pb-2 text-right font-medium">{copy.revenue}</th>
                <th scope="col" className="pb-2 text-right font-medium">{copy.change}</th>
              </tr>
            </thead>
            <tbody>
              {r.communityRows.map((c) => (
                <tr key={c.community} className="border-t border-line">
                  <th scope="row" className="py-2.5 text-left font-medium">
                    <CommunityChip community={c.community} label={c.label} />
                  </th>
                  <td className="py-2.5 text-right tabular-nums">{c.products}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{fmt.money(c.revenue)}</td>
                  <td className="py-2.5 text-right text-[13px]">
                    <Change ratio={c.change} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title={copy.bridgesTitle} body={copy.bridgesBody}>
          {r.bridges.length === 0 ? (
            <p className="text-[15px] text-ink-muted">{copy.noBridges}</p>
          ) : (
            <ul className="m-0 list-none p-0 [&>li+li]:border-t [&>li+li]:border-line">
              {r.bridges.map((b) => (
                <li key={b.id} className="grid gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <span className="font-semibold">{productById[b.id].label}</span>
                  <span className="text-[14px] text-ink-muted">{copy.holdsIn(b.cut.map((id) => productById[id].label).join(", "))}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={copy.campaignsTitle}>
          {r.results.length === 0 ? (
            <p className="text-[15px] text-ink-muted">{copy.noCampaigns}</p>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[34rem] border-collapse text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-ink-muted">
                    <th scope="col" className="pb-2 font-medium">{copy.campaign}</th>
                    <th scope="col" className="pb-2 font-medium">{copy.status}</th>
                    <th scope="col" className="pb-2 text-right font-medium">{copy.redemptions}</th>
                    <th scope="col" className="pb-2 text-right font-medium">{copy.extra}</th>
                    <th scope="col" className="pb-2 text-right font-medium">{copy.returnRatio}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.results.map(({ c, s }) => (
                    <tr key={c.id} className="border-t border-line">
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                        {c.name}
                        <span className="block text-[12px] font-normal text-ink-muted tabular-nums">{dateRange(c.start, c.end)}</span>
                      </th>
                      <td className="py-2.5 text-[13px]">{statusCopy[c.status]}</td>
                      <td className="py-2.5 text-right tabular-nums">{fmt.int(s.redemptions)}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">{fmt.money(s.extraRevenue)}</td>
                      <td className="py-2.5 text-right tabular-nums">{fmt.price(s.returnRatio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={copy.nextTitle}>
          {/* Numbered: they're in priority order */}
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {r.recommendations.map((rec, i) => (
              <li key={rec.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
                <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-full bg-field text-[13px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[17px] leading-6 font-semibold">{rec.title}</h3>
                  <p className="mt-1 max-w-[64ch] text-[15px] leading-6">
                    <GenText segments={rec.body} />
                  </p>
                  {rec.prompt && (
                    <a
                      href={appHref("ask", { q: rec.prompt })}
                      className="mt-2 inline-block text-[14px] font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink print:hidden"
                    >
                      {copy.draft}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <p className="mt-10 border-t border-line pt-6 text-[13px] leading-5 text-ink-muted">{copy.method}</p>
      </article>
    </div>
  )
}

function Section({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <section className="mt-10 break-inside-avoid-page">
      <h2 className="text-[23px] leading-8 font-semibold tracking-[-0.02em]">{title}</h2>
      {body && <p className="mt-1 max-w-[64ch] text-[15px] leading-6 text-ink-muted">{body}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Kpi({ label, value, detail }: { label: string; value: string; detail?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[12px] leading-4 font-medium text-ink-muted">{label}</dt>
      <dd className="text-[28px] leading-9 font-semibold tracking-[-0.03em]">{value}</dd>
      {detail && <dd className="text-[12px] leading-4">{detail}</dd>}
    </div>
  )
}

function SalesTable({ title, rows, compact }: { title: string; rows: { id: string; revenue?: number; change: number }[]; compact?: boolean }) {
  return (
    <table className="w-full border-collapse text-[14px]">
      <caption className="pb-2 text-left text-[15px] font-semibold">{title}</caption>
      {!compact && (
        <thead>
          <tr className="text-left text-[12px] text-ink-muted">
            <th scope="col" className="pb-2 font-medium">{copy.product}</th>
            <th scope="col" className="pb-2 text-right font-medium">{copy.revenue}</th>
            <th scope="col" className="pb-2 text-right font-medium">{copy.change}</th>
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <th scope="row" className="py-2 text-left font-medium">{productById[row.id].label}</th>
            {!compact && <td className="py-2 text-right font-semibold tabular-nums">{fmt.money(row.revenue ?? 0)}</td>}
            <td className="py-2 text-right text-[13px]">
              <Change ratio={row.change} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
