import { Component, lazy, Suspense, useEffect, type ReactNode } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Button } from "@/components/ui/button"
import { useStoreStatus } from "@/data/status"
import { momentLabel, shortDate } from "@/lib/dates"
import { parseRoute } from "@/lib/route"
import { cn } from "@/lib/utils"
import { account, dataStatus, documentTitle, nav, pageStatus, reportTitle, shellLabels } from "./content"

// Each page loads when first opened, and waits for the store's data from the API (data/store.ts),
// so the landing page never does.
const HomePage = lazy(() => import("@/features/home/HomePage").then((m) => ({ default: m.HomePage })))
const NetworkPage = lazy(() => import("@/features/network/NetworkPage").then((m) => ({ default: m.NetworkPage })))
const ProductsPage = lazy(() => import("@/features/products/ProductsPage").then((m) => ({ default: m.ProductsPage })))
const AskPage = lazy(() => import("@/features/ask/AskPage").then((m) => ({ default: m.AskPage })))
const CampaignsPage = lazy(() => import("@/features/campaigns/CampaignsPage").then((m) => ({ default: m.CampaignsPage })))
const ReportPage = lazy(() => import("@/features/report/ReportPage").then((m) => ({ default: m.ReportPage })))

/**
 * The signed-in app for a hash route ("home", "network?product=coffee" …). Unknown routes show Home.
 * "communities" opens Network's community view (Communities lives inside Network); "report" is the
 * business report, reached from Constella AI.
 */
export function AppPage({ route }: { route: string }) {
  const { page, params } = parseRoute(route)
  if (page === "communities") params.set("view", "communities")
  const current = page === "communities" ? "network" : page === "report" ? "report" : nav.some((n) => n.id === page) ? page : "home"
  const title = current === "report" ? reportTitle : (nav.find((n) => n.id === current)?.label ?? nav[0].label)

  useEffect(() => {
    const before = document.title
    document.title = documentTitle(title)
    window.scrollTo(0, 0)
    return () => {
      document.title = before
    }
  }, [title])

  // Pages are keyed on the whole route, so a link with new parameters (?product=…) opens fresh.
  const pages: Record<string, () => ReactNode> = {
    home: () => <HomePage />,
    network: () => <NetworkPage key={route} params={params} />,
    products: () => <ProductsPage key={route} params={params} />,
    ask: () => <AskPage key={route} params={params} />,
    campaigns: () => <CampaignsPage key={route} params={params} />,
    report: () => <ReportPage key={route} params={params} />,
  }

  return (
    <AppShell nav={nav} current={current === "report" ? "ask" : current} labels={shellLabels} footer={(collapsed) => <SidebarFooter collapsed={collapsed} />}>
      <PageErrorBoundary>
        <Suspense fallback={<PageLoading />}>{pages[current]()}</Suspense>
      </PageErrorBoundary>
    </AppShell>
  )
}

function PageLoading() {
  return (
    <p role="status" className="mx-auto max-w-6xl px-4 pt-10 text-[15px] text-ink-muted md:px-8">
      {pageStatus.loading}
    </p>
  )
}

/** A page whose data failed to load (the API or warehouse is down). The failed import stays
 * cached by the browser, so trying again reloads the app. */
class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <section role="alert" className="mx-auto max-w-6xl px-4 pt-10 md:px-8">
        <h1 className="text-[21px] leading-7 font-semibold">{pageStatus.errorTitle}</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-6 text-ink-muted">{pageStatus.errorBody}</p>
        <p className="mt-2 max-w-[62ch] text-[13px] leading-5 text-ink-faint">{error.message}</p>
        <Button className="mt-5 h-10 rounded-xl px-4" onClick={() => window.location.reload()}>
          {pageStatus.retry}
        </Button>
      </section>
    )
  }
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const status = useStoreStatus()
  const store = status.state === "ready" ? status.store.name : ""
  const copy =
    status.state === "ready" && status.store.last_complete_day
      ? dataStatus.ready(
          shortDate(status.store.last_complete_day),
          status.store.refreshed_at ? momentLabel(status.store.refreshed_at, status.store.timezone) : "",
        )
      : status.state === "error"
        ? dataStatus.error
        : dataStatus.loading
  return (
    <div className="flex flex-col gap-3">
      {!collapsed && (
        <p className="flex items-start gap-2 px-1 text-[13px] leading-[18px]">
          <span
            aria-hidden
            className={cn(
              "mt-[5px] size-2 shrink-0 rounded-full",
              status.state === "ready" ? "bg-positive" : status.state === "error" ? "bg-negative" : "bg-line-strong",
            )}
          />
          <span className="flex flex-col">
            <span className="font-semibold">{copy.label}</span>
            <span className="text-[12px] text-ink-muted">{copy.detail}</span>
          </span>
        </p>
      )}
      <div className={cn("flex items-center gap-3 px-1", collapsed && "justify-center px-0")}>
        <span
          aria-hidden={!collapsed}
          aria-label={collapsed ? [account.name, store].filter(Boolean).join(", ") : undefined}
          role={collapsed ? "img" : undefined}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-[12px] font-semibold text-on-action"
        >
          {account.initials}
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col text-[13px] leading-[18px]">
            <span className="truncate font-semibold">{account.name}</span>
            <span className="truncate text-[12px] text-ink-muted">{store}</span>
          </span>
        )}
      </div>
    </div>
  )
}
