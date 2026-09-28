import { communities, featuredProduct, productById } from "@/data/store"

/** Constella AI page copy. Answers themselves are written by `engine.ts` from the data. */

// Suggested questions name the store's own best seller and communities.
const top = productById[featuredProduct]?.label ?? "your best seller"
const community = (i: number) => communities[Math.min(i, communities.length - 1)]?.label ?? "your biggest community"

export const page = {
  title: "Constella AI",
  intro: (store: string) => `Ask anything about ${store}`,
  body: "Constella AI reads your sales, pairs and communities to answer, and drafts discounts, bundles and slogans when you ask for one.",
  newChat: "New conversation",
  reportShort: "Generate report",
}

export const presets = {
  label: "Suggested questions",
  groups: [
    {
      title: "Understand the store",
      questions: [`What sells with ${top}?`, "Which products hold baskets together?", "Which products are falling?"],
    },
    {
      title: "Plan a campaign",
      questions: [`Design a discount campaign for ${community(0)}`, `Suggest a bundle for ${community(1)}`, "Which pair should I discount?"],
    },
    {
      title: "Write slogans",
      questions: [`Write slogans for a ${top.replace(/\s*\(.*?\)/g, "")} bundle`, `Write slogans for ${community(2)}`, `Write slogans for ${community(3)}`],
    },
  ],
}

export const report = {
  title: "Business report",
  body: "A full read of the last 90 days: sales, strongest pairs, communities, bridge products, campaign results and what to do next.",
  action: "Generate report",
  ready: "Your report is ready",
  open: "Open report",
}

export const composer = {
  placeholder: "Ask a question or give Constella AI a goal",
  input: "Message Constella AI",
  send: "Send",
  busy: "Constella AI is answering",
  scope: "Answers use",
  period: "Period",
  customers: "Customers",
  periodOption: (label: string) => `Last ${label}`,
  disclaimer: "Constella AI drafts from your past orders. Check figures before you act; it doesn't forecast.",
}

export const answer = {
  kind: "Generated answer",
  asOf: (asOf: string) => `Data as of ${asOf}`,
  you: "You",
  trace: "How this was worked out",
  queries: (n: number) => `${n} ${n === 1 ? "query" : "queries"}`,
  followUps: "Follow-up questions",
  campaignKind: "Campaign draft",
  save: "Save to Campaigns",
  saved: "Saved as a draft",
  openCampaigns: "Open Campaigns",
  moreSlogans: "Write other slogans",
  openNetwork: "Open in Network",
}
