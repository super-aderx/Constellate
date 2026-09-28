/** Calendar dates as ISO strings ("2026-09-26"), computed in UTC so no local timezone shifts them. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

export function addDays(iso: string, n: number) {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000)

/** "Sep 7" */
export function shortDate(iso: string) {
  const d = toDate(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/** "Sep 20 – 26", "Aug 28 – Sep 26", or with years when they differ: "Sep 27, 2025 – Sep 26, 2026". */
export function rangeLabel(start: string, end: string) {
  const a = toDate(start)
  const b = toDate(end)
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${shortDate(start)}, ${a.getUTCFullYear()} – ${shortDate(end)}, ${b.getUTCFullYear()}`
  if (a.getUTCMonth() === b.getUTCMonth()) return `${shortDate(start)} – ${b.getUTCDate()}`
  return `${shortDate(start)} – ${shortDate(end)}`
}

/** "Sep 7 – Oct 4", or "From Sep 7" without an end. */
export function dateRange(start?: string, end?: string) {
  if (!start) return ""
  return end ? `${shortDate(start)} – ${shortDate(end)}` : `From ${shortDate(start)}`
}

/** "Sun 20" */
export const weekdayShort = (iso: string) => `${toDate(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })} ${toDate(iso).getUTCDate()}`

/** "Sunday, September 20" */
export const dayLong = (iso: string) => toDate(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })

/** "Sunday" */
export const weekdayLong = (iso: string) => toDate(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })

/** A moment in a store's timezone: "Sep 28, 11:41". */
export function momentLabel(timestamp: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).formatToParts(new Date(timestamp))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("month")} ${get("day")}, ${get("hour")}:${get("minute")}`
}
