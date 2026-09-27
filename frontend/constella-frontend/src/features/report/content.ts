/** Business report copy. The report's findings are written by `report.ts` from the data. */

export const report = {
  documentTitle: "Business report",
  kind: "Generated report",
  title: (store: string) => `Business report for ${store}`,
  scope: (range: string, segment: string) => `Pairs and communities: ${range}, ${segment.toLowerCase()}. Sales: the 12 weeks to Sep 26.`,
  generated: (asOf: string) => `Data as of ${asOf}`,
  back: "Back to Constella AI",
  print: "Print or save as PDF",
  steps: ["Reading 12 weeks of sales", "Mapping pairs and communities", "Finding bridge products", "Checking campaign results", "Writing recommendations"],
  generating: "Writing your report",

  summaryTitle: "Summary",
  kpis: {
    revenue: "Revenue, last 4 weeks",
    vsBefore: "vs the 4 weeks before",
    orders: "Orders in the period",
    pairs: "Pairs bought together",
    bridges: "Bridge products",
  },

  salesTitle: "Sales",
  topTitle: "Top sellers, last 4 weeks",
  risingTitle: "Growing fastest",
  fallingTitle: "Falling most",
  product: "Product",
  revenue: "Revenue",
  change: "Change",

  pairsTitle: "What sells together",
  pairsBody: "The strongest pairs, by how much more often they're bought together than chance.",
  pairsCaption: "Strongest pairs by lift",
  nearChance: (a: string, b: string) => `${a} and ${b} are bought together often, but close to chance: popular, not paired.`,

  communitiesTitle: "Communities",
  community: "Community",
  products: "Products",

  bridgesTitle: "Bridge products",
  bridgesBody: "Each is the only link between part of your store and the rest. If one runs out, that part stops being bought with everything else.",
  holdsIn: (names: string) => `Holds in ${names}`,
  noBridges: "No single product holds this network together.",

  campaignsTitle: "Campaign results",
  campaign: "Campaign",
  status: "Status",
  redemptions: "Orders with the offer",
  extra: "Extra revenue",
  returnRatio: "Return per $1 of discount",
  noCampaigns: "No campaigns have results yet.",

  nextTitle: "What to do next",
  draft: "Draft it with Constella AI",
  method:
    "How this report was made: Constella AI read the same figures the Network and Products pages show, from your order history. Figures with a dotted underline name their source. It describes the past and doesn't forecast.",
}
