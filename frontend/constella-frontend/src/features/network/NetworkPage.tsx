import { useMemo, useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { PickList } from "@/components/controls/PickList"
import { SegmentedControl } from "@/components/controls/SegmentedControl"
import { SelectField } from "@/components/controls/SelectField"
import { CommunityChip, NetworkGraph, communityColor, type EdgeTone, type GraphSelection, type NodePaint } from "@/components/graph"
import { Button } from "@/components/ui/button"
import {
  communities,
  communityLabel,
  featuredProduct,
  periodById,
  periods,
  productById,
  products,
  segmentById,
  segments,
  storeInfo,
  type PeriodId,
  type SegmentId,
} from "@/data/store"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import { CommunityTable } from "./CommunityTable"
import { empty, filters, graph as graphCopy, legend, page, views, type Scope, type View } from "./content"
import { NodeCard, PairCard } from "./DetailCards"
import { readNetwork } from "./insights"
import { InsightsPanel } from "./InsightsPanel"
import { buildModel, cutOffBy, findEdge, productLayout, storeLayout } from "./model"

const MAX_FOCUS = 3
const VIEWS: View[] = ["pairs", "bridges", "communities"]

/**
 * The network page. The sky canvas is the page's one bold element; filters sit above it and scope
 * everything on the page (canvas, cards, insights and the community table).
 * `params` may open a product (`?product=coffee`) or a view (`?view=communities`).
 */
export function NetworkPage({ params }: { params: URLSearchParams }) {
  const initialProduct = params.get("product")
  const initialView = params.get("view") as View | null
  const [scope, setScope] = useState<Scope>(initialProduct && productById[initialProduct] ? "products" : "store")
  const [view, setView] = useState<View>(initialView && VIEWS.includes(initialView) ? initialView : "pairs")
  const [periodId, setPeriodId] = useState<PeriodId>("90d")
  const [segmentId, setSegmentId] = useState<SegmentId>("all")
  const [chosen, setChosen] = useState<string[]>(initialProduct && productById[initialProduct] ? [initialProduct] : [featuredProduct])
  const [selection, setSelection] = useState<GraphSelection>(null)
  const [highlight, setHighlight] = useState<number | null>(null)
  const narrow = useMediaQuery("(max-width: 767px)")

  const period = periodById(periodId)
  const segment = segmentById(segmentId)
  const model = useMemo(() => buildModel(periodId, segmentId, scope, chosen), [periodId, segmentId, scope, chosen])
  const positions = useMemo(() => (scope === "store" ? storeLayout(narrow) : productLayout(model)), [scope, narrow, model])
  const read = useMemo(() => readNetwork(model, { scope, view, period, segment }), [model, scope, view, period, segment])

  // A selection that the new filters removed simply goes away.
  const selNode = selection?.kind === "node" ? model.byId[selection.id] : undefined
  const selEdge = selection?.kind === "edge" ? findEdge(model.edges, selection.source, selection.target) : undefined
  const active: GraphSelection = selNode || selEdge ? selection : null
  const cutOff = useMemo(
    () => (selNode && view === "bridges" && model.bridges.has(selNode.id) ? cutOffBy(model, selNode.id) : []),
    [selNode, view, model],
  )
  const cutSet = new Set(cutOff)

  const paint = (n: { id: string; community?: number | null }): NodePaint => {
    const chosenHere = scope === "products" && model.focus.includes(n.id)
    if (view === "communities") {
      const dim = highlight != null && n.community !== highlight
      return { tone: dim ? "dim" : n.community ?? "rest", ring: chosenHere, label: chosenHere }
    }
    if (view === "bridges") {
      if (cutOff.length) return { tone: cutSet.has(n.id) ? "ink" : "rest", ring: chosenHere, label: chosenHere || cutSet.has(n.id) }
      const isBridge = model.bridges.has(n.id)
      return { tone: isBridge ? "ink" : "rest", ring: chosenHere, label: isBridge || chosenHere }
    }
    return { tone: "ink", ring: chosenHere, label: chosenHere }
  }
  const edgeTone = (e: { source: string; target: string }): EdgeTone => {
    if (view === "bridges") {
      const edge = findEdge(model.edges, e.source, e.target)
      if (cutOff.length && selNode) return (e.source === selNode.id && cutSet.has(e.target)) || (e.target === selNode.id && cutSet.has(e.source)) ? "strong" : "normal"
      return edge && model.bridgeEdges.has(edge) ? "strong" : "faint"
    }
    if (scope === "products" && !model.focus.includes(e.source) && !model.focus.includes(e.target)) return "side"
    return "normal"
  }

  // Cards float on the side away from what they describe.
  const anchorX = (() => {
    if (selNode) return positions[selNode.id]?.[0] ?? 0
    if (selEdge) return ((positions[selEdge.source]?.[0] ?? 0) + (positions[selEdge.target]?.[0] ?? 0)) / 2
    return 0
  })()
  const cardSide = anchorX > 0.55 ? "md:left-3" : "md:right-3"

  const toggleChosen = (id: string) => {
    setSelection(null)
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_FOCUS ? c : [...c, id]))
  }
  const explore = (id: string) => {
    setScope("products")
    setChosen([id])
    setSelection({ kind: "node", id })
  }

  const graphKey = `${scope}/${periodId}/${segmentId}/${scope === "products" ? chosen.join(",") : ""}`
  const height = narrow ? 460 : 640
  const emptyFocus = scope === "products" && (model.focus.length === 0 || model.edges.length === 0)

  return (
    <div className="mx-auto max-w-[88rem] px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <header>
        <h1 className="text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em]">{page.title}</h1>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-6 text-ink-muted md:text-base">{page.summary(storeInfo.name, period.range)}</p>
      </header>

      {/* One filter row scopes everything below it */}
      <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1.5 max-sm:w-full">
          <span className="text-[12px] leading-4 font-medium text-ink-muted">
            {filters.scopeLabel}
          </span>
          <SegmentedControl
            label={filters.scopeLabel}
            options={filters.scopes}
            value={scope}
            stretch={narrow}
            onValueChange={(v) => {
              setScope(v)
              setSelection(null)
            }}
          />
        </div>
        <SelectField
          label={filters.period}
          className="w-40 max-sm:flex-1"
          value={periodId}
          onValueChange={setPeriodId}
          options={periods.map((p) => ({ value: p.id, label: filters.periodOption(p.label), description: p.range }))}
        />
        <SelectField
          label={filters.customers}
          className="w-52 max-sm:flex-1"
          value={segmentId}
          onValueChange={setSegmentId}
          options={segments.map((s) => ({ value: s.id, label: s.label, description: s.description }))}
        />
      </div>

      {/* Reserved so switching to chosen products doesn't push the canvas down */}
      <div className={cn("mt-3 flex min-h-9 flex-wrap items-center gap-2", scope !== "products" && "invisible")} aria-hidden={scope !== "products"}>
        <span className="text-[12px] font-medium text-ink-muted">{filters.products}</span>
        {chosen.map((id) => (
          <span key={id} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-star-soft pr-1 pl-3 text-[13px] font-semibold text-star-ink">
            <span aria-hidden className="size-2 rounded-full" style={{ background: communityColor(productById[id].community) }} />
            {productById[id].label}
            <button
              type="button"
              tabIndex={scope === "products" ? 0 : -1}
              onClick={() => toggleChosen(id)}
              aria-label={filters.removeProduct(productById[id].label)}
              className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--star-soft)_80%,var(--star-ink))]"
            >
              <XIcon className="size-3.5" />
            </button>
          </span>
        ))}
        <PickList
          items={products.map((p) => ({
            id: p.id,
            label: p.label,
            group: communityLabel(p.community),
            color: communityColor(p.community),
            meta: p.category,
          }))}
          selected={chosen}
          onToggle={toggleChosen}
          max={MAX_FOCUS}
          labels={{ search: filters.pickSearch, empty: filters.pickEmpty, limit: filters.pickLimit }}
          trigger={
            <Button variant="secondary" tabIndex={scope === "products" ? 0 : -1} className="h-8 rounded-full px-3 text-[13px]">
              <PlusIcon />
              {filters.addProduct}
            </Button>
          }
        />
      </div>

      <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6">
        <section aria-label={page.title} className="min-w-0">
          <div className="relative overflow-hidden rounded-2xl bg-sky">
            {emptyFocus ? (
              <div data-theme="night" className="flex flex-col items-center justify-center gap-3 px-6 text-center text-ink" style={{ height }}>
                <p className="text-[21px] leading-7 font-semibold tracking-[-0.018em]">{empty.title}</p>
                <p className="max-w-[44ch] text-[15px] leading-6 text-ink-muted">
                  {empty.body(chosen.map((id) => productById[id].label).join(" and ") || "—", segment.label, period.range)}
                </p>
                {segmentId !== "all" && (
                  <Button onClick={() => setSegmentId("all")} className="mt-2 h-9 rounded-xl px-4">
                    {empty.action}
                  </Button>
                )}
              </div>
            ) : (
              <NetworkGraph
                key={graphKey}
                nodes={model.nodes}
                edges={model.edges}
                positions={positions}
                paint={paint}
                edgeTone={edgeTone}
                groupOf={view === "communities" ? (n) => (highlight == null || n.community === highlight ? n.community : null) : undefined}
                selection={active}
                onSelect={setSelection}
                describeEdge={(e) => graphCopy.edge(e.coOrders ?? 0, e.lift)}
                label={graphCopy.label(model.nodes.length, model.edges.length)}
                height={height}
                insetTop={64}
              >
                <div className="absolute top-3 left-3 z-10" data-theme="night">
                  <SegmentedControl label={views.label} options={views.options} value={view} onValueChange={(v) => { setView(v); setHighlight(null) }} className="bg-surface-raised/90 backdrop-blur" />
                </div>
                {selNode && (
                  <NodeCard
                    key={selNode.id}
                    node={selNode}
                    network={model.network}
                    cutOff={cutOff}
                    canShowPair={(a, b) => findEdge(model.edges, a, b) != null}
                    onShowPair={(a, b) => setSelection({ kind: "edge", source: a, target: b })}
                    onExplore={scope === "products" && model.focus.length === 1 && model.focus[0] === selNode.id ? undefined : () => explore(selNode.id)}
                    onClose={() => setSelection(null)}
                    className={cardSide}
                  />
                )}
                {selEdge && (
                  <PairCard
                    key={`${selEdge.source}-${selEdge.target}`}
                    edge={selEdge}
                    isBridge={model.bridgeEdges.has(selEdge)}
                    sideOf={scope === "products" && model.focus.length === 1 && !model.focus.includes(selEdge.source) && !model.focus.includes(selEdge.target) ? model.focus[0] : undefined}
                    onClose={() => setSelection(null)}
                    className={cardSide}
                  />
                )}
              </NetworkGraph>
            )}
          </div>

          <Legend view={view} scope={scope} hidden={scope === "store" ? model.network.hidden : 0} highlight={highlight} onHighlight={setHighlight} present={model.nodes} />
        </section>

        <InsightsPanel insights={read} readKey={`${graphKey}/${view}`} asOf={storeInfo.asOf} className="xl:self-start" />
      </div>

      {view === "communities" && !emptyFocus && (
        <CommunityTable model={model} highlight={highlight} onHighlight={setHighlight} className="mt-6" />
      )}
    </div>
  )
}

