import { useState } from "react"
import { account } from "@/features/app/content"
import { AiOverview } from "./AiOverview"
import { header } from "./content"
import { SalesSky } from "./SalesSky"
import { TopSellers } from "./TopSellers"

/** What a signed-in user sees first: the last 7 days, what Constella AI makes of them, and the top sellers. */
export function HomePage() {
  // Read once, so the greeting doesn't change mid-visit.
  const [hour] = useState(() => new Date().getHours())

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <header className="mb-6 md:mb-8">
        <h1 className="text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em]">
          {header.greeting(hour, account.firstName)}
        </h1>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-6 text-ink-muted md:text-base">{header.summary(account.store)}</p>
      </header>

      <SalesSky />

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <AiOverview />
        <TopSellers />
      </div>
    </div>
  )
}
