/** Splits a hash route such as "network?product=coffee" into its page and parameters. */
export function parseRoute(route: string) {
  const [path, query = ""] = route.split("?")
  return { page: path.split("/")[0], params: new URLSearchParams(query) }
}

/** Builds a hash link, e.g. appHref("ask", { q: "What sells with milk?" }) → "#/ask?q=What%20sells…". */
export function appHref(page: string, params?: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v) query.set(k, v)
  const qs = query.toString()
  return `#/${page}${qs ? `?${qs}` : ""}`
}
