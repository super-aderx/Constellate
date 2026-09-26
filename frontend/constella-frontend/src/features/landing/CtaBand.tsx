import { Rocket } from "@/components/brand/Rocket"
import { Section } from "@/components/layout/Section"
import { Button } from "@/components/ui/button"
import { useInView } from "@/hooks/useInView"
import { cn } from "@/lib/utils"
import { cta, requestAccess } from "./content"
import { largeButton } from "./styles"

export function CtaBand() {
  const [ref, inView] = useInView<HTMLDivElement>(0.5)

  return (
    <Section id="request-access" className="pb-20 md:pb-28">
      <div ref={ref} className="flex items-center justify-between gap-8 rounded-2xl bg-action px-6 py-10 text-on-action md:px-14 md:py-14">
        <div className="max-w-xl">
          <h2 className="text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            {cta.title}
          </h2>
          <p className="mt-4 text-pretty text-on-action/75">{cta.body}</p>
          {/* Demo only: there's no sign-up flow yet, so the button does nothing */}
          <Button type="button" size="lg" variant="secondary" className={cn("mt-8", largeButton)}>
            {requestAccess.label}
          </Button>
        </div>
        {/* The rocket rises in along its trail, up and to the right */}
        <div
          className={cn(
            "transition-[translate,opacity] duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] max-sm:hidden motion-reduce:transition-none",
            !inView && "-translate-x-10 translate-y-10 opacity-0",
          )}
        >
          <Rocket size={180} inverse />
        </div>
      </div>
    </Section>
  )
}
