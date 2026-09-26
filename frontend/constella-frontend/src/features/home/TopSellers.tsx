import { RankList } from "@/components/charts/RankList"
import { fmt } from "@/lib/format"
import { Change } from "./Change"
import { topSellers } from "./content"

/** The week's five best sellers by revenue, each with its community's dot and change. */
export function TopSellers() {
  return (
    <section aria-labelledby="sellers-title" className="flex flex-col rounded-xl bg-surface-raised p-5 md:p-7">
      <h2 id="sellers-title" className="text-[17px] leading-6 font-semibold">
        {topSellers.title}
      </h2>
      <p className="text-[13px] leading-5 text-ink-muted tabular-nums">{topSellers.subtitle}</p>
      <RankList
        className="mt-3"
        label={topSellers.listLabel}
        format={fmt.money}
        items={topSellers.items.map((it) => ({
          id: it.id,
          name: it.name,
          community: it.community,
          score: it.revenue,
          detail: <Change ratio={it.change} className="font-medium" />,
        }))}
      />
      <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-[13px] leading-5">
        <span className="text-ink-muted tabular-nums">{topSellers.vsPrevious}</span>
        <a href={topSellers.link.href} className="rounded-sm font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink">
          {topSellers.link.label}
        </a>
      </div>
    </section>
  )
}
