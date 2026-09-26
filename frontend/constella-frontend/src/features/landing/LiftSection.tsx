import { LiftDotPlot } from "@/components/charts/LiftDotPlot"
import { Section } from "@/components/layout/Section"
import { lift } from "./content"

export function LiftSection() {
  return (
    <Section id="lift" className="py-20 md:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h2 className="text-[clamp(2rem,1.6rem+1.6vw,2.625rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            {lift.title}
          </h2>
          {lift.body.map((paragraph) => (
            <p key={paragraph} className="mt-5 text-pretty text-ink-muted">
              {paragraph}
            </p>
          ))}
        </div>
        {/* Recessed into the sheet: one tone darker */}
        <div className="rounded-2xl bg-surface p-5 [--plot-surface:var(--surface)] md:p-8">
          <LiftDotPlot rows={lift.rows} caption={lift.caption} marker="rocket" />
        </div>
      </div>
    </Section>
  )
}
