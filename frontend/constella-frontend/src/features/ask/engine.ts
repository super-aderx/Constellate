import type { Segment, TraceStep } from "@/components/assistant"
import type { LiftRow } from "@/components/charts/LiftDotPlot"
import type { RankItem } from "@/components/charts/RankList"
import { articulationPoints, components } from "@/components/graph"
import {
  communities,
  communityLabel,
  communitySeries,
  getNetwork,
  periodById,
  productById,
  products,
  recentChange,
  segmentById,
  segments,
  series,
  weeks,
  type NetEdge,
  type Network,
  type PeriodId,
  type SegmentId,
} from "@/data/store"
import { fmt } from "@/lib/format"

/**
 * A scripted stand-in for Constella AI until the agent exists. It recognises what a question is
 * after (pairs, bridges, communities, trends, campaigns, slogans, a report), finds the products and
 * communities it names, and writes the answer from the same mock data the other pages show, so
 * every figure is real for that data. Anything it can't place gets an honest "here's what I can do".
 */

export interface CampaignDraft {
  name: string
  offer: string
  products: string[]
  community: number | null
  /** Every slogan set it can offer; the card shows one at a time. */
  sloganSets: string[][]
  why: string
}

export type Evidence =
  | { kind: "lift"; caption: string; rows: LiftRow[] }
  | { kind: "rank"; label: string; items: RankItem[]; format: "money" | "up" | "down" | "count" }

export interface Answer {
  /** Shown while it "reads", e.g. "Reading pairs for Ground Coffee". */
  reading: string
  headline: Segment[]
  points: Segment[][]
  evidence?: Evidence
  campaign?: CampaignDraft
  /** Offer the report instead of an answer. */
  report?: boolean
  /** Product to open in the Network page. */
  networkProduct?: string
  trace: TraceStep[]
  followUps: string[]
}

export interface Scope {
  period: PeriodId
  segment: SegmentId
}

/* ---------- Recognising products and communities ---------- */

const ALIASES: [string, string][] = [
  ["whole milk", "milk"],
  ["oat milk", "oat"],
  ["ground coffee", "coffee"],
  ["coffee filter", "filters"],
  ["filters", "filters"],
  ["greek yogurt", "yogurt"],
  ["yogurt", "yogurt"],
  ["yoghurt", "yogurt"],
  ["eggs", "eggs"],
  ["egg", "eggs"],
  ["butter", "butter"],
  ["sourdough", "bread"],
  ["bread", "bread"],
  ["jam", "jam"],
  ["banana", "bananas"],
  ["granola", "granola"],
  ["biscotti", "biscotti"],
  ["spaghetti", "pasta"],
  ["tomato sauce", "sauce"],
  ["sauce", "sauce"],
  ["parmesan", "parmesan"],
  ["basil", "basil"],
  ["garlic", "garlic"],
  ["olive oil", "oil"],
  ["red wine", "wine"],
  ["wine", "wine"],
  ["tortilla chips", "chips"],
  ["chips", "chips"],
  ["salsa", "salsa"],
  ["guacamole", "guac"],
  ["guac", "guac"],
  ["lager", "lager"],
  ["beer", "lager"],
  ["sour cream", "sourcream"],
  ["lime", "limes"],
  ["turkey", "turkey"],
  ["cheddar", "cheddar"],
  ["apple", "apples"],
  ["juice", "juice"],
  ["paper towel", "towels"],
  ["towels", "towels"],
  ["milk", "milk"],
  ["coffee", "coffee"],
]

const COMMUNITY_WORDS: [RegExp, number][] = [
  [/breakfast/, 0],
  [/coffee (community|group|shoppers)|morning coffee/, 1],
  [/pasta night|pasta/, 2],
  [/game ?day|snacks/, 3],
  [/lunch ?box|lunch/, 4],
]

function findProducts(text: string): string[] {
  let rest = text
  const found: string[] = []
  // Longest phrases first, and each match is blanked so "oat milk" isn't also read as "milk".
  for (const [phrase, id] of [...ALIASES].sort((a, b) => b[0].length - a[0].length)) {
    const at = rest.indexOf(phrase)
    if (at >= 0) {
      if (!found.includes(id)) found.push(id)
      rest = rest.slice(0, at) + " ".repeat(phrase.length) + rest.slice(at + phrase.length)
    }
  }
  // Keep the order they appear in the question.
  return found.sort((a, b) => indexOfProduct(text, a) - indexOfProduct(text, b))
}
const indexOfProduct = (text: string, id: string) =>
  Math.min(...ALIASES.filter(([, x]) => x === id).map(([p]) => (text.indexOf(p) < 0 ? 1e9 : text.indexOf(p))))

