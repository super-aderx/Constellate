import { useState } from "react"
import { Change } from "@/components/charts/Change"
import { LiftMeter } from "@/components/charts/LiftMeter"
import { WeekBars } from "@/components/charts/WeekBars"
import { CommunityChip, communityColor } from "@/components/graph"
import { Button } from "@/components/ui/button"
import { communityLabel, productById, weeks } from "@/data/store"
import { fmt } from "@/lib/format"
import { appHref } from "@/lib/route"
import { detail as copy } from "./content"
import type { ProductRow } from "./model"

const LAST = weeks.length - 1

/** One product: its figures, 12 weeks of revenue (select a week to read it out) and its strongest pairs. */
export function ProductDetail({ row }: { row: ProductRow }) {
  const [week, setWeek] = useState(LAST)
  const p = row.product

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col items-start gap-2">
        <div>
          <h2 className="text-[23px] leading-[1.2] font-semibold tracking-[-0.02em]">{p.label}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted tabular-nums">{copy.each(p.category, fmt.price(p.price))}</p>
        </div>
        <CommunityChip community={p.community} label={p.community == null ? copy.noCommunity : communityLabel(p.community)} />
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Figure label={copy.revenue} value={fmt.money(row.revenue)} />
        <Figure label={copy.units} value={fmt.int(row.units)} />
        <Figure label={copy.share} value={fmt.pct(row.share)} note={copy.shareNote} />
        <div className="flex flex-col gap-0.5">
          <dt className="text-[12px] leading-4 font-medium text-ink-muted">{copy.change}</dt>
          <dd className="text-[21px] leading-7 font-semibold tracking-[-0.02em]">
            <Change ratio={row.change} />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="weekly-title">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="weekly-title" className="text-[13px] font-semibold">
            {copy.weekly}
          </h3>
          {/* Readout: fixed height, so moving between weeks never shifts the chart */}
          <p className="text-right text-[13px] leading-5 tabular-nums">
            <span className="text-ink-muted">{copy.weekReadout(weeks[week].label)}: </span>
            <span className="font-semibold">{fmt.money(row.series[week])}</span>
            {week > 0 && (
              <span className="ml-1.5">
                <Change from={row.series[week - 1]} to={row.series[week]} />
              </span>
            )}
          </p>
        </div>
        <WeekBars
          className="mt-2"
          labels={weeks.map((w) => w.label)}
          longLabels={weeks.map((w) => w.long)}
          values={row.series}
          selected={week}
          onSelect={setWeek}
          format={fmt.money}
          label={copy.weeksLabel}
          height={180}
        />
      </section>

      <section aria-labelledby="pairs-title">
        <h3 id="pairs-title" className="text-[13px] font-semibold">
          {copy.pairs}
        </h3>
        <p className="text-[12px] leading-4 text-ink-muted">{copy.pairsNote}</p>
        {row.pairs.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-muted">{copy.noPairs}</p>
        ) : (
          <ul className="m-0 mt-2 list-none p-0 [&>li+li]:border-t [&>li+li]:border-line">
            {row.pairs.slice(0, 6).map((pair) => {
              const partner = productById[pair.partner]
              return (
                <li key={pair.partner} className="flex items-center gap-2.5 py-2">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: communityColor(partner.community) }} />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{partner.label}</span>
                  <span className="text-[12px] text-ink-muted tabular-nums">{copy.together(pair.coOrders)}</span>
                  <LiftMeter lift={pair.lift} />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="h-10 rounded-xl px-4">
          <a href={appHref("network", { product: p.id })}>{copy.network}</a>
        </Button>
        <Button asChild variant="secondary" className="h-10 rounded-xl px-4">
          <a href={appHref("ask", { q: copy.askPrompt(p.label) })}>{copy.ask}</a>
        </Button>
      </div>
    </div>
  )
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[12px] leading-4 font-medium text-ink-muted">{label}</dt>
      <dd className="text-[21px] leading-7 font-semibold tracking-[-0.02em]">{value}</dd>
      {note && <dd className="text-[12px] leading-4 text-ink-muted">{note}</dd>}
    </div>
  )
}
