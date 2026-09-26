import { useEffect, useState, type PointerEvent } from "react"
import { Button } from "@/components/ui/button"
import { Section } from "@/components/layout/Section"
import { CountUp } from "@/components/motion/CountUp"
import { GenMark } from "@/components/brand/GenMark"
import { ConstellationGraph, GRAPH_INTRO_MS, SkyDust, communityColor, pairsOf } from "@/components/graph"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { fmt } from "@/lib/format"
import { prefersReducedMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { communities, defaultSelectedId, edges, hero, nodes, requestAccess, tour } from "./content"
import { largeButton } from "./styles"

const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id

/** Headline on the left; on the right, the sample network, which reads out the selected product's pairs. */
export function Hero() {
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId)
  const [touring, setTouring] = useState(() => !prefersReducedMotion())
  const [firstReadout, setFirstReadout] = useState(true)
  const compact = useMediaQuery("(max-width: 639px)")

  // The tour steps through tour.stops once, then ends. Any interaction with the graph ends it early.
  useEffect(() => {
    if (!touring) return
    let step = 0
    let timer = setTimeout(function next() {
      setSelectedId(tour.stops[step])
      setFirstReadout(false)
      step += 1
      if (step < tour.stops.length) timer = setTimeout(next, tour.everyMs)
      else setTouring(false)
    }, tour.firstStepMs)
    return () => clearTimeout(timer)
  }, [touring])

  const select = (id: string | null) => {
    setTouring(false)
    setFirstReadout(false)
    setSelectedId(id)
  }

  // Pointer position (−1…1) as CSS variables; SkyDust reads them. Set directly to avoid re-rendering the graph.
  const moveSky = (e: PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return
    const box = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty("--px", (((e.clientX - box.left) / box.width) * 2 - 1).toFixed(3))
    e.currentTarget.style.setProperty("--py", (((e.clientY - box.top) / box.height) * 2 - 1).toFixed(3))
  }
  const resetSky = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--px", "0")
    e.currentTarget.style.setProperty("--py", "0")
  }

  return (
    <Section id="network" className="recede-on-scroll pt-8 pb-16 md:pt-12 md:pb-24">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div>
          <h1 className="text-[clamp(2.75rem,1.9rem+3.4vw,4.25rem)] leading-[1.02] font-bold tracking-[-0.04em] text-balance">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-[34em] text-[17px] leading-[1.55] text-pretty text-ink-muted sm:text-[19px]">{hero.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className={largeButton}>
              <a href={requestAccess.href}>{requestAccess.label}</a>
            </Button>
            <Button asChild size="lg" variant="secondary" className={largeButton}>
              <a href={hero.secondary.href}>{hero.secondary.label}</a>
            </Button>
          </div>
        </div>

        {/* The sky: a window into depth, with background stars that drift against the pointer */}
        <figure
          data-theme="night"
          className="relative overflow-hidden rounded-2xl bg-sky text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
          style={{ backgroundImage: "radial-gradient(90% 75% at 38% 28%, #243152 0%, transparent 70%)" }}
          onPointerEnter={() => setTouring(false)}
          onFocus={() => setTouring(false)}
          onPointerMove={moveSky}
          onPointerLeave={resetSky}
        >
          <SkyDust />
          <ConstellationGraph
            nodes={nodes}
            edges={edges}
            // On phones a squarer, smaller canvas, so stars and labels render larger
            width={compact ? 400 : 640}
            height={compact ? 400 : 420}
            selectedId={selectedId}
            onSelect={select}
            label={hero.graphLabel}
            className="relative bg-transparent px-2 pt-2"
          />
          <figcaption className="relative flex flex-col gap-5 px-5 pt-1 pb-5 md:px-7 md:pb-6">
            {/* Quiet while the tour runs, so screen readers aren't interrupted every few seconds */}
            {/* The live readout sits on top of invisible copies of every product's readout,
                so the caption is always as tall as the longest one and the page never jumps. */}
            <div className="grid">
              {[null, ...nodes.map((n) => n.id)].map((id) => (
                <div key={id ?? "none"} aria-hidden className="invisible [grid-area:1/1]">
                  <PairReadout selectedId={id} ghost />
                </div>
              ))}
              <div aria-live={touring ? "off" : "polite"} className="[grid-area:1/1]">
                <PairReadout key={selectedId ?? "none"} selectedId={selectedId} countDelay={firstReadout ? GRAPH_INTRO_MS : 150} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[13px] text-ink-muted">
              <ul aria-label="Communities" className="flex flex-wrap gap-x-4 gap-y-1">
                {communities.map((c) => (
                  <li key={c.community} className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: communityColor(c.community) }} />
                    {c.label}
                  </li>
                ))}
              </ul>
              {touring ? (
                <button type="button" onClick={() => setTouring(false)} className="rounded-sm underline underline-offset-2 hover:text-ink">
                  {hero.stopTour}
                </button>
              ) : (
                <span>{hero.sampleNote}</span>
              )}
            </div>
          </figcaption>
        </figure>
      </div>
    </Section>
  )
}

interface PairReadoutProps {
  selectedId: string | null
  countDelay?: number
  /** Layout-only copy for reserving space: no animation, final figures. */
  ghost?: boolean
}

/**
 * One sentence about the selected product's strongest pair, then its other pairs and an AI suggestion.
 * Remounted per product, so it slides in and the lift counts up from chance (1.00×).
 */
function PairReadout({ selectedId, countDelay = 0, ghost = false }: PairReadoutProps) {
  const pairs = selectedId ? pairsOf(edges, selectedId) : []
  const [top, ...rest] = pairs

  if (!selectedId || !top) {
    return <p className="text-[17px] leading-[1.5] text-ink-muted">{hero.emptyReadout}</p>
  }

  return (
    <div className={cn(!ghost && "animate-in duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none")}>
      <p className="text-[17px] leading-[1.5]">
        <span className="font-semibold">{labelOf(selectedId)}</span> and{" "}
        <span className="font-semibold">{labelOf(top.partner)}</span> are bought together{" "}
        <span className="font-semibold">
          {ghost ? fmt.lift(top.lift) : <CountUp value={top.lift} from={1} delay={countDelay} format={fmt.lift} />}
        </span>{" "}
        as often as chance predicts
        {top.coOrders != null && (
          <>
            , in <span className="font-semibold tabular-nums">{fmt.int(top.coOrders)}</span> orders
          </>
        )}
        .
      </p>
      {rest.length > 0 && (
        <p className="mt-1 text-[15px] text-ink-muted">
          Also bought with{" "}
          {rest.map((p, i) => (
            <span key={p.partner}>
              {i > 0 && (i === rest.length - 1 ? " and " : ", ")}
              {labelOf(p.partner)} <span className="tabular-nums">{fmt.lift(p.lift)}</span>
            </span>
          ))}
          .
        </p>
      )}
      <p
        className={cn(
          "mt-3 flex gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-[15px] leading-[1.5]",
          !ghost && "animate-in fade-in [animation-delay:350ms] [animation-fill-mode:backwards] motion-reduce:animate-none",
        )}
      >
        <GenMark size={16} className="mt-[3px]" />
        <span>
          <span className="font-semibold">{hero.suggestionLabel}:</span>{" "}
          {hero.suggestions[selectedId] ?? `Promote ${labelOf(selectedId)} with ${labelOf(top.partner)}, its strongest pair.`}
        </span>
      </p>
    </div>
  )
}
