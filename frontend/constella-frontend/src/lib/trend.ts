const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/**
 * Last 4 weeks against the 4 before, as a ratio change (0.05 = up 5%). With no sales in the 4
 * weeks before there's nothing to compare against, so it's no change (0), not -100% for a product
 * that never sold or a huge jump for a new one.
 */
export function recentChange(values: number[]) {
  const last = sum(values.slice(-4))
  const before = sum(values.slice(-8, -4))
  return before === 0 ? 0 : last / before - 1
}