function Legend({
  view,
  scope,
  hidden,
  highlight,
  onHighlight,
  present,
}: {
  view: View
  scope: Scope
  hidden: number
  highlight: number | null
  onHighlight: (c: number | null) => void
  present: { community?: number | null }[]
}) {
  const inView = communities.filter((c) => present.some((n) => n.community === c.community))
  return (
    <div className="mt-3 flex flex-col gap-3 px-1">
      {view === "communities" && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={views.options[2].label}>
          {inView.map((c) => (
            <li key={c.community}>
              <CommunityChip
                community={c.community}
                label={c.label}
                count={String(present.filter((n) => n.community === c.community).length)}
                selected={highlight === c.community}
                onClick={() => onHighlight(highlight === c.community ? null : c.community)}
              />
            </li>
          ))}
        </ul>
      )}
      <ul aria-hidden className="m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-2 p-0 text-[13px] text-ink-muted">
        <li className="inline-flex items-center gap-1.5">
          <svg width={36} height={16}>
            <circle cx={5} cy={8} r={3} fill="var(--ink-faint)" />
            <circle cx={24} cy={8} r={7} fill="var(--ink-faint)" />
          </svg>
          {legend.size}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <svg width={36} height={16}>
            <line x1={2} y1={4} x2={34} y2={4} stroke="var(--ink-muted)" strokeWidth={0.75} />
            <line x1={2} y1={12} x2={34} y2={12} stroke="var(--ink-muted)" strokeWidth={3.5} strokeLinecap="round" />
          </svg>
          {legend.width}
        </li>
        {view === "bridges" && (
          <li className="inline-flex items-center gap-1.5">
            {/* Bridges are starlight on the sky, so the key shows them there */}
            <span data-theme="night" className="inline-flex size-4 items-center justify-center rounded-full bg-sky">
              <span className="size-2 rounded-full bg-ink" />
            </span>
            {legend.bridge}
          </li>
        )}
        {scope === "products" && (
          <>
            <li className="inline-flex items-center gap-1.5">
              <svg width={18} height={18}>
                <circle cx={9} cy={9} r={4} fill="var(--ink-faint)" />
                <circle cx={9} cy={9} r={7.5} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} />
              </svg>
              {legend.chosen}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <svg width={36} height={16}>
                <line x1={2} y1={8} x2={34} y2={8} stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="3 3" />
              </svg>
              {legend.side}
            </li>
          </>
        )}
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-star" />
          {legend.selected}
        </li>
      </ul>
      <p className="max-w-[80ch] text-[13px] leading-5 text-ink-muted">
        {views.about[view]}
        {hidden > 0 && ` ${legend.hidden(hidden)}`}
      </p>
    </div>
  )
}
