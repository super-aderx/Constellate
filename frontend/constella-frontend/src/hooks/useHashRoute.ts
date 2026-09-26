import { useSyncExternalStore } from "react"

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

const read = () => {
  const hash = window.location.hash
  return hash.startsWith("#/") ? hash.slice(2) : null
}

/**
 * The current hash route without its "#/", e.g. "home" for "#/home". null when the hash isn't a
 * route, including in-page anchors such as the landing page's "#network".
 * Hash routing keeps the app a static build with no router dependency until real routes are needed.
 */
export function useHashRoute() {
  return useSyncExternalStore(subscribe, read, () => null)
}
