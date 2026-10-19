"""Campaign API tests (/api/v1/campaigns) against the test app database.

Harbor Street's 7 seeded campaigns are only ever read here (test_app_db.py asserts their
statuses). Status changes run on Maple Corner campaigns that each test inserts and removes.
"""

import dataclasses
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.schemas import CampaignOut

URL = "/api/v1/campaigns"
OTHER = "maple-corner"
EMPTY = "quiet-corner"
MAPLE = {"X-Tenant-Key": OTHER}


@pytest.fixture
def maple(client, app_db_url):
    """One proposed, one active and one closed Maple Corner campaign: {status: id}."""
    now = datetime.now(UTC)
    with psycopg.connect(app_db_url) as conn:
        ids = {
            status: conn.execute(
                "insert into app.campaigns (tenant_key, title, products, slogan,"
                " discount_pct, discount_code, target_segment, status, created_at)"
                " values (%s, %s, %s, %s, %s, %s, %s, %s, %s) returning campaign_id",
                (
                    OTHER,
                    f"Maple {status}",
                    '[{"sku": "MC-TEA", "name": "Green Tea"}]',
                    "Steep and save.",
                    10,
                    f"MAPLE-{status.upper()}",
                    "Tea drinkers",
                    status,
                    now - timedelta(days=i),
                ),
            ).fetchone()[0]
            for i, status in enumerate(("proposed", "active", "closed"))
        }
    yield {status: str(i) for status, i in ids.items()}
    with psycopg.connect(app_db_url) as conn:
        conn.execute("delete from app.campaigns where tenant_key = %s", (OTHER,))


def _status(app_db_url, campaign_id):
    with psycopg.connect(app_db_url) as conn:
        return conn.execute(
            "select status from app.campaigns where campaign_id = %s", (campaign_id,)
        ).fetchone()[0]


def _listed(client, headers=None):
    response = client.get(URL, headers=headers)
    assert response.status_code == 200, response.text
    return {c["id"]: c["status"] for c in response.json()}


def test_list_seeded_campaigns(client):
    response = client.get(URL)
    assert response.status_code == 200
    campaigns = [CampaignOut.model_validate(c) for c in response.json()]
    assert len(campaigns) == 7
    assert all(c.products for c in campaigns)
    created = [c.created_at for c in campaigns]
    assert created == sorted(created, reverse=True)


def test_list_empty_store(client):
    response = client.get(URL, headers={"X-Tenant-Key": EMPTY})
    assert response.status_code == 200
    assert response.json() == []


def test_activate_proposed(client, maple):
    cid = maple["proposed"]
    response = client.post(f"{URL}/{cid}/activate", headers=MAPLE, json={})
    assert response.status_code == 200
    assert response.json()["id"] == cid
    assert response.json()["status"] == "active"
    assert _listed(client, MAPLE)[cid] == "active"


def test_close_proposed_and_active(client, maple):
    for status in ("proposed", "active"):
        cid = maple[status]
        response = client.post(f"{URL}/{cid}/close", headers=MAPLE)
        assert response.status_code == 200
        assert response.json()["status"] == "closed"
    listed = _listed(client, MAPLE)
    assert listed[maple["proposed"]] == listed[maple["active"]] == "closed"


def test_activate_active_conflicts(client, app_db_url, maple):
    cid = maple["active"]
    response = client.post(f"{URL}/{cid}/activate", headers=MAPLE)
    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "invalid_transition",
        "message": "This campaign is active; it can't be activated.",
    }
    assert _status(app_db_url, cid) == "active"


def test_closed_is_final(client, app_db_url, maple):
    cid = maple["closed"]
    activate = client.post(f"{URL}/{cid}/activate", headers=MAPLE)
    assert activate.status_code == 409
    assert activate.json()["detail"] == {
        "code": "invalid_transition",
        "message": "This campaign is closed; it can't be activated.",
    }
    close = client.post(f"{URL}/{cid}/close", headers=MAPLE)
    assert close.status_code == 409
    assert close.json()["detail"] == {
        "code": "invalid_transition",
        "message": "This campaign is closed already.",
    }
    assert _status(app_db_url, cid) == "closed"


@pytest.mark.parametrize("action", ["activate", "close"])
def test_unknown_campaign(client, action):
    cid = str(uuid4())
    response = client.post(f"{URL}/{cid}/{action}")
    assert response.status_code == 404
    assert response.json()["detail"] == f"Unknown campaign: {cid}"


@pytest.mark.parametrize("action", ["activate", "close"])
def test_other_store_campaign_is_hidden(client, app_db_url, maple, action):
    cid = maple["proposed"]
    # As the default store (Harbor Street), not Maple Corner.
    response = client.post(f"{URL}/{cid}/{action}")
    assert response.status_code == 404
    assert _status(app_db_url, cid) == "proposed"
    assert cid not in _listed(client)


@pytest.mark.parametrize("action", ["activate", "close"])
def test_malformed_id(client, action):
    assert client.post(f"{URL}/not-a-uuid/{action}").status_code == 422


def test_second_activate_conflicts(client, maple):
    path = f"{URL}/{maple['proposed']}/activate"
    assert client.post(path, headers=MAPLE).status_code == 200
    assert client.post(path, headers=MAPLE).status_code == 409


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", URL),
        ("post", f"{URL}/{uuid4()}/activate"),
        ("post", f"{URL}/{uuid4()}/close"),
    ],
)
def test_unknown_store(client, method, path):
    response = getattr(client, method)(path, headers={"X-Tenant-Key": "no-such-store"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Unknown tenant: no-such-store"


def test_list_without_app_db(client, monkeypatch):
    from app import app_db

    unconfigured = dataclasses.replace(settings(), app_database_url=None)
    monkeypatch.setattr(app_db, "settings", lambda: unconfigured)
    response = client.get(URL)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "app_db_not_configured"


def test_unknown_store_wins_over_missing_app_db(client, monkeypatch):
    from app import app_db

    unconfigured = dataclasses.replace(settings(), app_database_url=None)
    monkeypatch.setattr(app_db, "settings", lambda: unconfigured)
    response = client.get(URL, headers={"X-Tenant-Key": "no-such-store"})
    assert response.status_code == 404


def test_failure_after_update_rolls_back(app_db_url, maple, monkeypatch):
    from app.main import app
    from app.services import campaigns as service

    def broken(row):
        raise RuntimeError("boom after the update")

    monkeypatch.setattr(service, "_out", broken)
    # No `with`: entering it would run the lifespan and close the session's shared pools.
    raw = TestClient(app, raise_server_exceptions=False)
    cid = maple["proposed"]
    # _out only runs after transition() returned the updated row, so the UPDATE did happen.
    response = raw.post(f"{URL}/{cid}/activate", headers=MAPLE)
    assert response.status_code == 500
    assert _status(app_db_url, cid) == "proposed"


def test_seed_untouched(app_db_url):
    """Runs last: nothing above changed Harbor Street's seeded campaigns."""
    with psycopg.connect(app_db_url) as conn:
        rows = conn.execute(
            "select status, count(*) from app.campaigns"
            " where tenant_key = 'harbor-street' group by status"
        ).fetchall()
    assert dict(rows) == {"proposed": 3, "active": 2, "closed": 2}
