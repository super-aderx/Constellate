import { Section } from "@/components/layout/Section"
import { AskDemo } from "./AskDemo"
import { ai } from "./content"

export function AskSection() {
  return (
    <Section id="ai" className="pt-20 md:pt-28">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h2 className="text-[clamp(2rem,1.6rem+1.6vw,2.625rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            {ai.title}
          </h2>
          <p className="mt-5 text-pretty text-ink-muted">{ai.body}</p>
          <ul className="mt-8 flex flex-col gap-5">
            {ai.points.map((point) => (
              <li key={point.title}>
                <h3 className="text-[17px] leading-[1.35] font-semibold tracking-[-0.01em]">{point.title}</h3>
                <p className="mt-1 text-[15px] leading-[1.6] text-pretty text-ink-muted">{point.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <AskDemo />
      </div>
    </Section>
  )
}
