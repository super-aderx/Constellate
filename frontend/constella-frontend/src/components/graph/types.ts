/** Shapes follow the API's /network response, so real data can replace the samples as-is. */

/** A product in the co-purchase network. */
export interface ProductNode {
  id: string
  label: string
  category?: string
  /** 0-based community index, largest first; null means no community. */
  community?: number | null
  /** Total co-orders across the product's pairs; sets the node's size. */
  strength: number
}

/** A pair of products bought together. */
export interface ProductEdge {
  source: string
  target: string
  /** How many times more often the pair is bought together than chance predicts. */
  lift: number
  coOrders?: number
}

export interface Community {
  community: number
  label: string
}

/** CSS colour for a community: comm-1 … comm-8 by size, comm-rest for the others. */
export function communityColor(community?: number | null): string {
  if (community == null || community < 0 || community >= 8) return "var(--comm-rest)"
  return `var(--comm-${community + 1})`
}
