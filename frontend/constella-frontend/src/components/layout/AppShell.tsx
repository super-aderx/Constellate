import { useState, type ReactNode } from "react"
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from "lucide-react"
import { Dialog, Tooltip } from "radix-ui"
import { GenMark } from "@/components/brand/GenMark"
import { Icon, type IconName } from "@/components/brand/Icon"
import { Logo } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

export interface NavItem {
  id: string
  label: string
  /** A Constella icon; "ai" uses the generated-content mark. */
  icon: IconName | "ai"
  href: string
}

export interface AppShellLabels {
  skip: string
  nav: string
  home: string
  collapse: string
  expand: string
  openMenu: string
  closeMenu: string
}

interface AppShellProps {
  nav: NavItem[]
  current: string
  labels: AppShellLabels
  /** Bottom of the sidebar (data status, account); told whether the sidebar is an icon rail. */
  footer?: (collapsed: boolean) => ReactNode
  children: ReactNode
}

const STORAGE_KEY = "constella.sidebar.collapsed"

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * The app frame: a 240px sidebar on tone (no rule) beside the page. From md up it collapses to a
 * 68px icon rail, remembered per browser; below md it's a drawer behind a top bar.
 * The current page is a quiet field pill with its icon in action. Navigation never takes a bold fill.
 */
export function AppShell({ nav, current, labels, footer, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1")
      } catch {
        // Storage can be blocked; the rail still toggles for this visit.
      }
      return !c
    })
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="flex min-h-dvh bg-surface">
        <a
          href="#main"
          className="sr-only rounded-md bg-action px-4 py-2 text-on-action focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
          onClick={(e) => {
            // The hash router owns the URL hash, so move focus instead of following the anchor.
            e.preventDefault()
            document.getElementById("main")?.focus()
          }}
        >
          {labels.skip}
        </a>

        {/* Sidebar, md and up */}
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 flex-col bg-surface-raised transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex print:hidden",
            collapsed ? "w-[68px]" : "w-60",
          )}
        >
          <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "flex-col justify-center px-0")}>
            <a href={nav[0]?.href} aria-label={labels.home} className="rounded-sm">
              <Logo size={26} wordmark={!collapsed} />
            </a>
            {!collapsed && (
              <button
                type="button"
                onClick={toggle}
                aria-label={labels.collapse}
                className="ml-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-field hover:text-ink"
              >
                <PanelLeftCloseIcon className="size-[18px]" />
              </button>
            )}
          </div>
          {collapsed && (
            <RailTip label={labels.expand}>
              <button
                type="button"
                onClick={toggle}
                aria-label={labels.expand}
                className="mx-auto mb-2 inline-flex size-9 cursor-pointer items-center justify-center rounded-xl text-ink-muted hover:bg-field hover:text-ink"
              >
                <PanelLeftOpenIcon className="size-[18px]" />
              </button>
            </RailTip>
          )}
          <NavList items={nav} current={current} label={labels.nav} collapsed={collapsed} />
          {footer && (
            <div className={cn("mx-3 mt-auto border-t border-line pt-3 pb-4", collapsed && "mx-2 flex justify-center")}>
              {footer(collapsed)}
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar with the drawer, below md */}
          <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <div className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-surface/85 px-2 backdrop-blur-lg md:hidden print:hidden">
              <Dialog.Trigger
                aria-label={labels.openMenu}
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl text-ink hover:bg-field"
              >
                <MenuIcon className="size-5" />
              </Dialog.Trigger>
              <a href={nav[0]?.href} aria-label={labels.home} className="rounded-sm">
                <Logo size={24} />
              </a>
            </div>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-sky/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none md:hidden" />
              <Dialog.Content
                aria-describedby={undefined}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col bg-surface-raised shadow-pop duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left motion-reduce:animate-none md:hidden"
              >
                <Dialog.Title className="sr-only">{labels.nav}</Dialog.Title>
                <div className="flex h-14 items-center px-4">
                  <Logo size={24} />
                  <Dialog.Close
                    aria-label={labels.closeMenu}
                    className="ml-auto inline-flex size-10 cursor-pointer items-center justify-center rounded-xl text-ink-muted hover:bg-field hover:text-ink"
                  >
                    <XIcon className="size-5" />
                  </Dialog.Close>
                </div>
                <NavList items={nav} current={current} label={labels.nav} onNavigate={() => setDrawerOpen(false)} />
                {footer && <div className="mx-3 mt-auto border-t border-line pt-3 pb-4">{footer(false)}</div>}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  )
}

function NavList({
  items,
  current,
  label,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[]
  current: string
  label: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav aria-label={label} className="px-3 py-2">
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {items.map((it) => {
          const on = it.id === current
          const link = (
            <a
              href={it.href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              aria-label={collapsed ? it.label : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors md:h-9 md:text-sm",
                on ? "bg-field font-semibold text-ink [&>svg]:text-action" : "font-medium text-ink-muted hover:bg-field/60 hover:text-ink",
                collapsed && "justify-center px-0",
              )}
            >
              {it.icon === "ai" ? <GenMark size={20} /> : <Icon name={it.icon} />}
              {!collapsed && <span className="truncate">{it.label}</span>}
            </a>
          )
          return <li key={it.id}>{collapsed ? <RailTip label={it.label}>{link}</RailTip> : link}</li>
        })}
      </ul>
    </nav>
  )
}

/** Names an icon-only control in the collapsed rail. */
function RailTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 rounded-md bg-action px-2.5 py-1.5 text-[13px] font-medium text-on-action shadow-pop animate-in fade-in-0 motion-reduce:animate-none"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
