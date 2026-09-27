import { useState } from "react"
import { Tabs } from "radix-ui"
import { WeekTrend } from "@/components/charts/WeekTrend"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { Change } from "@/components/charts/Change"
import { days, metrics, period, previousDays, trend, type MetricId } from "./content"

const LATEST = days.length - 1

/**
 * The page's one bold element: the week as a constellation on the navy sky.
 * The metric tabs double as the KPIs; the readout shows the selected (or hovered) day against the
 * same weekday a week earlier.
 */
export function SalesSky() {
  const [metricId, setMetricId] = useState<MetricId>("revenue")
  const [selected, setSelected] = useState(LATEST)
  const [preview, setPreview] = useState<number | null>(null)
  const narrow = useMediaQuery("(max-width: 639px)")
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0]
  const day = preview ?? selected

  return (
    <section aria-labelledby="trend-title" data-theme="night" className="rounded-2xl bg-sky text-ink">
      <Tabs.Root value={metricId} onValueChange={(v) => setMetricId(v as MetricId)}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 pt-5 md:px-7 md:pt-6">
          <h2 id="trend-title" className="text-[17px] leading-6 font-semibold">
            {trend.title}
          </h2>
          <Legend />
        </div>

        {/* Each tab is a KPI: this week's figure and its change. The selected one gets the peach rule. */}
        <Tabs.List aria-label={trend.tabsLabel} className="mt-4 grid grid-cols-3 border-b border-line px-2 md:px-4">
          {metrics.map((m) => (
            <Tabs.Trigger
              key={m.id}
              value={m.id}
              className="group relative flex cursor-pointer flex-col items-start gap-0.5 rounded-t-md px-3 pt-2 pb-4 text-left focus-visible:outline-offset-[-2px] md:px-3"
            >
              <span className="text-[13px] leading-5 font-medium text-ink-muted group-data-[state=active]:text-ink max-sm:min-h-10">{m.label}</span>
              <span className="text-[clamp(1.25rem,0.9rem+1.6vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-ink-muted transition-colors group-hover:text-ink group-data-[state=active]:text-ink">
                {m.format(m.total)}
              </span>
              <span className="text-[13px] leading-5">
                <Change from={m.previousTotal} to={m.total} />
                <span className="ml-1.5 text-ink-faint max-md:sr-only">{trend.vsPrevious}</span>
              </span>
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-star opacity-0 transition-opacity group-data-[state=active]:opacity-100"
              />
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value={metric.id} className="grid gap-4 px-3 pt-4 pb-5 outline-none md:px-5 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-6 lg:pr-7">
          <WeekTrend
            key={metric.id}
            days={days}
            current={metric.current}
            previous={metric.previous}
            selected={selected}
            onSelect={setSelected}
            preview={preview}
            onPreview={setPreview}
            formatTick={metric.formatTick}
            label={trend.daysLabel}
            width={narrow ? 360 : 640}
            height={narrow ? 230 : 250}
            className="max-lg:order-2"
          />

          {/* Readout. Fixed height, so hovering across days never moves the page. */}
          <div className="flex min-h-[7.5rem] flex-col justify-center px-2 max-lg:order-1 lg:border-l lg:border-line lg:pl-6">
            <p className="text-[13px] leading-5 text-ink-muted">{days[day].long}</p>
            <p className="mt-1 text-[32px] leading-[1.1] font-semibold tracking-[-0.03em]">{metric.format(metric.current[day])}</p>
            <p className="mt-1.5 text-[13px] leading-5">
              <Change from={metric.previous[day]} to={metric.current[day]} />
              <span className="ml-1.5 text-ink-muted">{trend.vsDay(previousDays[day])}</span>
            </p>
            <p className="text-[13px] leading-5 text-ink-faint tabular-nums">
              {previousDays[day]}: {metric.format(metric.previous[day])}
            </p>
          </div>

          <table className="sr-only">
            <caption>{trend.tableCaption(metric.label)}</caption>
            <thead>
              <tr>
                <th scope="col">{trend.dayColumn}</th>
                <th scope="col">{trend.thisWeek}</th>
                <th scope="col">{trend.lastWeek}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d.id}>
                  <th scope="row">{d.long}</th>
                  <td>{metric.format(metric.current[i])}</td>
                  <td>{metric.format(metric.previous[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Content>
      </Tabs.Root>
    </section>
  )
}

/** Line keys matching the chart's two series. */
function Legend() {
  return (
    <ul aria-hidden className="m-0 flex list-none gap-4 p-0 text-[13px] leading-5 text-ink-muted tabular-nums">
      <li className="flex items-center gap-2">
        <span className="h-0.5 w-4 rounded-full bg-edge-strong" />
        {period.current}
      </li>
      <li className="flex items-center gap-2">
        <span className="h-0.5 w-4 rounded-full bg-comm-rest" />
        {period.previous}
      </li>
    </ul>
  )
}
