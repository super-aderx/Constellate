import { useState } from "react"
import { HeatMap, type HeatPair } from "@/components/charts/HeatMap"
import { SegmentedControl } from "@/components/controls/SegmentedControl"
import { communityColor } from "@/components/graph"
import { Button } from "@/components/ui/button"
import { productById } from "@/data/store"
import { fmt } from "@/lib/format"
import { appHref } from "@/lib/route"
import { heat as copy } from "./content"
import { heatOrder, nameOf, pairValue } from "./model"

type Metric = "lift" | "orders"

const THRESHOLDS: Record<Metric, number[]> = { lift: [2, 3, 4.5], orders: [100, 250, 500] }

/**
 * Every pair in the store as a heat map: the Products page's bold element. The product picked in the
 * table is cross-haired; a cell's pair is read out above the grid, in a line of fixed height.
 */
export function PairHeatMap({ highlight }: { highlight: string | null }) {
  const [metric, setMetric] = useState<Metric>("lift")
  const [selected, setSelected] = useState<HeatPair | null>(null)
  const [hover, setHover] = useState<HeatPair | null>(null)
  const shown = hover ?? selected
  const pair = shown ? pairValue(shown.a, shown.b) : null

  return (
    <section aria-labelledby="heat-title" className="rounded-xl bg-surface-raised p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[60ch]">
          <h2 id="heat-title" className="text-[21px] leading-7 font-semibold tracking-[-0.018em]">
            {copy.title}
          </h2>
          <p className="mt-1 text-[14px] leading-[21px] text-ink-muted">{copy.body}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] leading-4 font-medium text-ink-muted">{copy.metricLabel}</span>
          <SegmentedControl label={copy.metricLabel} options={copy.metrics} value={metric} onValueChange={setMetric} />
        </div>
      </div>

      <div className="mt-5 flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-surface px-4 py-2.5" aria-live="polite">
        {shown ? (
          <p className="text-[14px] leading-5">
            <span className="font-semibold">{copy.readout(nameOf(shown.a), nameOf(shown.b))}</span>
            <span className="text-ink-muted">: {pair ? copy.readoutFigures(pair.coOrders, pair.lift) : copy.notTogether}</span>
          </p>
        ) : (
          <p className="text-[14px] leading-5 text-ink-muted">{copy.prompt}</p>
        )}
        {selected && !hover && (
          <Button asChild variant="secondary" size="sm" className="h-8 rounded-lg px-3">
            <a href={appHref("network", { product: selected.a })}>{copy.openPair}</a>
          </Button>
        )}
      </div>

      <HeatMap
        className="mt-4"
        items={heatOrder.map((id) => ({ id, label: productById[id].label, color: communityColor(productById[id].community) }))}
        value={(a, b) => {
          const v = pairValue(a, b)
          return v ? (metric === "lift" ? v.lift : v.coOrders) : null
        }}
        thresholds={THRESHOLDS[metric]}
        legend={copy.legend[metric]}
        selected={selected}
        onSelect={setSelected}
        onHover={setHover}
        highlight={highlight}
        describe={(a, b, v) => copy.describe(a.label, b.label, v == null ? null : metric === "lift" ? `${fmt.lift(v)} lift` : `${fmt.int(v)} orders together`)}
        label={copy.label}
      />
    </section>
  )
}
