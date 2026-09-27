/** Round steps (1, 2, 2.5, 5 × 10ⁿ) so an axis reads 6,000 / 7,000, not 6,137 / 7,012. */
export function niceScale(values: number[], count = 3, { zero = false } = {}) {
  const min = zero ? 0 : Math.min(...values)
  const max = Math.max(...values)
  const raw = (max - min || Math.abs(max) || 1) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t)
  return { lo, hi, ticks }
}
