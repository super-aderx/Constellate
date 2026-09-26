import { useEffect, useState } from "react"

/** True once the page has scrolled past `offset` px. */
export function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > offset)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > offset)
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [offset])

  return scrolled
}
