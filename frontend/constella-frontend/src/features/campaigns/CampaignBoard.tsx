import { useRef, useState } from "react"
import { SegmentedControl } from "@/components/controls/SegmentedControl"
import { Button } from "@/components/ui/button"
import type { ApiCampaign } from "@/data/api"
import { cn } from "@/lib/utils"
import { inTab, tabCounts, TABS, type BoardTab } from "./board"
import { board } from "./content"
import { ProposalCard } from "./ProposalCard"
import { useCampaignBoard } from "./useCampaignBoard"

/**
 * Campaigns: Constella AI's proposals from the app database, as cards, filtered by status.
 * It loads on its own (not through data/store.ts), so it never waits for the warehouse data.
 */
export function CampaignBoard() {
  const { state, pending, notice, activate, close, showComingSoon, reload } = useCampaignBoard()
  const [tab, setTab] = useState<BoardTab>("all")
  // Where focus goes when the focused card leaves the page (closed or activated off this tab).
  const heading = useRef<HTMLHeadingElement>(null)

  return (
    <div className="mx-auto max-w-[88rem] px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <header>
        <h1 ref={heading} tabIndex={-1} className="text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em] outline-none">
          {board.title}
        </h1>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-6 text-ink-muted md:text-base">{board.summary}</p>
      </header>

      {/* Mounted for the page's lifetime with one line reserved, so screen readers pick up each
          notice and a notice never shifts the cards. */}
      <p aria-live="polite" className={cn("mt-3 min-h-5 text-[14px] leading-5", notice?.tone === "error" ? "text-negative" : "text-ink-muted")}>
        {notice?.text}
      </p>

      {state.kind === "loading" && (
        <p role="status" className="mt-3 text-[15px] text-ink-muted">
          {board.loading}
        </p>
      )}

      {state.kind === "error" && (
        <section role="alert" className="mt-3 rounded-xl bg-surface-raised px-5 py-5">
          <h2 className="text-[17px] leading-6 font-semibold">{board.loadError}</h2>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-5 text-ink-muted">{state.message}</p>
          <Button type="button" className="mt-4 h-10 rounded-xl px-4" onClick={reload}>
            {board.retry}
          </Button>
        </section>
      )}

      {state.kind === "ready" && (
        <Ready
          campaigns={state.campaigns}
          tab={tab}
          onTab={setTab}
          pending={pending}
          onActivate={activate}
          onClose={close}
          onManage={showComingSoon}
          onFocusLost={() => heading.current?.focus()}
        />
      )}
    </div>
  )
}

function Ready({
  campaigns,
  tab,
  onTab,
  pending,
  onActivate,
  onClose,
  onManage,
  onFocusLost,
}: {
  campaigns: ApiCampaign[]
  tab: BoardTab
  onTab(tab: BoardTab): void
  pending: ReadonlySet<string>
  onActivate(id: string): void
  onClose(id: string): void
  onManage(): void
  onFocusLost(): void
}) {
  const counts = tabCounts(campaigns)
  // In the API's order (newest first); the tab only filters.
  const shown = campaigns.filter((c) => inTab(c, tab))

  return (
    <>
      <div className="mt-3 max-sm:overflow-x-auto">
        <SegmentedControl
          label={board.tabs.label}
          value={tab}
          onValueChange={onTab}
          options={TABS.map((t) => ({
            value: t,
            label: (
              <>
                {board.tabs[t]}
                <span className="font-medium tabular-nums opacity-70">{counts[t]}</span>
              </>
            ),
          }))}
        />
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 rounded-xl bg-surface-raised px-5 py-10 text-center text-[14px] text-ink-muted">
          {tab === "all" ? board.empty.all : board.empty.filtered(board.tabs[tab])}
        </p>
      ) : (
        <ul className="m-0 mt-6 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <li key={c.id} className="flex">
              <ProposalCard
                campaign={c}
                pending={pending.has(c.id)}
                onActivate={() => onActivate(c.id)}
                onClose={() => onClose(c.id)}
                onManage={onManage}
                onFocusLost={onFocusLost}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
