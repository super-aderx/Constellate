from uuid import UUID

from fastapi import APIRouter

from app.app_db import AppDbDep
from app.db import DbDep
from app.schemas import CampaignOut
from app.services import campaigns

router = APIRouter(tags=["campaigns"])

TRANSITION_ERRORS: dict[int | str, dict] = {
    404: {"description": "The store has no campaign with this id"},
    409: {"description": "The campaign's status doesn't allow this change"},
}

# DbDep comes first in every signature below: it resolves the store, so an unknown one is a
# 404 before the app database is touched.


@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(db: DbDep, app_db: AppDbDep):
    """The store's campaign proposals, newest first."""
    return campaigns.list_campaigns(app_db, db.tenant_key)


@router.post(
    "/campaigns/{campaign_id}/activate",
    response_model=CampaignOut,
    responses=TRANSITION_ERRORS,
)
def activate_campaign(db: DbDep, app_db: AppDbDep, campaign_id: UUID):
    """Start a proposed campaign."""
    return campaigns.change_status(app_db, db.tenant_key, campaign_id, "active")


@router.post(
    "/campaigns/{campaign_id}/close",
    response_model=CampaignOut,
    responses=TRANSITION_ERRORS,
)
def close_campaign(db: DbDep, app_db: AppDbDep, campaign_id: UUID):
    """End a proposed or active campaign. Closed is final."""
    return campaigns.change_status(app_db, db.tenant_key, campaign_id, "closed")
