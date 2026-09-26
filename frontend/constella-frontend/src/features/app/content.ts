import type { AppShellLabels, NavItem } from "@/components/layout/AppShell"

/** Copy for the signed-in app frame: navigation, account and pages that aren't built yet. */

export const nav: NavItem[] = [
  { id: "home", label: "Home", icon: "overview", href: "#/home" },
  { id: "network", label: "Network", icon: "network", href: "#/network" },
  { id: "communities", label: "Communities", icon: "communities", href: "#/communities" },
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

/** Pages in the sidebar that aren't built yet. */
export const upcoming: Record<string, { title: string; body: string }> = {
  network: {
    title: "Network",
    body: "Every pair of products bought together, drawn as a constellation and weighted by lift. Select a product to see what sells with it.",
  },
  communities: {
    title: "Communities",
    body: "Groups of products bought together more than with anything else, such as Breakfast or Pasta night, and how each one is trending.",
  },
  products: {
    title: "Products",
    body: "Each product's sales, its strongest pairs and how many baskets it holds together.",
  },
  ask: {
    title: "Constella AI",
    body: "Ask about any product, pair or community in plain language, and get answers with the figures behind them.",
  },
  campaigns: {
    title: "Campaigns",
    body: "Bundles and discount campaigns drafted by Constella AI from your network, with slogans, ready for you to review.",
  },
}

export const upcomingNote = "This page is coming soon."
export const backHome = "Back to Home"
