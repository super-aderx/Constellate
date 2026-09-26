import { useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Button } from "@/components/ui/button"
import { HomePage } from "@/features/home/HomePage"
import { cn } from "@/lib/utils"
import { account, backHome, dataStatus, documentTitle, nav, shellLabels, upcoming, upcomingNote } from "./content"

/** The signed-in app for a hash route ("home", "network" …). Unknown routes show Home. */
export function AppPage({ route }: { route: string }) {
  const current = nav.some((n) => n.id === route) ? route : "home"
  const title = current === "home" ? nav[0].label : upcoming[current].title

  useEffect(() => {
    const before = document.title
    document.title = documentTitle(title)
    window.scrollTo(0, 0)
    return () => {
      document.title = before
    }
  }, [title])

  return (
    <AppShell nav={nav} current={current} labels={shellLabels} footer={(collapsed) => <SidebarFooter collapsed={collapsed} />}>
      {current === "home" ? <HomePage /> : <UpcomingPage {...upcoming[current]} />}
    </AppShell>
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {!collapsed && (
        <p className="flex items-start gap-2 px-1 text-[13px] leading-[18px]">
          <span aria-hidden className="mt-[5px] size-2 shrink-0 rounded-full bg-positive" />
          <span className="flex flex-col">
            <span className="font-semibold">{dataStatus.label}</span>
            <span className="text-[12px] text-ink-muted">{dataStatus.detail}</span>
          </span>
        </p>
      )}
      <div className={cn("flex items-center gap-3 px-1", collapsed && "justify-center px-0")}>
        <span
          aria-hidden={!collapsed}
          aria-label={collapsed ? `${account.name}, ${account.store}` : undefined}
          role={collapsed ? "img" : undefined}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-[12px] font-semibold text-on-action"
        >
          {account.initials}
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col text-[13px] leading-[18px]">
            <span className="truncate font-semibold">{account.name}</span>
            <span className="truncate text-[12px] text-ink-muted">{account.store}</span>
          </span>
        )}
      </div>
    </div>
  )
}

/** A sidebar page that isn't built yet: what it will show, and the way back. */
function UpcomingPage({ title, body }: { title: string; body: string }) {
  const pts = [
    [12, 36],
    [30, 14],
    [52, 26],
    [74, 10],
    [86, 34],
  ]
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <h1 className="text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em]">{title}</h1>
      <div className="mt-6 flex flex-col items-center rounded-xl bg-surface-raised px-6 py-16 text-center md:mt-8 md:py-24">
        <svg viewBox="0 0 96 48" width={96} height={48} aria-hidden>
          <path d="M12 36 L30 14 L52 26 L74 10 L86 34" fill="none" stroke="var(--line-strong)" strokeWidth={1.5} strokeDasharray="3 5" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.5} fill="var(--field)" stroke="var(--line-strong)" strokeWidth={1.5} />
          ))}
        </svg>
        <p className="mt-5 text-[21px] leading-7 font-semibold tracking-[-0.018em]">{upcomingNote}</p>
        <p className="mt-2 max-w-[48ch] text-[15px] leading-6 text-ink-muted">{body}</p>
        <Button asChild variant="secondary" className="mt-6 h-10 rounded-xl px-4">
          <a href="#/home">{backHome}</a>
        </Button>
      </div>
    </div>
  )
}
