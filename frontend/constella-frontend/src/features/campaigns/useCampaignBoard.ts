import { useCallback, useEffect, useState } from "react"
import { api, type ApiCampaign } from "@/data/api"
import { board } from "./content"

/**
 * The campaign board's data: the store's campaigns from the app database (GET /campaigns), plus
 * the notice line above the tabs. Activate and close are stubs until CSA-26 wires them to the API.
 */

export type BoardState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; campaigns: ApiCampaign[] }

export type BoardNotice = { tone: "info" | "error"; text: string }

const NONE_PENDING: ReadonlySet<string> = new Set()

export function useCampaignBoard(): {
  state: BoardState
  pending: ReadonlySet<string>
  notice: BoardNotice | null
  activate(id: string): Promise<void>
  close(id: string): Promise<void>
  showComingSoon(): void
  reload(): void
} {
  const [state, setState] = useState<BoardState>({ kind: "loading" })
  const [notice, setNotice] = useState<BoardNotice | null>(null)
  // Bumped by reload(); each value is one fetch.
  const [attempt, setAttempt] = useState(0)

  // The first fetch starts from the initial "loading"; reload() sets it again before the next.
  useEffect(() => {
    let live = true
    api.campaigns.list().then(
      (campaigns) => live && setState({ kind: "ready", campaigns }),
      (e: unknown) => live && setState({ kind: "error", message: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      live = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setState({ kind: "loading" })
    setAttempt((n) => n + 1)
  }, [])
  const showComingSoon = useCallback(() => setNotice({ tone: "info", text: board.comingSoon }), [])

  // CSA-26: call api.campaigns.activate / close, track pending ids, and update or re-fetch.
  const activate = useCallback(async (_id: string) => {}, [])
  const close = useCallback(async (_id: string) => {}, [])

  return { state, pending: NONE_PENDING, notice, activate, close, showComingSoon, reload }
}
