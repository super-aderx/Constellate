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

/** Mock account until sign-in exists. */
export const account = {
  name: "Dana Reyes",
  firstName: "Dana",
  initials: "DR",
  store: "Harbor Street Market",
}

export const dataStatus = {
  label: "Data up to date",
  detail: "Refreshed today at 06:00",
}

/** Browser tab title for the business report, which isn't in the sidebar. */
export const reportTitle = "Business report"
