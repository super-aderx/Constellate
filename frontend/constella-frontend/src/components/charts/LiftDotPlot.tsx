import { RocketGlyph } from "@/components/brand/Rocket"
import { useInView } from "@/hooks/useInView"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface LiftRow {
  id: string
  label: string
  lift: number
  coOrders: number
}

/** Stem, dot and value slide together from chance to the pair's lift. */
const move =
  "transition-[left,width,opacity] duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"

interface LiftDotPlotProps {
  rows: LiftRow[]
  caption: string
  /**
   * "rocket": pairs above chance are drawn as rockets that launch from the chance line and leave
   * a dotted trail; pairs below chance stay dots, since they never took off.
   */
  marker?: "dot" | "rocket"
  className?: string
}

/**
 * Pairs on one lift axis, each drawn as a stem from chance (1.00×) to its lift.
 * A real table underneath, so it reads the same without the graphics.
 * On first view every pair starts at chance and slides out to its lift.
 */
export function LiftDotPlot({ rows, caption, marker = "dot", className }: LiftDotPlotProps) {
  const [ref, inView] = useInView<HTMLTableElement>()
  // Headroom past the largest lift so its value label fits inside the track.
  const max = Math.max(2, Math.ceil(Math.max(...rows.map((r) => r.lift)) * 1.15))
  const at = (lift: number) => `${(lift / max) * 100}%`
  const ticks = Array.from({ length: max + 1 }, (_, i) => i)

  return (
    <table ref={ref} className={cn("w-full border-collapse text-[15px]", className)}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        {/* Below sm, rows become one column: the pair's name above a full-width track */}
        <tr className="text-left text-[13px] text-ink-muted max-sm:grid">
          <th scope="col" className="w-[38%] pr-4 pb-3 font-medium max-sm:hidden">Pair</th>
          <th scope="col" className="pb-3 font-medium">
            <div className="relative h-5">
              <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: at(1) }}>
                1.00× = chance
              </span>
            </div>
            <span className="sr-only">Lift</span>
          </th>
          <th scope="col" className="hidden w-24 pb-3 pl-4 text-right font-medium sm:table-cell">Orders</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const above = row.lift >= 1
          const tone = above ? "var(--action)" : "var(--ink-faint)"
          const lift = inView ? row.lift : 1
          const delay = { transitionDelay: `${i * 90}ms` }
          const rocket = marker === "rocket" && above
          return (
            <tr key={row.id} className="border-t border-line max-sm:grid">
              <th scope="row" className="py-3 pr-4 text-left font-medium max-sm:pr-0 max-sm:pb-0 max-sm:text-[14px]">
                {row.label}
                {/* The orders column is hidden below sm, so the count joins the name */}
                <span className="font-normal text-ink-muted tabular-nums sm:hidden">, {fmt.int(row.coOrders)} orders</span>
              </th>
              <td className="p-0">
                <div className="relative h-12">
                  <span aria-hidden className="absolute inset-y-0 border-l border-dashed border-line-strong" style={{ left: at(1) }} />
                  {rocket ? (
                    <>
                      {/* Dotted trail from the launch pad (chance) to the rocket */}
                      <span
                        aria-hidden
                        className={cn("absolute top-1/2 -translate-y-1/2 border-t-2 border-dotted opacity-50", move)}
                        style={{ ...delay, left: at(1), width: at(lift - 1), borderColor: tone }}
                      />
                      <span
                        aria-hidden
                        className={cn("absolute top-1/2 -translate-x-full -translate-y-1/2 text-action", move)}
                        style={{ ...delay, left: at(lift) }}
                      >
                        <RocketGlyph height={18} porthole="var(--plot-surface, var(--surface-raised))" />
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        aria-hidden
                        className={cn("absolute top-1/2 h-0.5 -translate-y-1/2", move)}
                        style={{ ...delay, left: at(Math.min(1, lift)), width: at(Math.abs(lift - 1)), background: tone }}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1/2 size-3 -translate-1/2 rounded-full ring-2 ring-(--plot-surface,var(--surface-raised))",
                          move,
                        )}
                        style={{ ...delay, left: at(lift), background: tone }}
                      />
                    </>
                  )}
                  <span
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 font-semibold whitespace-nowrap tabular-nums",
                      above ? "pl-3" : "-translate-x-full pr-3",
                      move,
                      !inView && "opacity-0",
                    )}
                    style={{ ...delay, left: at(lift) }}
                  >
                    {fmt.lift(row.lift)}
                  </span>
                </div>
              </td>
              <td className="hidden py-3 pl-4 text-right text-ink-muted tabular-nums sm:table-cell">{fmt.int(row.coOrders)}</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot aria-hidden>
        <tr className="max-sm:grid">
          <td className="max-sm:hidden" />
          <td className="p-0">
            <div className="relative h-6 border-t border-line text-[12px] text-ink-muted tabular-nums">
              {ticks.map((t) => (
                <span
                  key={t}
                  className={cn("absolute top-1.5 -translate-x-1/2", t % 2 === 1 && t !== 1 && "max-sm:hidden")}
                  style={{ left: at(t) }}
                >
                  {t}×
                </span>
              ))}
            </div>
          </td>
          <td className="hidden sm:table-cell" />
        </tr>
      </tfoot>
    </table>
  )
}
