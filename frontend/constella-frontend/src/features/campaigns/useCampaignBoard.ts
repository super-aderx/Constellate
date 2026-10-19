import { useCallback, useEffect, useRef, useState } from "react"
import { api, type ApiCampaign } from "@/data/api"
import { actionFailure, replaceCampaign, withPending } from "./board"
import { board } from "./content"

/**
 * The campaign board's data: the store's campaigns from the app database (GET /campaigns), the
 * notice line above the tabs, and activate / close. Status changes aren't optimistic: a card
 * changes only from the API's answer, so a failure leaves it as it was.
 */

export type BoardState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; campaigns: ApiCampaign[] }

export type BoardNotice = { tone: "info" | "error"; text: string }

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
  // Campaign ids with an activate or close in flight; their cards' actions are disabled.
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set())
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

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

  // Only a ready board takes updates: a reload started meanwhile owns the state.
  const updateCampaigns = useCallback((change: (campaigns: ApiCampaign[]) => ApiCampaign[]) => {
    setState((prev) => (prev.kind === "ready" ? { kind: "ready", campaigns: change(prev.campaigns) } : prev))
  }, [])

  // The board is out of date (409/404): fetch it again behind the cards, with no loading state.
  // If that fails too, the cards and the notice stay as they are.
  const refresh = useCallback(async () => {
    try {
      const campaigns = await api.campaigns.list()
      if (mounted.current) updateCampaigns(() => campaigns)
    } catch {
      // Keep what's on screen; the notice already says the campaign changed.
    }
  }, [updateCampaigns])

  const run = useCallback(
    async (id: string, call: (id: string) => Promise<ApiCampaign>) => {
      setPending((p) => withPending(p, id, true))
      try {
        const updated = await call(id)
        if (!mounted.current) return
        updateCampaigns((campaigns) => replaceCampaign(campaigns, updated))
        setNotice(null)
      } catch (e) {
        if (!mounted.current) return
        if (actionFailure(e) === "stale") {
          setNotice({ tone: "error", text: board.staleError })
          await refresh()
        } else {
          setNotice({ tone: "error", text: board.actionError })
        }
      } finally {
        if (mounted.current) setPending((p) => withPending(p, id, false))
      }
    },
    [refresh, updateCampaigns],
  )

  const activate = useCallback((id: string) => run(id, api.campaigns.activate), [run])
  const close = useCallback((id: string) => run(id, api.campaigns.close), [run])

  return { state, pending, notice, activate, close, showComingSoon, reload }
}