function findCommunity(text: string): number | null {
  for (const [re, c] of COMMUNITY_WORDS) if (re.test(text)) return c
  return null
}

/* ---------- Helpers ---------- */

const name = (id: string) => productById[id].label
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`)
const other = (e: NetEdge, id: string) => (e.source === id ? e.target : e.source)
const attachOf = (e: NetEdge, from: string) => (e.source === from ? e.confidenceAB : e.confidenceBA)
const pairsOf = (net: Network, id: string) =>
  net.edges.filter((e) => e.source === id || e.target === id).sort((a, b) => b.lift - a.lift)
const find = (net: Network, a: string, b: string) =>
  net.edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a))

const SLOGANS: Record<string, string[][]> = {
  "0": [
    ["Saturday starts with sourdough.", "Good mornings, sorted.", "Breakfast for the whole table."],
    ["Rise, toast, repeat.", "Everything for breakfast, one aisle.", "Make the morning slower."],
  ],
  "1": [
    ["Brew it right from the first scoop.", "Coffee's best pair, in one bundle.", "Every cup, covered."],
    ["Your morning, ground and ready.", "Filter, brew, enjoy.", "The coffee run, done in one."],
  ],
  "2": [
    ["Pasta night, sorted.", "A grate finish, now on offer.", "Dinner's in the bag."],
    ["Twirl, grate, repeat.", "Tuesday tastes like Italy.", "Everything but the pot."],
  ],
  "3": [
    ["Kickoff tastes better with salsa.", "Chips, meet your match.", "Snacks for the whole squad."],
    ["Halftime, handled.", "Dip into game day.", "The crowd-pleaser kit."],
  ],
  "4": [
    ["Lunch, packed.", "Two boxes, zero morning rush.", "Lunchbox heroes start here."],
    ["Pack it, snack it.", "School-day lunches, sorted.", "The lunchbox that trades well."],
  ],
  none: [
    ["Stock up and save.", "The pair people already buy.", "Two favourites, one price."],
    ["Better together, now for less.", "Your basket, finished.", "Grab both and go."],
  ],
}

const CAMPAIGN_NAMES: Record<string, string> = {
  "0": "Weekend breakfast",
  "1": "Morning coffee bundle",
  "2": "Pasta night kit",
  "3": "Game day kit",
  "4": "Lunchbox restock",
}

const call = {
  network: (s: Scope) => {
    const range: Record<PeriodId, string> = { "30d": "start=2026-08-28", "90d": "start=2026-06-29", "12m": "start=2025-09-27" }
    return `GET /network?${range[s.period]}&end=2026-09-26&segment=${s.segment}&min_co_orders=5`
  },
  neighbors: (id: string, s: Scope) => `GET /products/${id}/neighbors?segment=${s.segment}&sort=lift`,
  communities: (s: Scope) => `GET /communities?segment=${s.segment}`,
  bridges: (s: Scope) => `GET /network/articulation-points?segment=${s.segment}`,
  sales: "GET /products/sales?weeks=12&end=2026-09-26",
}

/* ---------- Answers ---------- */

export function answer(question: string, scope: Scope): Answer {
  const text = question.toLowerCase()
  const net = getNetwork(scope.period, scope.segment)
  const period = periodById(scope.period)
  const segment = segmentById(scope.segment)
  const where = `${period.range}, ${segment.label.toLowerCase()}`
  const ids = findProducts(text)
  const community = findCommunity(text)
  const baseTrace: TraceStep = { label: `Pairs for ${where}`, call: call.network(scope), result: `${net.edges.length} pairs, ${net.nodes.length} products` }
  const src = {
    pair: (a: string, b: string) => `Orders with ${name(a)} and ${name(b)}, ${where}`,
    lift: (a: string, b: string) => `Lift for ${name(a)} and ${name(b)}, ${where}`,
    attach: (from: string, to: string) => `Share of ${name(from)} orders with ${name(to)}, ${where}`,
    sales: (id: string) => `${name(id)} revenue, last 4 weeks vs the 4 before`,
  }

  if (/report/.test(text)) {
    return {
      reading: "Getting the report ready",
      headline: [`I've put together a business report for ${period.range}: sales, strongest pairs, communities, bridge products, campaign results and what to do next.`],
      points: [],
      report: true,
      trace: [baseTrace, { label: "Sales by product", call: call.sales, result: `${products.length} products, 12 weeks` }],
      followUps: ["Which pair should I discount?", "Which products are falling?"],
    }
  }

  if (/slogan|tagline|headline|copy for/.test(text)) {
    const draft = draftCampaign(net, ids, community, src)
    return {
      reading: `Reading ${draft.community != null ? communityLabel(draft.community) : "the pairs"} to write slogans`,
      headline: [
        `Slogans for ${draft.name}. They sell ${list(draft.products.map(name))} as one habit, since shoppers already buy them together `,
        ...draft.liftSeg,
        " as often as chance.",
      ],
      points: [],
      campaign: draft.campaign,
      trace: [baseTrace, { label: `Pairs for ${list(draft.products.map(name))}`, call: call.neighbors(draft.products[0], scope), result: "Strongest lift first" }],
      followUps: [`Design a discount campaign for ${draft.community != null ? communityLabel(draft.community) : name(draft.products[0])}`, `What sells with ${name(draft.products[0])}?`],
    }
  }

  if (/campaign|discount|bundle|promo|offer|deal|should i discount/.test(text)) {
    const draft = draftCampaign(net, ids, community, src)
    return {
      reading: `Reading ${draft.community != null ? `the ${communityLabel(draft.community)} community` : "the strongest pairs"}`,
      headline: draft.headline,
      points: draft.points,
      campaign: draft.campaign,
      evidence: draft.evidence,
      networkProduct: draft.products[0],
      trace: [
        baseTrace,
        { label: `Pairs for ${name(draft.products[0])}`, call: call.neighbors(draft.products[0], scope), result: `${pairsOf(net, draft.products[0]).length} pairs` },
        ...(draft.community != null ? [{ label: "Communities", call: call.communities(scope), result: `${communities.length} communities` }] : []),
      ],
      followUps: [`Write slogans for ${draft.name}`, `What sells with ${name(draft.products[1] ?? draft.products[0])}?`],
    }
  }

  if (/(out of stock|run out|ran out|without|what happens if)/.test(text) && ids.length) {
    const id = ids[0]
    const all = net.nodes.map((n) => n.id)
    const before = components(all, net.edges).find((g) => g.includes(id)) ?? []
    const cut = components(before, net.edges, id).slice(1).flat()
    const mine = pairsOf(net, id)
    return {
      reading: `Taking ${name(id)} out of the network`,
      headline: cut.length
        ? [`Without ${name(id)}, `, { value: String(cut.length), source: `Products cut off without ${name(id)}, ${where}` }, ` ${cut.length === 1 ? "product loses its" : "products lose their"} only link to the rest of the store: ${list(cut.map(name))}.`]
        : [`Nothing is cut off without ${name(id)}: every product it's bought with is also linked to the rest of the store another way.`],
      points: [
        [
          `It's in `,
          { value: fmt.int(mine.reduce((s, e) => s + e.coOrders, 0)), source: `Orders in pairs with ${name(id)}, ${where}` },
          ` paired orders with ${mine.length} products, so a stock-out also costs the add-ons people buy with it.`,
        ],
        [cut.length ? `Keep ${name(id)} in stock before anything else in ${communityLabel(productById[id].community)}.` : `A stock-out would still hurt sales, but the network would hold together.`],
      ],
      networkProduct: id,
      trace: [baseTrace, { label: "Bridge products", call: call.bridges(scope), result: `${articulationPoints(all, net.edges).size} products` }],
      followUps: ["Which products hold baskets together?", `What sells with ${name(id)}?`],
    }
  }

  if (/hold|bridge|articulation|anchor|glue|connect/.test(text)) {
    const all = net.nodes.map((n) => n.id)
    const ranked = [...articulationPoints(all, net.edges)]
      .map((id) => {
        const before = components(all, net.edges).find((g) => g.includes(id)) ?? []
        return { id, cut: components(before, net.edges, id).slice(1).flat() }
      })
      .sort((a, b) => b.cut.length - a.cut.length)
    const top = ranked[0]
    return {
      reading: "Reading the whole network",
      headline: top
        ? [
            { value: String(ranked.length), source: `Bridge products, ${where}` },
            ` products hold your baskets together. ${name(top.id)} matters most: without it, ${list(top.cut.map(name))} lose their only link to the rest of the store.`,
          ]
        : ["No single product holds the network together in this selection: every part is linked more than one way."],
      points: ranked.slice(1, 4).map((r) => [`${name(r.id)} is the only way into ${list(r.cut.slice(0, 3).map(name))}${r.cut.length > 3 ? " and more" : ""}.`]).concat(
        top ? [[`Keep these at full price and in stock. Discount the products they bring in instead.`]] : [],
      ),
      evidence: top
        ? {
            kind: "rank",
            label: "Bridge products by how many products they hold in",
            format: "count",
            items: ranked.slice(0, 5).map((r) => ({ id: r.id, name: name(r.id), community: productById[r.id].community, score: r.cut.length })),
          }
        : undefined,
      networkProduct: top?.id,
      trace: [baseTrace, { label: "Articulation points and what each one splits off", call: call.bridges(scope), result: `${ranked.length} products` }],
      followUps: top ? [`What happens if ${name(top.id)} is out of stock?`, "Which communities are growing?"] : ["Which communities are growing?"],
    }
  }

  if (/communit|group|cluster/.test(text)) {
    const rows = communities
      .map((c) => ({ ...c, change: recentChange(communitySeries(c.community)), revenue: communitySeries(c.community).slice(-4).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.change - a.change)
    const up = rows[0]
    const down = rows[rows.length - 1]
    return {
      reading: "Reading communities",
      headline: [
        `Your orders form ${communities.length} communities. ${up.label} is growing fastest, up `,
        { value: fmt.change(up.change), source: `${up.label} revenue, last 4 weeks vs the 4 before` },
        `, and ${down.label} is ${down.change < 0 ? "down " : "slowest, up "}`,
        { value: fmt.change(down.change), source: `${down.label} revenue, last 4 weeks vs the 4 before` },
        ".",
      ],
      points: [[`${down.label}${down.change < 0 ? " is shrinking" : " is flat"}: check stock on its key products before discounting.`]],
      evidence: {
        kind: "rank",
        label: "Communities by revenue, last 4 weeks",
        format: "money",
        items: [...rows].sort((a, b) => b.revenue - a.revenue).map((r) => ({ id: String(r.community), name: r.label, community: r.community, score: r.revenue })),
      },
      trace: [{ label: "Communities", call: call.communities(scope), result: `${communities.length} communities` }, { label: "Sales by product", call: call.sales, result: "12 weeks" }],
      followUps: [`Design a discount campaign for ${up.label}`, `Why is ${down.label} ${down.change < 0 ? "falling" : "slow"}?`],
    }
  }

  if (/falling|declin|drop|down|worst|slow/.test(text) && !ids.length) {
    const ranked = products.map((p) => ({ p, change: recentChange(series[p.id].revenue) })).sort((a, b) => a.change - b.change)
    const worst = ranked.slice(0, 3)
    return {
      reading: "Reading 12 weeks of sales",
      headline: [
        `${list(worst.map((w) => w.p.label))} fell most over the last 4 weeks. ${worst[0].p.label} is down `,
        { value: fmt.change(worst[0].change), source: src.sales(worst[0].p.id) },
        ".",
      ],
      points: worst[0].p.id === "filters"
        ? [["Coffee Filters fell while Ground Coffee grew, which usually means a stock problem, not demand. The Morning coffee bundle's orders dropped the same week."]]
        : [[`Check stock and shelf placement for ${worst[0].p.label} before changing its price.`]],
      evidence: { kind: "rank", label: "Biggest falls, last 4 weeks vs the 4 before", format: "down", items: worst.map((w) => ({ id: w.p.id, name: w.p.label, community: w.p.community, score: Math.abs(w.change) })) },
      trace: [{ label: "Sales by product", call: call.sales, result: `${products.length} products, weeks of ${weeks[0].label} – ${weeks[weeks.length - 1].label}` }],
      followUps: [`What sells with ${worst[0].p.label}?`, "Which products are growing?"],
    }
  }

  if (/top|best|grow|rising|up\b|selling/.test(text) && !ids.length) {
    const ranked = products.map((p) => ({ p, change: recentChange(series[p.id].revenue) })).sort((a, b) => b.change - a.change)
    const best = ranked.slice(0, 3)
    return {
      reading: "Reading 12 weeks of sales",
      headline: [
        `${list(best.map((b) => b.p.label))} grew most over the last 4 weeks. ${best[0].p.label} is up `,
        { value: fmt.change(best[0].change), source: src.sales(best[0].p.id) },
        ".",
      ],
      points: [[`Growth in ${communityLabel(best[0].p.community)} is a good base for a bundle: shoppers are already coming for it.`]],
      evidence: { kind: "rank", label: "Biggest gains, last 4 weeks vs the 4 before", format: "up", items: best.map((b) => ({ id: b.p.id, name: b.p.label, community: b.p.community, score: b.change })) },
      trace: [{ label: "Sales by product", call: call.sales, result: `${products.length} products, 12 weeks` }],
      followUps: [`Design a discount campaign for ${communityLabel(best[0].p.community)}`, "Which products are falling?"],
    }
  }

  if (/customer|champion|loyal|segment|rfm|at risk|hibernat|new shoppers/.test(text)) {
    const seg = segments.find((s) => text.includes(s.label.toLowerCase()) || (s.id === "atRisk" && text.includes("at risk"))) ?? segments[1]
    const segNet = getNetwork(scope.period, seg.id)
    const top = [...segNet.edges].sort((a, b) => b.lift - a.lift)[0]
    const favourite = communities.map((c) => ({ ...c, a: seg.affinity[c.community] })).sort((a, b) => b.a - a.a)[0]
    return {
      reading: `Reading orders from ${seg.label.toLowerCase()}`,
      headline: [
        `${seg.label} (${seg.description.toLowerCase()}) place `,
        { value: fmt.pct(seg.share), source: `Share of orders, ${period.range}` },
        ` of your orders and lean toward ${favourite.label}. Their strongest pair is ${name(top.source)} and ${name(top.target)}, at `,
        { value: fmt.lift(top.lift), source: `Lift for ${name(top.source)} and ${name(top.target)}, ${period.range}, ${seg.label.toLowerCase()}` },
        ".",
      ],
      points: [[`They buy ${segNet.edges.length} of your pairs at least 5 times in this period.`]],
      trace: [{ label: `Pairs for ${seg.label.toLowerCase()}`, call: call.network({ ...scope, segment: seg.id }), result: `${segNet.edges.length} pairs` }],
      followUps: [`Design a discount campaign for ${favourite.label}`, "Which products hold baskets together?"],
    }
  }

  if (ids.length) {
    const id = ids[0]
    const mine = pairsOf(net, id)
    if (mine.length === 0) {
      return {
        reading: `Reading pairs for ${name(id)}`,
        headline: [`${name(id)} wasn't bought with anything at least 5 times by ${segment.label.toLowerCase()} in ${period.range}. Try a longer period or all customers.`],
        points: [],
        trace: [baseTrace],
        followUps: ["Which products hold baskets together?"],
      }
    }
    const best = mine[0]
    const mostOrders = [...mine].sort((a, b) => b.coOrders - a.coOrders)[0]
    const second = ids[1] ? find(net, id, ids[1]) : undefined
    return {
      reading: `Reading pairs for ${name(id)}`,
      headline: [
        `${name(id)} is bought with ${mine.length} products. Its strongest pair is ${name(other(best, id))}, `,
        { value: fmt.lift(best.lift), source: src.lift(best.source, best.target) },
        " as often as chance, in ",
        { value: fmt.int(best.coOrders), source: src.pair(best.source, best.target) },
        " orders.",
      ],
      points: [
        ...(second
          ? [[`${name(id)} and ${name(ids[1])} are bought together in `, { value: fmt.int(second.coOrders), source: src.pair(id, ids[1]) }, " orders, at ", { value: fmt.lift(second.lift), source: src.lift(id, ids[1]) }, "."] as Segment[]]
          : ids[1]
            ? [[`${name(id)} and ${name(ids[1])} aren't bought together at least 5 times in this selection.`] as Segment[]]
            : []),
        ...(mostOrders !== best
          ? [[`It shares the most orders with ${name(other(mostOrders, id))}: `, { value: fmt.int(mostOrders.coOrders), source: src.pair(mostOrders.source, mostOrders.target) }, "."] as Segment[]]
          : []),
        [
          "Only ",
          { value: fmt.pct(attachOf(best, id)), source: src.attach(id, other(best, id)) },
          ` of ${name(id)} orders include ${name(other(best, id))}, so there's room to grow the pair.`,
        ],
      ],
      evidence: {
        kind: "lift",
        caption: `Pairs for ${name(id)}, ${where}`,
        rows: mine.slice(0, 5).map((e) => ({ id: other(e, id), label: name(other(e, id)), lift: e.lift, coOrders: e.coOrders })),
      },
      networkProduct: id,
      trace: [baseTrace, { label: `Pairs for ${name(id)}`, call: call.neighbors(id, scope), result: `${mine.length} pairs` }],
      followUps: [`Design a bundle for ${name(id)} and ${name(other(best, id))}`, `What happens if ${name(id)} is out of stock?`],
    }
  }

  return {
    reading: "Reading the question",
    headline: ["I can answer questions about your products, the pairs they're bought in, communities, sales trends and customer segments, and draft campaigns and slogans. Try naming a product or a goal."],
    points: [],
    trace: [],
    followUps: ["What sells with Whole Milk?", "Which products hold baskets together?", "Design a discount campaign for Pasta night"],
  }
}

/* ---------- Campaign drafts ---------- */

function draftCampaign(
  net: Network,
  ids: string[],
  community: number | null,
  src: { pair: (a: string, b: string) => string; lift: (a: string, b: string) => string; attach: (from: string, to: string) => string },
) {
  // Anchor and add-on: two named products; or a named product and its weakest-attached strong partner;
  // or, within a community, its best seller and the partner shoppers leave out most.
  let anchor: string
  let addon: string
  if (ids.length >= 2 && find(net, ids[0], ids[1])) {
    anchor = ids[0]
    addon = ids[1]
  } else {
    // With no product named, a community's hub (most pairs inside it) anchors the offer; Pasta night by default.
    const inCommunity = community ?? (ids.length ? null : 2)
    const degreeInside = (id: string) =>
      pairsOf(net, id).filter((e) => inCommunity == null || productById[other(e, id)].community === inCommunity).length
    const pool = ids.length
      ? [ids[0]]
      : products
          .filter((p) => p.community === inCommunity)
          .sort((a, b) => degreeInside(b.id) - degreeInside(a.id) || b.weekly * b.price - a.weekly * a.price)
          .map((p) => p.id)
    anchor = pool.find((id) => pairsOf(net, id).length > 0) ?? "pasta"
    const partners = pairsOf(net, anchor).filter((e) => inCommunity == null || productById[other(e, anchor)].community === inCommunity)
    // The add-on: a strong pair that few of the anchor's orders include yet. Strongest tier first.
    const tier = [3, 2, 0].map((min) => partners.filter((e) => e.lift >= min)).find((t) => t.length) ?? pairsOf(net, anchor)
    const pick = [...tier].sort((a, b) => attachOf(a, anchor) - attachOf(b, anchor))[0]
    addon = pick ? other(pick, anchor) : anchor
  }
  const edge = find(net, anchor, addon)
  const comm = community ?? productById[anchor].community
  const key = comm == null ? "none" : String(comm)
  const pct = productById[addon].price > 5 ? 15 : 20
  const campaignName = (community != null || ids.length === 0) && comm != null ? CAMPAIGN_NAMES[key] : `${name(anchor)} and ${name(addon)} bundle`
  const offer = `${pct}% off ${name(addon)} with ${name(anchor)}`
  const liftSeg: Segment[] = edge ? [{ value: fmt.lift(edge.lift), source: src.lift(anchor, addon) }] : ["more"]
  const why = edge
    ? `${name(addon)} joins ${name(anchor)} in ${fmt.int(edge.coOrders)} orders, ${fmt.lift(edge.lift)} as often as chance, but only in ${fmt.pct(attachOf(edge, anchor))} of ${name(anchor)} orders.`
    : `${name(anchor)} and ${name(addon)} share customers in the same community.`

  return {
    name: campaignName,
    products: [anchor, addon],
    community: comm,
    liftSeg,
    headline: edge
      ? ([
          `${name(anchor)} and ${name(addon)} are bought together `,
          ...liftSeg,
          " as often as chance, but ",
          { value: fmt.pct(attachOf(edge, anchor)), source: src.attach(anchor, addon) },
          ` of ${name(anchor)} orders include ${name(addon)}. Discount the add-on, not the pair:`,
        ] as Segment[])
      : ([`Here's a draft built around ${name(anchor)}:`] as Segment[]),
    points: [
      [`Keep ${name(anchor)} at full price. It's what brings shoppers in; the discount only has to win the add-on.`],
    ] as Segment[][],
    evidence: edge
      ? ({
          kind: "lift",
          caption: `Pairs for ${name(anchor)}`,
          rows: pairsOf(net, anchor)
            .slice(0, 4)
            .map((e) => ({ id: other(e, anchor), label: name(other(e, anchor)), lift: e.lift, coOrders: e.coOrders })),
        } satisfies Evidence)
      : undefined,
    campaign: {
      name: campaignName,
      offer,
      products: [anchor, addon],
      community: comm,
      sloganSets: SLOGANS[key],
      why,
    } satisfies CampaignDraft,
  }
}
