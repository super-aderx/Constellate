import { Fragment, useEffect, useState, type RefObject } from "react"
import { CheckIcon, FileSpreadsheetIcon } from "lucide-react"
import { GenMark } from "@/components/brand/GenMark"
import { ConstellationGraph } from "@/components/graph"
import { Section } from "@/components/layout/Section"
import { CountUp } from "@/components/motion/CountUp"
import { useInView } from "@/hooks/useInView"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useTimeline } from "@/hooks/useTimeline"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { edges, nodes, workflow, type Actor } from "./content"

const STEP_MS = 2600
const enter = "animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-fill-mode:backwards] motion-reduce:animate-none"

/**
 * The user's workflow as linked blocks. A packet travels along each link and the next block
 * lifts out and plays its preview. On wide screens the steps play in turn once the row is in view;
 * on narrower screens, where the blocks stack, each step plays as it's scrolled to.
 * Any block can be opened by clicking it.
 */
export function Workflow() {
  const [ref, inView] = useInView<HTMLOListElement>(0.3)
  const [manual, setManual] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const stacked = useMediaQuery("(max-width: 1023px)")
  const scrolledTo = useScrolledTo(ref, stacked)
  const { steps } = workflow
  const elapsed = useTimeline(steps.length * STEP_MS, !stacked && inView && manual === null, `run-${run}`)
  const played = stacked ? scrolledTo : inView ? Math.min(steps.length - 1, Math.floor(elapsed / STEP_MS)) : -1
  const active = manual ?? played
  // A block's preview mounts when it's reached, so its animation plays as it becomes active.
  const reached = (i: number) => i <= active
  const finished = !stacked && (manual !== null || active === steps.length - 1)

  return (
    <Section id="workflow" className="pt-20 md:pt-28">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-[clamp(2rem,1.6rem+1.6vw,2.625rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            {workflow.title}
          </h2>
          <p className="mt-4 text-pretty text-ink-muted">{workflow.body}</p>
        </div>
        {/* Always takes its space, so appearing at the end doesn't move anything */}
        <button
          type="button"
          tabIndex={finished ? 0 : -1}
          aria-hidden={!finished}
          onClick={() => {
            setManual(null)
            setRun((r) => r + 1)
          }}
          className={cn("rounded-sm text-[14px] text-ink-muted underline underline-offset-2 hover:text-ink", !finished && "invisible")}
        >
          {workflow.replay}
        </button>
      </div>

      <ol
        ref={ref}
        className="mt-10 grid grid-cols-1 lg:grid-cols-[repeat(4,minmax(0,1fr)_2.25rem)_minmax(0,1fr)]"
      >
        {steps.map((step, i) => (
          <Fragment key={step.id}>
            <li data-step={i}>
              <button
                type="button"
                aria-current={i === active ? "step" : undefined}
                onClick={() => setManual(i)}
                className={cn(
                  "flex h-full w-full flex-col rounded-2xl p-4 text-left transition-[background-color,box-shadow,translate,opacity] duration-500",
                  i === active ? "-translate-y-1 bg-surface-raised shadow-pop" : "bg-surface hover:bg-field/60",
                  !reached(i) && "opacity-60",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-500",
                      i < active ? "bg-action text-on-action" : i === active ? "bg-star text-ink" : "bg-field text-ink-muted",
                    )}
                  >
                    {i < active ? <CheckIcon aria-hidden className="size-3.5" /> : i + 1}
                  </span>
                  <ActorTag actor={step.actor} />
                </span>
                <span className="mt-3 block h-32 overflow-hidden rounded-xl">
                  {reached(i) ? <Preview id={step.id} /> : <span className="block size-full rounded-xl bg-field/50" />}
                </span>
                <span className="mt-4 block text-[17px] leading-[1.3] font-semibold tracking-[-0.01em]">{step.title}</span>
                <span className="mt-1 block text-[14px] leading-[1.5] text-ink-muted">{step.body}</span>
              </button>
            </li>
            {i < steps.length - 1 && <Link done={i < active} arriving={i === active - 1} />}
          </Fragment>
        ))}
      </ol>
    </Section>
  )
}

/**
 * The furthest step (`[data-step]` inside the list) that has scrolled into the upper part of the
 * screen, or -1. Only tracks while `enabled`.
 */
function useScrolledTo(list: RefObject<HTMLElement | null>, enabled: boolean) {
  const [furthest, setFurthest] = useState(-1)

  useEffect(() => {
    const el = list.current
    if (!enabled || !el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const step = Number((entry.target as HTMLElement).dataset.step)
          setFurthest((f) => Math.max(f, step))
        }
      },
      // A step counts once most of it is visible above the bottom third of the screen
      { rootMargin: "0px 0px -30% 0px", threshold: 0.6 },
    )
    el.querySelectorAll("[data-step]").forEach((step) => observer.observe(step))
    return () => observer.disconnect()
  }, [list, enabled])

  return furthest
}

