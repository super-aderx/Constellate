"""Data access for campaigns in the app database: the only module that runs SQL against app.*.

Every query filters on the request's tenant key, so one store never sees or changes another's.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

import psycopg

# SELECT and RETURNING use the same columns, in CampaignRow's order.
COLUMNS = (
    "campaign_id, tenant_key, title, products, slogan, discount_pct, discount_code,"
    " target_segment, status, created_at"
)


@dataclass(frozen=True)
class CampaignRow:
    campaign_id: UUID
    tenant_key: str
    title: str
    products: list[dict[str, str]]  # [{"sku": ..., "name": ...}], proposal order
    slogan: str
    discount_pct: int
    discount_code: str
    target_segment: str
    status: str
    created_at: datetime


def list_campaigns(conn: psycopg.Connection, tenant_key: str) -> list[CampaignRow]:
    rows = conn.execute(
        f"select {COLUMNS} from app.campaigns where tenant_key = %s"
        " order by created_at desc, campaign_id",
        (tenant_key,),
    ).fetchall()
    return [CampaignRow(*r) for r in rows]


def get_campaign(
    conn: psycopg.Connection, tenant_key: str, campaign_id: UUID
) -> CampaignRow | None:
    row = conn.execute(
        f"select {COLUMNS} from app.campaigns where campaign_id = %s and tenant_key = %s",
        (campaign_id, tenant_key),
    ).fetchone()
    return CampaignRow(*row) if row else None


def transition(
    conn: psycopg.Connection,
    tenant_key: str,
    campaign_id: UUID,
    from_statuses: tuple[str, ...],
    to_status: str,
) -> CampaignRow | None:
    """Moves the campaign to `to_status` only if it's currently in `from_statuses`, in one
    statement, so of two racing requests exactly one matches. None if nothing matched."""
    row = conn.execute(
        f"update app.campaigns set status = %s, updated_at = now()"
        f" where campaign_id = %s and tenant_key = %s and status = any(%s)"
        f" returning {COLUMNS}",
        (to_status, campaign_id, tenant_key, list(from_statuses)),
    ).fetchone()
    return CampaignRow(*row) if row else None
