import { AskSection } from "./AskSection"
import { CtaBand } from "./CtaBand"
import { Features } from "./Features"
import { Hero } from "./Hero"
import { LiftSection } from "./LiftSection"
import { SiteFooter } from "./SiteFooter"
import { SiteHeader } from "./SiteHeader"
import { Workflow } from "./Workflow"

/**
 * Layers, back to front: the page (hero, footer) → a white sheet that scrolls up over the hero
 * → floating pieces (frosted header, readout card).
 */
export function LandingPage() {
  return (
    <div
      id="top"
      className="bg-surface bg-[radial-gradient(55%_40rem_at_78%_0%,var(--glow)_0%,transparent_100%)] bg-no-repeat"
    >
      <a
        href="#main"
        className="sr-only rounded-md bg-action px-4 py-2 text-on-action focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <div className="relative z-10 mx-2 rounded-[28px] bg-surface-raised shadow-sheet md:mx-4 md:rounded-[36px]">
          <AskSection />
          <Workflow />
          <LiftSection />
          <Features />
          <CtaBand />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