function ActorTag({ actor }: { actor: Actor }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted">
      {actor === "ai" && <GenMark size={12} />}
      {workflow.actors[actor]}
    </span>
  )
}

/** The connector between two blocks: vertical on small screens, horizontal on wide ones. */
function Link({ done, arriving }: { done: boolean; arriving: boolean }) {
  return (
    <li aria-hidden className="flex h-8 items-center justify-center lg:h-auto">
      <span className="relative block h-full w-0.5 rounded-full bg-line lg:h-0.5 lg:w-full">
        <span
          className={cn(
            "absolute inset-0 origin-top rounded-full bg-action transition-transform duration-500 lg:origin-left",
            done ? "scale-100" : "scale-y-0 lg:scale-x-0 lg:scale-y-100",
          )}
        />
        {arriving && (
          <span className="absolute top-0 left-1/2 size-2.5 -translate-1/2 animate-packet-y rounded-full bg-star shadow-[0_0_0_4px_var(--star-soft)] motion-reduce:hidden lg:top-1/2 lg:left-0 lg:animate-packet-x" />
        )}
      </span>
    </li>
  )
}

/** A small live picture of each step. Mounted when the step is reached, so it animates in. */
function Preview({ id }: { id: string }) {
  const p = workflow.preview
  const panel = "flex size-full flex-col justify-center gap-1.5 rounded-xl bg-field/60 p-3"

  if (id === "connect") {
    return (
      <span className={panel}>
        <span className={cn("flex items-center gap-2 rounded-lg bg-surface-raised px-2.5 py-2 text-[13px] font-medium", enter)}>
          <FileSpreadsheetIcon aria-hidden className="size-4 text-comm-2" />
          {p.file}
        </span>
        <span className="px-1 text-[13px] text-ink-muted">
          <span className="font-semibold text-ink">
            <CountUp value={p.orders} delay={300} duration={1400} format={fmt.int} />
          </span>{" "}
          {p.ordersLabel}
        </span>
      </span>
    )
  }

  if (id === "map") {
    return (
      <ConstellationGraph
        nodes={nodes}
        edges={edges}
        selectedId={null}
        interactive={false}
        labels={false}
        label="The product network, drawing itself"
        // Fit the whole network inside the box at any block width
        className="size-full rounded-xl [&_svg]:h-full"
      />
    )
  }

  if (id === "goal") {
    return (
      <span className={cn(panel, "justify-end")}>
        <span className={cn("flex items-start gap-2 rounded-xl rounded-bl-sm bg-surface-raised px-3 py-2 text-[13px] leading-snug", enter)}>
          <GenMark size={14} className="mt-0.5" />
          {p.goal}
        </span>
      </span>
    )
  }

  if (id === "draft") {
    const step = (i: number) => ({ className: cn("block min-w-0", enter), style: { animationDelay: `${i * 280}ms` } })
    return (
      <span className={cn(panel, "gap-2")}>
        <span {...step(0)}>
          <span className="flex items-center gap-1.5 text-[15px] leading-tight font-semibold">
            <GenMark size={14} />
            <span className="truncate">{p.campaign}</span>
          </span>
        </span>
        <span {...step(1)}>
          <span className="inline-block max-w-full rounded bg-action px-1.5 py-0.5 text-[11px] font-semibold text-on-action">
            {p.offer}
          </span>
        </span>
        <span {...step(2)}>
          <span className="block text-[13px] leading-snug font-medium">“{p.slogan}”</span>
        </span>
      </span>
    )
  }

  // launch: this month's lift for the pair, and next month's still to come
  const row = "flex items-baseline justify-between gap-2"
  return (
    <span className={cn(panel, "gap-1 text-[12px]")}>
      <span className="truncate font-medium">{p.pair}</span>
      <span className={cn(row, "mt-1")}>
        <span className="text-ink-muted">{p.before}</span>
        <span className="font-semibold tabular-nums">{fmt.lift(p.beforeLift)}</span>
      </span>
      <span className="block h-1.5 rounded-full bg-surface-raised">
        <span
          className="block h-full origin-left animate-grow-x rounded-full bg-action motion-reduce:animate-none"
          style={{ width: `${(p.beforeLift / 6) * 100}%` }}
        />
      </span>
      <span className={cn(row, "mt-1")}>
        <span className="text-ink-muted">{p.after}</span>
        <span className="text-ink-muted">{p.waiting}</span>
      </span>
      <span className="block h-1.5 rounded-full border border-dashed border-line-strong/50" />
    </span>
  )
}
