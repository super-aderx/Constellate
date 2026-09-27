import { Sparkline } from "@/components/charts/Sparkline"
import { CommunityChip } from "@/components/graph"
import { Change } from "@/components/charts/Change"
import { communities, productById, recentChange, seriesOf } from "@/data/store"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { communityTable as copy } from "./content"
import type { NetworkModel } from "./model"

/** The communities in view: size, sales for the period, the last 4 weeks' trend and their strongest pair, all for the products shown. */
export function CommunityTable({
  model,
  highlight,
  onHighlight,
  className,
}: {
  model: NetworkModel
  highlight: number | null
  onHighlight: (c: number | null) => void
  className?: string
}) {
  const rows = communities
    .map((c) => {
      const members = model.nodes.filter((n) => n.community === c.community)
      const inside = model.edges
        .filter((e) => productById[e.source].community === c.community && productById[e.target].community === c.community)
        .sort((a, b) => b.lift - a.lift)
      // The trend covers the products shown, like the other columns. Weekly sales aren't split by customer segment.
      const series = seriesOf(members.map((n) => n.id))
      return {
        ...c,
        size: members.length,
        revenue: members.reduce((s, n) => s + n.revenue, 0),
        series,
        change: recentChange(series),
        top: inside[0],
      }
    })
    .filter((r) => r.size > 0)
    .sort((a, b) => b.revenue - a.revenue)

  return (
    <section aria-labelledby="communities-title" className={cn("rounded-xl bg-surface-raised p-5 md:p-6", className)}>
      <h2 id="communities-title" className="text-[17px] leading-6 font-semibold">
        {copy.title}
      </h2>
      <p className="text-[13px] leading-5 text-ink-muted">{copy.note}</p>
      <div className="-mx-2 mt-3 overflow-x-auto px-2">
        <table className="w-full min-w-[40rem] border-collapse text-[14px]">
          <caption className="sr-only">{copy.caption}</caption>
          <thead>
            <tr className="text-left text-[12px] text-ink-muted">
              <th scope="col" className="pb-2 font-medium">{copy.community}</th>
              <th scope="col" className="pb-2 text-right font-medium">{copy.products}</th>
              <th scope="col" className="pb-2 text-right font-medium">{copy.revenue}</th>
              <th scope="col" className="pb-2 pl-6 font-medium">{copy.change}</th>
              <th scope="col" className="pb-2 pl-6 font-medium">{copy.topPair}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.community} className={cn("border-t border-line", highlight === r.community && "bg-star-soft/50")}>
                <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                  <CommunityChip
                    community={r.community}
                    label={r.label}
                    selected={highlight === r.community}
                    actionLabel={copy.select(r.label)}
                    onClick={() => onHighlight(highlight === r.community ? null : r.community)}
                  />
                </th>
                <td className="py-2.5 text-right tabular-nums">{r.size}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{fmt.money(r.revenue)}</td>
                <td className="py-2.5 pl-6">
                  <span className="flex items-center gap-3">
                    <Sparkline values={r.series} width={72} height={24} />
                    <Change ratio={r.change} className="text-[13px]" />
                  </span>
                </td>
                <td className="py-2.5 pl-6 text-ink-muted">
                  {r.top ? (
                    <>
                      <span className="text-ink">
                        {productById[r.top.source].label} and {productById[r.top.target].label}
                      </span>{" "}
                      <span className="tabular-nums">{fmt.lift(r.top.lift)}</span>
                    </>
                  ) : (
                    copy.none
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
