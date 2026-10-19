import type { ApiCampaign, ApiCampaignStatus } from "../../data/api"

/**
 * The campaign board's rules, all pure: which campaigns a tab shows, the tab counts, and which
 * actions a card allows. Relative imports only, so the module also runs under plain Node for
 * quick checks.
 */

export type BoardTab = "all" | ApiCampaignStatus

export const TABS: readonly BoardTab[] = ["all", "proposed", "active", "closed"]

export function inTab(campaign: Pick<ApiCampaign, "status">, tab: BoardTab): boolean {
  return tab === "all" || campaign.status === tab
}

export function tabCounts(campaigns: readonly Pick<ApiCampaign, "status">[]): Record<BoardTab, number> {
  const counts: Record<BoardTab, number> = { all: 0, proposed: 0, active: 0, closed: 0 }
  for (const c of campaigns) {
    counts.all += 1
    counts[c.status] += 1
  }
  return counts
}

/** Activate starts a proposal; anything already running or closed can't be activated. */
export function canActivate(status: ApiCampaignStatus, pending: boolean): boolean {
  return status === "proposed" && !pending
}

/** Close ends a proposal or a running campaign; closed is final. */
export function canClose(status: ApiCampaignStatus, pending: boolean): boolean {
  return status !== "closed" && !pending
}

/** The list with `updated` in its place (same order); unchanged if its id isn't there. */
export function replaceCampaign(campaigns: readonly ApiCampaign[], updated: ApiCampaign): ApiCampaign[] {
  return campaigns.map((c) => (c.id === updated.id ? updated : c))
}

/**
 * How a failed activate or close should be handled. "stale": the board is out of date (409, the
 * status changed elsewhere; 404, the campaign is gone), so refresh it. "failed": anything else
 * (unreachable, 5xx …), so the card simply stays as it was. Reads `status` instead of checking
 * for ApiError, which would import api.ts and keep this module from running under plain Node.
 */
export function actionFailure(error: unknown): "stale" | "failed" {
  const status = (error as { status?: unknown } | null)?.status
  return status === 409 || status === 404 ? "stale" : "failed"
}

/** A new set with `id` added or removed, so React sees the change. */
export function withPending(pending: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
  const next = new Set(pending)
  if (on) next.add(id)
  else next.delete(id)
  return next
}

/**
 * Fetches the list for a background refresh, but only returns a snapshot no action has
 * overtaken: `revision()` counts successful activates and closes, and a fetch that saw it change
 * may have read the server before that action, so it's dropped and tried again. Null when every
 * try was overtaken or the fetch failed; then the caller keeps what's on screen.
 */
export async function refreshUntilStable(
  fetchList: () => Promise<ApiCampaign[]>,
  revision: () => number,
  maxTries = 3,
): Promise<ApiCampaign[] | null> {
  for (let i = 0; i < maxTries; i++) {
    const before = revision()
    let campaigns: ApiCampaign[]
    try {
      campaigns = await fetchList()
    } catch {
      return null
    }
    if (revision() === before) return campaigns
  }
  return null
}
