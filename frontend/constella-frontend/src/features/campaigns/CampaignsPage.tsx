import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { SegmentedControl } from "@/components/controls/SegmentedControl"
import { communityColor } from "@/components/graph"
import { Button } from "@/components/ui/button"
import { addCampaign, dateRange, summarise, useCampaigns, type CampaignRecord } from "@/data/campaigns"
import { productById, storeInfo } from "@/data/store"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { fmt } from "@/lib/format"
import { appHref } from "@/lib/route"
import { cn } from "@/lib/utils"
import { CampaignDetail } from "./CampaignDetail"
import { CampaignForm } from "./CampaignForm"
import { list as listCopy, page, totals as totalsCopy } from "./content"
import { StatusBadge } from "./StatusBadge"

type Filter = (typeof listCopy.filters)[number]["value"]

const inFilter = (c: CampaignRecord, f: Filter) =>
  f === "all" ||
  (f === "active" && (c.status === "active" || c.status === "paused")) ||
  (f === "planned" && (c.status === "draft" || c.status === "scheduled")) ||
  (f === "ended" && c.status === "ended")

/** Campaigns: live totals, the list, and the selected campaign's detail and results. `?campaign=` opens one. */
export function CampaignsPage({ params }: { params: URLSearchParams }) {
  const campaigns = useCampaigns()
  const wide = useMediaQuery("(min-width: 1024px)")
  const linked = params.get("campaign")
  const [filter, setFilter] = useState<Filter>("all")
  const [selected, setSelected] = useState<string | null>(() =>
    linked && campaigns.some((c) => c.id === linked) ? linked : window.matchMedia("(min-width: 1024px)").matches ? campaigns[0]?.id ?? null : null,
  )
  const [creating, setCreating] = useState(false)

  const shown = campaigns.filter((c) => inFilter(c, filter))
  const current = campaigns.find((c) => c.id === selected) ?? null

  // Paused campaigns aren't running, so the live totals leave them out (the Live filter still lists them).
  const live = campaigns.filter((c) => c.status === "active")
  const liveTotals = live.reduce(
    (t, c) => {
      if (!c.results) return t
      const s = summarise(c.results)
      return { orders: t.orders + s.redemptions, extra: t.extra + s.extraRevenue, cost: t.cost + s.discountCost }
    },
    { orders: 0, extra: 0, cost: 0 },
  )

  const listPanel = (
    <section aria-label={listCopy.label} className="rounded-xl bg-surface-raised p-3">
      <div className="px-1 pt-1 pb-3">
        <SegmentedControl
          label={listCopy.filterLabel}
          stretch
          value={filter}
          onValueChange={setFilter}
          options={listCopy.filters.map((f) => ({
            value: f.value,
            label: (
              <>
                {f.label}
                <span className="font-medium tabular-nums opacity-70">{campaigns.filter((c) => inFilter(c, f.value)).length}</span>
              </>
            ),
          }))}
        />
      </div>
      {shown.length === 0 ? (
        <p className="px-3 py-10 text-center text-[14px] text-ink-muted">{listCopy.empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {shown.map((c) => {
            const on = c.id === selected
            const s = c.results ? summarise(c.results) : null
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(c.id)}
                  className={cn("flex w-full cursor-pointer flex-col gap-1.5 rounded-lg px-3 py-3 text-left transition-colors", on ? "bg-star-soft" : "hover:bg-field/70")}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className={cn("flex min-w-0 items-center gap-2 text-[15px] leading-5 font-semibold", on && "text-star-ink")}>
                      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: communityColor(c.community) }} />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <StatusBadge status={c.status} className="shrink-0" />
                  </span>
                  <span className="truncate pl-4 text-[13px] leading-[18px] text-ink-muted">{c.offer}</span>
                  <span className="flex justify-between gap-3 pl-4 text-[12px] leading-4 text-ink-muted tabular-nums">
                    <span>{c.start ? dateRange(c.start, c.end) : listCopy.draftNote}</span>
                    {s ? (
                      <span className="font-semibold text-ink">{listCopy.extra(s.extraRevenue)}</span>
                    ) : c.status === "active" ? (
                      <span>{listCopy.collecting}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )

  return (
    <div className="mx-auto max-w-[88rem] px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em]">{page.title}</h1>
          <p className="mt-2 max-w-[60ch] text-[15px] leading-6 text-ink-muted md:text-base">{page.summary(storeInfo.name)}</p>
        </div>
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          <Button asChild variant="secondary" className="h-10 rounded-xl px-4 max-sm:flex-1">
            <a href={appHref("ask", { q: page.draftPrompt })}>{page.draftWithAi}</a>
          </Button>
          <Button className="h-10 rounded-xl px-4 max-sm:flex-1" onClick={() => setCreating(true)}>
            <PlusIcon />
            {page.create}
          </Button>
        </div>
      </header>

      <section aria-label={totalsCopy.label} className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-surface-raised px-5 py-4 md:grid-cols-4">
        {[
          [totalsCopy.live, fmt.int(live.length)],
          [totalsCopy.orders, fmt.int(liveTotals.orders)],
          [totalsCopy.extra, fmt.money(liveTotals.extra)],
          [totalsCopy.cost, fmt.money(liveTotals.cost)],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[12px] leading-4 font-medium text-ink-muted">{label}</span>
            <span className="text-[23px] leading-8 font-semibold tracking-[-0.025em]">{value}</span>
          </div>
        ))}
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {wide ? (
          <>
            <div className="sticky top-6">{listPanel}</div>
            {current && <CampaignDetail key={current.id} campaign={current} onSelect={setSelected} />}
          </>
        ) : current ? (
          <CampaignDetail key={current.id} campaign={current} onSelect={setSelected} onBack={() => setSelected(null)} />
        ) : (
          listPanel
        )}
      </div>

      <CampaignForm
        mode="create"
        open={creating}
        onOpenChange={setCreating}
        onSubmit={(f) => {
          const id = addCampaign({
            name: f.name,
            offer: f.offer,
            products: f.products,
            community: productById[f.products[0]]?.community ?? null,
            slogans: f.slogans,
            start: f.start || undefined,
            end: f.end || undefined,
            status: "draft",
            source: "you",
          })
          setCreating(false)
          setFilter("all")
          setSelected(id)
        }}
      />
    </div>
  )
}
