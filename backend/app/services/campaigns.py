"""Campaign proposals: the store's list, and the lifecycle rules for changing a status.

Proposed → active → closed, or proposed → closed; closed is final.
"""

from typing import Literal
from uuid import UUID

import psycopg
from fastapi import HTTPException

from app.app_db import campaigns as repo
from app.app_db.campaigns import CampaignRow
from app.schemas import CampaignOut, CampaignProduct

# The statuses each target status can be reached from.
ALLOWED: dict[str, tuple[str, ...]] = {
    "active": ("proposed",),
    "closed": ("proposed", "active"),
}


def _out(row: CampaignRow) -> CampaignOut:
    return CampaignOut(
        id=row.campaign_id,
        title=row.title,
        products=[CampaignProduct(**p) for p in row.products],
        slogan=row.slogan,
        discount_pct=row.discount_pct,
        discount_code=row.discount_code,
        target_segment=row.target_segment,
        status=row.status,
        created_at=row.created_at,
    )


def _conflict(current: str, to: str) -> str:
    if to == "closed":
        return "This campaign is closed already."
    return f"This campaign is {current}; it can't be activated."


def list_campaigns(app_conn: psycopg.Connection, tenant_key: str) -> list[CampaignOut]:
    return [_out(r) for r in repo.list_campaigns(app_conn, tenant_key)]


def change_status(
    app_conn: psycopg.Connection,
    tenant_key: str,
    campaign_id: UUID,
    to: Literal["active", "closed"],
) -> CampaignOut:
    """The updated campaign. 404 if the store has no such campaign; 409 if its current status
    doesn't allow the change (including when another request changed it first)."""
    row = repo.transition(app_conn, tenant_key, campaign_id, ALLOWED[to], to)
    if row is not None:
        return _out(row)
    current = repo.get_campaign(app_conn, tenant_key, campaign_id)
    if current is None:
        raise HTTPException(status_code=404, detail=f"Unknown campaign: {campaign_id}")
    raise HTTPException(
        status_code=409,
        detail={
            "code": "invalid_transition",
            "message": _conflict(current.status, to),
        },
    )
