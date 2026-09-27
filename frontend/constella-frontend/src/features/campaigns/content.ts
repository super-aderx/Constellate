import type { CampaignStatus } from "@/data/campaigns"
import { fmt } from "@/lib/format"

/** Campaigns page copy. */

export const status: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Live",
  paused: "Paused",
  ended: "Ended",
}

export const page = {
  title: "Campaigns",
  summary: (store: string) => `Discounts and bundles for ${store}, and what each one earned.`,
  create: "New campaign",
  draftWithAi: "Draft with Constella AI",
  draftPrompt: "Which pair should I discount?",
}

export const totals = {
  label: "Live campaigns so far",
  live: "Live now",
  orders: "Orders with an offer",
  extra: "Extra revenue",
  cost: "Discount given",
}

export const list = {
  label: "Campaigns",
  filterLabel: "Show",
  filters: [
    { value: "all" as const, label: "All" },
    { value: "active" as const, label: "Live" },
    { value: "planned" as const, label: "Planned" },
    { value: "ended" as const, label: "Ended" },
  ],
  count: (n: number) => `${n}`,
  draftNote: "Not scheduled",
  extra: (v: number) => `${fmt.money(v)} extra`,
  collecting: "Collecting results",
  empty: "No campaigns here yet.",
}

export const detail = {
  back: "All campaigns",
  byAi: "Drafted by Constella AI",
  byYou: "Created by you",
  products: "Products",
  slogans: "Slogans",
  why: "Why this offer",
  dates: "Dates",
  notScheduled: "Not scheduled yet",

  launch: "Launch now",
  schedule: "Schedule",
  edit: "Edit",
  delete: "Delete draft",
  pause: "Pause",
  resume: "Resume",
  end: "End campaign",
  unschedule: "Move back to drafts",
  duplicate: "Duplicate as draft",
  copyName: (name: string) => `${name} (copy)`,

  resultsTitle: "Results",
  kpis: {
    redemptions: "Orders with the offer",
    extra: "Extra revenue",
    returnRatio: "Return per $1 of discount",
    attach: "Attach rate",
    attachNote: (a: string, b: string, before: string) => `${a} orders with ${b}, up from ${before} before`,
  },
  chartTitle: "Orders with the offer, per day",
  chartLabel: (name: string) => `Daily orders with the offer for ${name}, against what was expected without it`,
  launched: (day: string) => `Launched ${day}`,
  actual: "With the campaign",
  expected: "Expected without it",
  readout: (day: string) => day,
  readoutFigures: (actual: number, expected: number) => `${fmt.int(actual)} orders, ${expected.toFixed(1)} expected`,
  tableCaption: "Orders with the offer by day",
  day: "Day",

  noResultsTitle: {
    draft: "No results yet",
    scheduled: "Starts soon",
    live: "Collecting results",
  },
  noResultsBody: {
    draft: "Launch or schedule this campaign to start measuring it. Results appear the morning after its first day.",
    scheduled: (start: string) => `It starts on ${start}. Results appear the morning after its first day.`,
    live: "It launched today. The first results arrive tomorrow at 06:00.",
  },

  readKind: "Generated read",
}

export const form = {
  createTitle: "New campaign",
  editTitle: "Edit campaign",
  scheduleTitle: "Schedule campaign",
  name: "Name",
  namePlaceholder: "Pasta night kit",
  offer: "Offer",
  offerPlaceholder: "20% off Parmesan with Spaghetti",
  products: "Products",
  productsNote: "The first product is the one the offer is built around.",
  addProduct: "Add product",
  remove: (name: string) => `Remove ${name}`,
  search: "Search products",
  pickEmpty: "No product matches that name.",
  pickLimit: (max: number) => `Up to ${max} products.`,
  start: "Starts",
  end: "Ends",
  slogans: "Slogans",
  slogansNote: "One per line.",
  cancel: "Cancel",
  saveDraft: "Save draft",
  saveChanges: "Save changes",
  scheduleAction: "Schedule",
  errors: {
    name: "Give the campaign a name.",
    offer: "Describe the offer, e.g. 20% off Parmesan with Spaghetti.",
    products: "Pick at least one product.",
    dates: "The end date has to be after the start date.",
    past: "Pick a start date from today on.",
  },
}

export const endDialog = {
  title: (name: string) => `End ${name}?`,
  body: "The offer stops today and can't be restarted. Its results stay here.",
  cancel: "Keep it running",
  confirm: "End campaign",
}
