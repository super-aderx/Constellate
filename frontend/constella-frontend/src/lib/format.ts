const integer = new Intl.NumberFormat("en-US")
const cents = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Number formats used across the product: 1,902 · $48,210 · $25.35 · 3.62× · 4.2% */
export const fmt = {
  int: (v: number) => integer.format(Math.round(v)),
  money: (v: number) => "$" + integer.format(Math.round(v)),
  /** Prices and averages, where cents matter. */
  price: (v: number) => "$" + cents.format(v),
  lift: (v: number) => v.toFixed(2) + "×",
  /** A change as a percentage without its sign, e.g. 0.042 → "4.2%". Pair it with ▲ or ▼. */
  change: (v: number) => (Math.abs(v) * 100).toFixed(1) + "%",
}
