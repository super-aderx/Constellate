import type { AppShellLabels, NavItem } from "@/components/layout/AppShell"

/** Copy for the signed-in app frame: navigation and account. */

export const nav: NavItem[] = [
  { id: "home", label: "Home", icon: "overview", href: "#/home" },
  { id: "network", label: "Network", icon: "network", href: "#/network" },
  { id: "products", label: "Products", icon: "products", href: "#/products" },
  { id: "ask", label: "Constella AI", icon: "ai", href: "#/ask" },
  { id: "campaigns", label: "Campaigns", icon: "tag", href: "#/campaigns" },
]

export const documentTitle = (page: string) => `${page} – Constella`

export const shellLabels: AppShellLabels = {
  skip: "Skip to content",
  nav: "Main",
  home: "Constella, home",
  collapse: "Collapse sidebar",
  expand: "Expand sidebar",
  openMenu: "Open menu",
  closeMenu: "Close menu",
}

/** Mock account until sign-in exists. The store's name comes from the API. */
export const account = {
  name: "Dana Reyes",
  firstName: "Dana",
  initials: "DR",
}

export const dataStatus = {
  loading: { label: "Checking data", detail: "Connecting to the warehouse" },
  ready: (through: string, refreshed: string) => ({ label: `Data through ${through}`, detail: `Refreshed ${refreshed}` }),
  error: { label: "Data unavailable", detail: "Can't reach the Constella API" },
}

/** Shown while a page's data loads, and when it can't. */
export const pageStatus = {
  loading: "Loading your store's data…",
  errorTitle: "Your store's data didn't load",
  errorBody: "Constella couldn't get the data from its API. Check that the API and the warehouse are running, then try again.",
  retry: "Try again",
}

/** Browser tab title for the business report, which isn't in the sidebar. */
export const reportTitle = "Business report"
