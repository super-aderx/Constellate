import { useState, type ReactNode } from "react"
import { ArrowLeftIcon } from "lucide-react"
import { AlertDialog } from "radix-ui"
import { GenText, type Segment } from "@/components/assistant"
import { GenMark } from "@/components/brand/GenMark"
import { ResultTrend } from "@/components/charts/ResultTrend"
import { CommunityChip, communityColor } from "@/components/graph"
import { Button } from "@/components/ui/button"
import {
  TODAY,
  addCampaign,
  dateRange,
  removeCampaign,
  shortDate,
  summarise,
  updateCampaign,
  type CampaignRecord,
  type CampaignResults,
} from "@/data/campaigns"
import { communityLabel, productById } from "@/data/store"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CampaignForm, type CampaignFields, type FormMode } from "./CampaignForm"
import { detail as copy, endDialog } from "./content"
import { StatusBadge } from "./StatusBadge"

interface CampaignDetailProps {
  campaign: CampaignRecord
  onSelect: (id: string | null) => void
  /** Shown on narrow screens, where the detail replaces the list. */
  onBack?: () => void
}

/** One campaign: what it is, what to do with it next, and its results on the sky. */
export function CampaignDetail({ campaign: c, onSelect, onBack }: CampaignDetailProps) {
  const [form, setForm] = useState<FormMode | null>(null)
  const [ending, setEnding] = useState(false)

  const save = (f: CampaignFields) => {
    const community = productById[f.products[0]]?.community ?? null
    const patch = { name: f.name, offer: f.offer, products: f.products, community, slogans: f.slogans, start: f.start || undefined, end: f.end || undefined }
    updateCampaign(c.id, form === "schedule" ? { ...patch, status: "scheduled" } : patch)
    setForm(null)
  }

  const actions: ReactNode = (() => {
    const primary = "h-9 rounded-xl px-3.5"
    switch (c.status) {
      case "draft":
        return (
          <>
            <Button className={primary} onClick={() => updateCampaign(c.id, { status: "active", start: TODAY, end: c.end && c.end > TODAY ? c.end : undefined })}>
              {copy.launch}
            </Button>
            <Button variant="secondary" className={primary} onClick={() => setForm("schedule")}>
              {copy.schedule}
            </Button>
            <Button variant="secondary" className={primary} onClick={() => setForm("edit")}>
              {copy.edit}
            </Button>
            <Button
              variant="ghost"
              className={cn(primary, "text-negative hover:text-negative")}
              onClick={() => {
                removeCampaign(c.id)
                onSelect(null)
              }}
            >
              {copy.delete}
            </Button>
          </>
        )
      case "scheduled":
        return (
          <>
            <Button className={primary} onClick={() => updateCampaign(c.id, { status: "active", start: TODAY })}>
              {copy.launch}
            </Button>
            <Button variant="secondary" className={primary} onClick={() => setForm("edit")}>
              {copy.edit}
            </Button>
            <Button variant="ghost" className={primary} onClick={() => updateCampaign(c.id, { status: "draft" })}>
              {copy.unschedule}
            </Button>
          </>
        )
      case "active":
      case "paused":
        return (
          <>
            {c.status === "active" ? (
              <Button variant="secondary" className={primary} onClick={() => updateCampaign(c.id, { status: "paused" })}>
                {copy.pause}
              </Button>
            ) : (
              <Button className={primary} onClick={() => updateCampaign(c.id, { status: "active" })}>
                {copy.resume}
              </Button>
            )}
            <Button variant="ghost" className={cn(primary, "text-negative hover:text-negative")} onClick={() => setEnding(true)}>
              {copy.end}
            </Button>
          </>
        )
      case "ended":
        return (
          <Button
            variant="secondary"
            className={primary}
            onClick={() => {
              const { name, offer, products, community, slogans, why, source } = c
              onSelect(addCampaign({ name: copy.copyName(name), offer, products, community, slogans, why, source, status: "draft" }))
            }}
          >
            {copy.duplicate}
          </Button>
        )
    }
  })()

  return (
    <div className="flex flex-col gap-5">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="h-9 self-start rounded-xl px-2.5 text-ink-muted">
          <ArrowLeftIcon />
          {copy.back}
        </Button>
      )}

      <section className="rounded-xl bg-surface-raised p-5 md:p-7" aria-labelledby="campaign-title">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge status={c.status} />
          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
            {c.source === "ai" && <GenMark size={14} />}
            {c.source === "ai" ? copy.byAi : copy.byYou}
          </span>
        </div>
        <h2 id="campaign-title" className="mt-3 text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          {c.name}
        </h2>
        <p className="mt-2 inline-block rounded-md bg-action px-2.5 py-1 text-[14px] font-semibold text-on-action">{c.offer}</p>

        <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] font-medium text-ink-muted">{copy.dates}</dt>
            <dd className="mt-0.5 text-[15px] font-medium tabular-nums">{c.start ? dateRange(c.start, c.end) : copy.notScheduled}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-ink-muted">{copy.products}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {c.products.map((pid) => (
                <span key={pid} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-field px-2.5 text-[13px] font-medium">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: communityColor(productById[pid].community) }} />
                  {productById[pid].label}
                </span>
              ))}
              {c.community != null && <CommunityChip community={c.community} label={communityLabel(c.community)} />}
            </dd>
          </div>
          {c.slogans.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-[12px] font-medium text-ink-muted">{copy.slogans}</dt>
              <dd className="mt-1 flex flex-col gap-0.5">
                {c.slogans.map((s) => (
                  <span key={s} className="text-[17px] leading-[1.4] font-semibold tracking-[-0.01em]">
                    “{s}”
                  </span>
                ))}
              </dd>
            </div>
          )}
          {c.why && (
            <div className="sm:col-span-2">
              <dt className="text-[12px] font-medium text-ink-muted">{copy.why}</dt>
              <dd className="mt-0.5 max-w-[64ch] text-[14px] leading-[21px]">{c.why}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
      </section>

      {c.results ? <Results campaign={c} results={c.results} /> : <NoResults campaign={c} />}

      <CampaignForm mode={form ?? "edit"} open={form != null} onOpenChange={(o) => !o && setForm(null)} initial={c} onSubmit={save} />

      <AlertDialog.Root open={ending} onOpenChange={setEnding}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-sky/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-1/2 rounded-2xl bg-surface-raised p-6 text-ink shadow-pop data-[state=open]:animate-in data-[state=open]:zoom-in-95 motion-reduce:animate-none">
            <AlertDialog.Title className="text-[19px] leading-6 font-semibold">{endDialog.title(c.name)}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-[15px] leading-6 text-ink-muted">{endDialog.body}</AlertDialog.Description>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" className="h-10 rounded-xl px-4">
                  {endDialog.cancel}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="destructive" className="h-10 rounded-xl px-4" onClick={() => updateCampaign(c.id, { status: "ended", end: TODAY })}>
                  {endDialog.confirm}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

function NoResults({ campaign: c }: { campaign: CampaignRecord }) {
  const kind = c.status === "scheduled" ? "scheduled" : c.status === "draft" ? "draft" : "live"
  const pts = [
    [12, 36],
    [30, 14],
    [52, 26],
    [74, 10],
    [86, 34],
  ]
  return (
    <section className="flex flex-col items-center rounded-xl bg-surface-raised px-6 py-12 text-center">
      <svg viewBox="0 0 96 48" width={96} height={48} aria-hidden>
        <path d="M12 36 L30 14 L52 26 L74 10 L86 34" fill="none" stroke="var(--line-strong)" strokeWidth={1.5} strokeDasharray="3 5" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="var(--field)" stroke="var(--line-strong)" strokeWidth={1.5} />
        ))}
      </svg>
      <p className="mt-4 text-[19px] leading-6 font-semibold">{copy.noResultsTitle[kind]}</p>
      <p className="mt-1 max-w-[44ch] text-[14px] leading-[21px] text-ink-muted">
        {kind === "scheduled" ? copy.noResultsBody.scheduled(shortDate(c.start!)) : copy.noResultsBody[kind]}
      </p>
    </section>
  )
}

