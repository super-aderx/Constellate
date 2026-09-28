import { baseNetwork, productById, products, recentChange, series, weeklyOrders, type Product } from "@/data/store"

/** One row per product: 12 weeks of sales and its pairs over 90 days. */
export interface ProductRow {
  product: Product
  revenue: number
  units: number
  series: number[]
  change: number
  /** Share of all orders that include it. */
  share: number
  pairs: { partner: string; lift: number; coOrders: number }[]
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export const rows: ProductRow[] = products.map((p) => {
  const s = series[p.id]
  const pairs = baseNetwork()
    .edges.filter((e) => e.source === p.id || e.target === p.id)
    .map((e) => ({ partner: e.source === p.id ? e.target : e.source, lift: e.lift, coOrders: e.coOrders }))
    .sort((a, b) => b.lift - a.lift)
  return {
    product: p,
    revenue: sum(s.revenue),
    units: sum(s.units),
    series: s.revenue,
    change: recentChange(s.revenue),
    share: p.weekly / weeklyOrders,
    pairs,
  }
})

export const rowById = Object.fromEntries(rows.map((r) => [r.product.id, r])) as Record<string, ProductRow>

/** Heat map order: by community (largest first, unassigned last), then by revenue. */
export const heatOrder = [...rows]
  .sort((a, b) => (a.product.community ?? 99) - (b.product.community ?? 99) || b.revenue - a.revenue)
  .map((r) => r.product.id)

export function pairValue(a: string, b: string) {
  const e = baseNetwork().edges.find((x) => (x.source === a && x.target === b) || (x.source === b && x.target === a))
  return e ? { lift: e.lift, coOrders: e.coOrders } : null
}

export const nameOf = (id: string) => productById[id]?.label ?? id
