const integer = new Intl.NumberFormat("en-US")

/** Number formats used across the product: 1,902 · $48,210 · 3.62× */
export const fmt = {
  int: (v: number) => integer.format(Math.round(v)),
  money: (v: number) => "$" + integer.format(Math.round(v)),
  lift: (v: number) => v.toFixed(2) + "×",
}
