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
