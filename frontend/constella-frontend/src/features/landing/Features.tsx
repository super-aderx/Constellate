import { GenMark } from "@/components/brand/GenMark"
import { Icon, type IconName } from "@/components/brand/Icon"
import { Section } from "@/components/layout/Section"
import { features } from "./content"

function FeatureIcon({ name, size }: { name: IconName | "ai"; size: number }) {
  return name === "ai" ? <GenMark size={size} /> : <Icon name={name} size={size} />
}

/** Two groups side by side: what the network finds, and what the AI does with it. */
export function Features() {
  return (
    <Section id="features" className="pb-20 md:pb-28">
      <h2 className="max-w-[22ch] text-[clamp(2rem,1.6rem+1.6vw,2.625rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        {features.title}
      </h2>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {features.groups.map((group) => (
          <section key={group.name} aria-labelledby={`group-${group.icon}`} className="rounded-2xl bg-surface p-6 md:p-8">
            <h3 id={`group-${group.icon}`} className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-muted">
              <FeatureIcon name={group.icon} size={18} />
              {group.name}
            </h3>
            <ul className="mt-6 flex flex-col gap-7">
              {group.items.map((item) => (
                <li key={item.title} className="grid grid-cols-[2.75rem_1fr] gap-x-4">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-surface-raised text-action">
                    <FeatureIcon name={item.icon} size={22} />
                  </span>
                  <div>
                    <h4 className="text-[19px] leading-[1.3] font-semibold tracking-[-0.015em]">{item.title}</h4>
                    <p className="mt-1.5 text-[15px] leading-[1.6] text-pretty text-ink-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  )
}
