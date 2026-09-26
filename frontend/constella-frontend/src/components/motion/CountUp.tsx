import { useEffect, useState } from "react"
import { prefersReducedMotion } from "@/lib/motion"

interface CountUpProps {
  value: number
  /** Where the count starts, e.g. 1 for lift (chance). */
  from?: number
  delay?: number
  duration?: number
  format: (v: number) => string
}

/**
 * Counts from `from` to `value` on mount and whenever the value changes.
 * Screen readers get only the final figure.
 */
export function CountUp({ value, from = 0, delay = 0, duration = 900, format }: CountUpProps) {
  const [shown, setShown] = useState(from)

  useEffect(() => {
    let frame = 0
    let start = 0
    const tick = (now: number) => {
      start ||= now
      const t = Math.min(1, (now - start) / duration)
      setShown(from + (value - from) * (1 - (1 - t) ** 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => (frame = requestAnimationFrame(tick)), delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [value, from, delay, duration])

  return (
    <>
      <span aria-hidden className="tabular-nums">
        {format(prefersReducedMotion() ? value : shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
