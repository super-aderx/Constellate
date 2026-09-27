import { useLayoutEffect, useRef, useState } from "react"

/** The element's content-box size in px, kept up to date as it resizes. Starts at `fallback` before the first measure. */
export function useElementSize<T extends Element>(fallback = { width: 800, height: 520 }) {
  const ref = useRef<T>(null)
  const [size, setSize] = useState(fallback)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0) setSize((s) => (s.width === Math.round(r.width) && s.height === Math.round(r.height) ? s : { width: Math.round(r.width), height: Math.round(r.height) }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}
