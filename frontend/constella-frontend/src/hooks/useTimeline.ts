import { useEffect, useState } from "react"
import { prefersReducedMotion } from "@/lib/motion"

/**
 * Milliseconds since playback started, capped at `duration`. Restarts whenever `runKey` changes.
 * Waits at 0 until `playing` is true. With reduced motion it jumps straight to `duration`.
 */
export function useTimeline(duration: number, playing: boolean, runKey: string) {
  const [reduced] = useState(prefersReducedMotion)
  const [state, setState] = useState({ key: runKey, elapsed: 0 })

  useEffect(() => {
    if (!playing || reduced) return
    let frame = 0
    let startedAt = 0
    const tick = (now: number) => {
      startedAt ||= now
      const elapsed = Math.min(duration, now - startedAt)
      setState({ key: runKey, elapsed })
      if (elapsed < duration) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, playing, reduced, runKey])

  if (reduced) return duration
  // A new run reads as 0 until its first frame, so the previous run's end state never flashes.
  return state.key === runKey ? state.elapsed : 0
}
