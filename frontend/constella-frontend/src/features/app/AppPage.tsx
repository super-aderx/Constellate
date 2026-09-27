import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { HomePage } from "@/features/home/HomePage"
import { parseRoute } from "@/lib/route"
import { cn } from "@/lib/utils"
import { account, dataStatus, documentTitle, nav, reportTitle, shellLabels } from "./content"

// Each page loads when first opened, so Home and the landing page stay light.
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
      <Suspense fallback={null}>{pages[current]()}</Suspense>
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
