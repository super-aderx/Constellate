import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
import { LiftMeter } from "@/components/charts/LiftMeter"
import { CommunityChip, communityColor } from "@/components/graph"
import { Button } from "@/components/ui/button"
import { communityLabel, productById, type NetEdge, type NetNode, type Network } from "@/data/store"
import { fmt } from "@/lib/format"
import { appHref } from "@/lib/route"
import { cn } from "@/lib/utils"
import { node as copy, pair as pairCopy } from "./content"
import { pairsFor } from "./model"

/** A floating panel over the canvas (shadow-pop). On phones it sits under the canvas instead. */
function Card({ label, onClose, children, className }: { label: string; onClose: () => void; children: ReactNode; className?: string }) {
  return (
    <section
      aria-label={label}
      className={cn(
        "relative flex flex-col gap-4 bg-surface-raised p-4 text-ink max-md:rounded-b-2xl md:absolute md:top-16 md:max-h-[calc(100%-5rem)] md:w-[19.5rem] md:overflow-y-auto md:rounded-xl md:shadow-pop",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none",
        className,
      )}
    >
      {children}
      <button
        type="button"
        onClick={onClose}
        aria-label={copy.close}
        className="absolute top-3 right-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-field hover:text-ink"
      >
        <XIcon className="size-4" />
      </button>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[12px] leading-4 font-medium text-ink-muted">{label}</dt>
      <dd className="text-[17px] leading-[22px] font-semibold tracking-[-0.01em] tabular-nums">{value}</dd>
    </div>
  )
}

interface NodeCardProps {
  node: NetNode
  network: Network
  /** Products that would be cut off without it; empty when it isn't a bridge. */
  cutOff: string[]
  /** Is this pair drawn right now (so it can be selected on the canvas)? */
  canShowPair: (a: string, b: string) => boolean
  onShowPair: (a: string, b: string) => void
  /** Offered when the product isn't already the only one being explored. */
  onExplore?: () => void
  onClose: () => void
  className?: string
}

export function NodeCard({ node, network, cutOff, canShowPair, onShowPair, onExplore, onClose, className }: NodeCardProps) {
  const pairs = pairsFor(network, node.id)
  const byCategory = new Map<string, number>()
  for (const p of pairs) {
    const cat = productById[p.partner].category
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + p.edge.coOrders)
  }
  const total = pairs.reduce((s, p) => s + p.edge.coOrders, 0) || 1
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])

  return (
    <Card label={node.label} onClose={onClose} className={className}>
      <header className="flex flex-col items-start gap-2 pr-8">
        <div>
          <h3 className="text-[17px] leading-[22px] font-semibold tracking-[-0.01em]">{node.label}</h3>
          <p className="text-[13px] text-ink-muted">{node.category}</p>
        </div>
        <CommunityChip community={node.community} label={node.community == null ? copy.noCommunity : communityLabel(node.community)} />
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label={copy.orders} value={fmt.int(node.orders)} />
        <Stat label={copy.revenue} value={fmt.money(node.revenue)} />
        <Stat label={copy.pairs} value={fmt.int(node.degree)} />
        <Stat label={copy.inPairs} value={fmt.int(node.strength)} />
      </dl>

      {cutOff.length > 0 && (
        <div className="rounded-lg bg-field p-3">
          <p className="text-[13px] font-semibold">{copy.bridgeTitle}</p>
          <p className="mt-1 text-[13px] leading-[19px] text-ink-muted">
            {copy.bridgeBody(node.label, cutOff.length, cutOff.map((id) => productById[id].label).join(", "))}
          </p>
        </div>
      )}

      <div>
        <h4 className="text-[13px] font-semibold">{copy.boughtWith}</h4>
        <ul className="m-0 mt-1 list-none p-0 [&>li+li]:border-t [&>li+li]:border-line">
          {pairs.slice(0, 5).map(({ edge, partner }) => {
            const p = productById[partner]
            const shown = canShowPair(node.id, partner)
            const body = (
              <>
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: communityColor(p.community) }} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{p.label}</span>
                <span className="text-[12px] text-ink-muted tabular-nums">{fmt.int(edge.coOrders)}</span>
                <LiftMeter lift={edge.lift} className="[&>span:first-child]:w-10" />
              </>
            )
            return (
              <li key={partner}>
                {shown ? (
                  <button
                    type="button"
                    aria-label={copy.pairAction(p.label)}
                    onClick={() => onShowPair(node.id, partner)}
                    className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-field"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 py-2">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <h4 className="text-[13px] font-semibold">{copy.byCategory}</h4>
        <p className="text-[12px] leading-4 text-ink-muted">{copy.byCategoryNote}</p>
        <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
          {categories.map(([cat, orders]) => (
            <li key={cat} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.75rem] items-center gap-2 text-[13px]">
              <span className="truncate">{cat}</span>
              <span aria-hidden className="h-1.5 rounded-[2px] bg-field">
                <span className="block h-full rounded-[2px] bg-ink-muted" style={{ width: `${(orders / total) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">{fmt.pct(orders / total)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {onExplore && (
          <Button onClick={onExplore} className="h-9 rounded-xl px-3.5">
            {copy.explore}
          </Button>
        )}
        <Button asChild variant="secondary" className="h-9 rounded-xl px-3.5">
          <a href={appHref("products", { product: node.id })}>{copy.viewProduct}</a>
        </Button>
      </div>
    </Card>
  )
}

interface PairCardProps {
  edge: NetEdge
  /** The only link between two parts of the network. */
  isBridge: boolean
  /** When exploring products: the chosen one this pair doesn't involve. */
  sideOf?: string
  onClose: () => void
  className?: string
}

export function PairCard({ edge, isBridge, sideOf, onClose, className }: PairCardProps) {
  const a = productById[edge.source]
  const b = productById[edge.target]
  return (
    <Card label={pairCopy.title(a.label, b.label)} onClose={onClose} className={className}>
      <header className="pr-8">
        <h3 className="text-[17px] leading-[22px] font-semibold tracking-[-0.01em]">{pairCopy.title(a.label, b.label)}</h3>
      </header>
      <dl className="grid grid-cols-2 gap-x-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[12px] font-medium text-ink-muted">{pairCopy.together}</dt>
          <dd className="text-[28px] leading-8 font-semibold tracking-[-0.025em]">{fmt.int(edge.coOrders)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[12px] font-medium text-ink-muted">{pairCopy.lift}</dt>
          <dd className="text-[28px] leading-8 font-semibold tracking-[-0.025em]">{fmt.lift(edge.lift)}</dd>
          <dd className="text-[12px] leading-4 text-ink-muted">{pairCopy.liftNote}</dd>
        </div>
      </dl>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] leading-[19px]">
        {[
          [edge.confidenceAB, a.label, b.label],
          [edge.confidenceBA, b.label, a.label],
        ].map(([share, x, y]) => (
          <li key={String(x)} className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-2">
            <span className="font-semibold tabular-nums">{fmt.pct(share as number)}</span>
            <span className="text-ink-muted">{pairCopy.confidence(x as string, y as string)}</span>
          </li>
        ))}
      </ul>
      {(isBridge || sideOf) && (
        <p className="rounded-lg bg-field p-3 text-[13px] leading-[19px]">{isBridge ? pairCopy.bridge : pairCopy.side(productById[sideOf!].label)}</p>
      )}
      <div>
        <Button asChild className="h-9 rounded-xl px-3.5">
          <a href={appHref("ask", { q: pairCopy.draftPrompt(a.label, b.label) })}>{pairCopy.draft}</a>
        </Button>
      </div>
    </Card>
  )
}