function Results({ campaign: c, results: r }: { campaign: CampaignRecord; results: CampaignResults }) {
  const [inspect, setInspect] = useState<number | null>(null)
  const s = summarise(r)
  const day = inspect ?? r.days.length - 1
  const anchor = productById[c.products[0]].label
  const addon = productById[c.products[1] ?? c.products[0]].label
  const src = (what: string) => `${what}, ${c.name}, ${dateRange(c.start, c.end)}`

  // The generated read: how it did overall, and anything unusual in the last week.
  const lastWeek = r.actual.slice(-7).reduce((a, b) => a + b, 0) / 7
  const weekBefore = r.actual.slice(-14, -7).reduce((a, b) => a + b, 0) / 7
  const slumped = c.status !== "ended" && s.days >= 14 && lastWeek < weekBefore * 0.75
  const read: Segment[] = [
    `Over ${s.days} days the offer was used in `,
    { value: fmt.int(s.redemptions), source: src("Orders with the offer") },
    " orders, ",
    { value: fmt.pct(Math.max(0, s.uplift)), source: src("Orders with the offer vs expected") },
    " more than expected, adding ",
    { value: fmt.money(s.extraRevenue), source: src("Extra revenue") },
    ` for ${fmt.money(s.discountCost)} of discount. `,
    s.returnRatio >= 2
      ? "It's worth repeating."
      : s.returnRatio >= 1
        ? "It paid for itself, just."
        : "It cost more than it earned: try a smaller discount or a stronger pair.",
    ...(slumped
      ? [
          " Orders with it fell to ",
          { value: lastWeek.toFixed(1), source: src("Average orders per day, last 7 days") },
          ` a day this week from ${weekBefore.toFixed(1)}. Check ${addon} is in stock.`,
        ]
      : []),
  ]

  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-4">
      <h2 id="results-title" className="px-1 text-[21px] leading-7 font-semibold tracking-[-0.018em]">
        {copy.resultsTitle}
      </h2>

      <div className="rounded-xl bg-surface-raised p-5 md:p-6">
        <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
          <GenMark size={14} />
          {copy.readKind}
        </p>
        <p className="mt-2 max-w-[66ch] text-[16px] leading-[1.55] text-pretty">
          <GenText segments={read} />
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          <Kpi label={copy.kpis.redemptions} value={fmt.int(s.redemptions)} />
          <Kpi label={copy.kpis.extra} value={fmt.money(s.extraRevenue)} />
          <Kpi label={copy.kpis.returnRatio} value={fmt.price(s.returnRatio)} />
          <Kpi
            label={copy.kpis.attach}
            value={fmt.pct(r.attachDuring)}
            note={copy.kpis.attachNote(anchor, addon, fmt.pct(r.attachBefore))}
          />
        </dl>
      </div>

      {/* The page's bold element: the results on the sky */}
      <div data-theme="night" className="rounded-2xl bg-sky px-4 pt-5 pb-4 text-ink md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div>
            <h3 className="text-[15px] font-semibold">{copy.chartTitle}</h3>
            {/* Fixed-height readout, so moving along the line never shifts the chart */}
            <p className="mt-0.5 min-h-5 text-[13px] leading-5 tabular-nums" aria-live="polite">
              <span className="font-semibold">{copy.readout(r.days[day])}: </span>
              <span className="text-ink-muted">{copy.readoutFigures(r.actual[day], r.expected[day])}</span>
            </p>
          </div>
          <ul aria-hidden className="m-0 flex list-none gap-4 p-0 text-[12px] text-ink-muted">
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full bg-ink" />
              {copy.actual}
            </li>
            <li className="flex items-center gap-2">
              <svg width={16} height={2}>
                <line x1={0} y1={1} x2={16} y2={1} stroke="var(--comm-rest)" strokeWidth={2} strokeDasharray="4 3" />
              </svg>
              {copy.expected}
            </li>
          </ul>
        </div>
        <ResultTrend
          className="mt-2"
          days={r.days}
          actual={r.actual}
          expected={r.expected}
          markIndex={r.launchIndex}
          markLabel={copy.launched(r.days[r.launchIndex])}
          inspect={inspect}
          onInspect={setInspect}
          format={fmt.int}
          label={copy.chartLabel(c.name)}
          height={240}
        />
        <table className="sr-only">
          <caption>{copy.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.day}</th>
              <th scope="col">{copy.actual}</th>
              <th scope="col">{copy.expected}</th>
            </tr>
          </thead>
          <tbody>
            {r.days.map((d, i) => (
              <tr key={i}>
                <th scope="row">{d}</th>
                <td>{r.actual[i]}</td>
                <td>{r.expected[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[12px] leading-4 font-medium text-ink-muted">{label}</dt>
      <dd className="text-[23px] leading-8 font-semibold tracking-[-0.025em]">{value}</dd>
      {note && <dd className="text-[12px] leading-4 text-ink-muted">{note}</dd>}
    </div>
  )
}
