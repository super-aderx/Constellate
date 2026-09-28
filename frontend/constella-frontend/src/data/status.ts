import { useEffect, useState } from "react"
import { api, type ApiStore } from "./api"

/**
 * The store's name and data freshness for the app frame, fetched on its own (not through
 * `store.ts`), so the frame renders at once and shows whether the API is reachable.
 */

export type StoreStatus = { state: "loading" } | { state: "ready"; store: ApiStore } | { state: "error"; message: string }

let request: Promise<ApiStore> | null = null

export function useStoreStatus(): StoreStatus {
  const [status, setStatus] = useState<StoreStatus>({ state: "loading" })
  useEffect(() => {
    let live = true
    request ??= api.store()
    request.then(
      (store) => live && setStatus({ state: "ready", store }),
      (e: unknown) => live && setStatus({ state: "error", message: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      live = false
    }
  }, [])
  return status
}
