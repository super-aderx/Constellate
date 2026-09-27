import { useState } from "react"
import { Change } from "@/components/charts/Change"
import { Sparkline } from "@/components/charts/Sparkline"
import { communityColor } from "@/components/graph"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { table as copy } from "./content"
import { nameOf, type ProductRow } from "./model"

type SortKey = "name" | "revenue" | "change" | "pairs"

const value = (r: ProductRow, k: SortKey) =>
  k === "name" ? r.product.label : k === "revenue" ? r.revenue : k === "change" ? r.change : r.pairs.length

/** Sortable product table. The selected row is soft peach; each product name is the row's button. */
export function ProductTable({ rows, selected, onSelect }: { rows: ProductRow[]; selected: string | null; onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "revenue", dir: -1 })
  const sorted = [...rows].sort((a, b) => {
    const x = value(a, sort.key)
    const y = value(b, sort.key)
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir
  })

  // A render helper, not a component, so sort buttons keep focus across re-renders.
  const head = (k: SortKey, label: string, align: "left" | "right" = "left", className?: string) => {
    const on = sort.key === k
    return (
      <th key={k} scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : undefined} className={cn("pb-2 font-medium", align === "right" && "text-right", className)}>
        <button
          type="button"
          onClick={() => setSort(on ? { key: k, dir: sort.dir === 1 ? -1 : 1 } : { key: k, dir: k === "name" ? 1 : -1 })}
          className={cn("inline-flex cursor-pointer items-center gap-1 rounded-sm hover:text-ink", align === "right" && "flex-row-reverse", on && "text-ink")}
        >
          {label}
          <span aria-hidden className={cn(!on && "opacity-35")}>
            {on && sort.dir === 1 ? "↑" : "↓"}
          </span>
        </button>
      </th>
    )
  }

  return (
    <table className="w-full border-collapse text-[14px]">
      <caption className="sr-only">{copy.caption}</caption>
      <thead>
        <tr className="text-left text-[12px] text-ink-muted">
          {head("name", copy.product, "left", "pl-3")}
          {head("revenue", copy.revenue, "right")}
          <th scope="col" className="hidden pb-2 pl-5 font-medium sm:table-cell">
            {copy.trend}
          </th>
          {head("change", copy.change, "right", "pl-3")}
          {head("pairs", copy.pairs, "right", "hidden pl-3 md:table-cell")}
          <th scope="col" className="hidden pb-2 pl-5 font-medium xl:table-cell">
            {copy.topPair}
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => {
          const on = selected === r.product.id
          const top = r.pairs[0]
          return (
            <tr
              key={r.product.id}
              onClick={() => onSelect(r.product.id)}
              className={cn("cursor-pointer border-t border-line transition-colors", on ? "bg-star-soft" : "hover:bg-field/60")}
            >
              <th scope="row" className="py-2.5 pr-3 pl-3 text-left font-normal">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={copy.select(r.product.label)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(r.product.id)
                  }}
                  className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-sm text-left"
                >
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: communityColor(r.product.community) }} />
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("truncate font-medium", on && "font-semibold text-star-ink")}>{r.product.label}</span>
                    <span className="text-[12px] leading-4 text-ink-muted">{r.product.category}</span>
                  </span>
                </button>
              </th>
              <td className="py-2.5 text-right font-semibold tabular-nums">{fmt.money(r.revenue)}</td>
              <td className="hidden py-2.5 pl-5 sm:table-cell">
                <Sparkline values={r.series} width={80} height={26} className={on ? "text-star-ink" : undefined} />
              </td>
              <td className="py-2.5 pl-3 text-right text-[13px]">
                <Change ratio={r.change} />
              </td>
              <td className="hidden py-2.5 pl-3 text-right tabular-nums md:table-cell">{r.pairs.length}</td>
              <td className="hidden py-2.5 pr-3 pl-5 text-[13px] xl:table-cell">
                {top ? (
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate">{nameOf(top.partner)}</span>
                    <span className="text-ink-muted tabular-nums">{fmt.lift(top.lift)}</span>
                  </span>
                ) : (
                  <span className="text-ink-muted">{copy.noPairs}</span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
