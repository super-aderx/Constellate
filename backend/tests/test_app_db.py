"""The app database (app/app_db): the campaigns schema and seed, the request dependency, the init
command, and the tenant key the routes scope campaigns by."""

import os
import subprocess
import sys
from pathlib import Path

import psycopg
import pytest
from fastapi import HTTPException
from psycopg.pq import TransactionStatus

from app.config import Settings, settings

BACKEND = Path(__file__).resolve().parents[1]
SEEDED = "harbor-street"


def _campaigns(conn):
    return conn.execute(
        "select title, products, slogan, discount_pct, discount_code, target_segment,"
        " status, created_at from app.campaigns where tenant_key = %s",
        (SEEDED,),
    ).fetchall()


def test_seed_campaigns(app_db_url):
    with psycopg.connect(app_db_url) as conn:
        rows = _campaigns(conn)
    assert len(rows) == 7
    statuses = [r[6] for r in rows]
    assert {s: statuses.count(s) for s in set(statuses)} == {
        "proposed": 3,
        "active": 2,
        "closed": 2,
    }
    for title, products, slogan, pct, code, segment, _, _ in rows:
        assert title and slogan and code and segment
        assert 1 <= pct <= 100
        assert len(products) >= 1
        assert all(p["sku"] and p["name"] for p in products)


def test_seed_is_ordered_and_unique(app_db_url):
    with psycopg.connect(app_db_url) as conn:
        rows = _campaigns(conn)
    assert len({r[7] for r in rows}) == 7
    assert len({r[4] for r in rows}) == 7


def test_init_is_idempotent(app_db_url):
    from app.app_db import init

    with psycopg.connect(app_db_url) as conn:
        code, status = conn.execute(
            "select discount_code, status from app.campaigns"
            " where tenant_key = %s and status = 'proposed' limit 1",
            (SEEDED,),
        ).fetchone()
        conn.execute(
            "update app.campaigns set status = 'closed' where discount_code = %s",
            (code,),
        )
        try:
            init(conn)
            assert len(_campaigns(conn)) == 7
            (after,) = conn.execute(
                "select status from app.campaigns where discount_code = %s", (code,)
            ).fetchone()
            assert after == "closed"
        finally:
            conn.execute(
                "update app.campaigns set status = %s where discount_code = %s",
                (status, code),
            )


def test_settings_without_app_db(monkeypatch):
    monkeypatch.delenv("APP_DATABASE_URL", raising=False)
    monkeypatch.setenv(
        "DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql:///x")
    )
    settings.cache_clear()
    try:
        assert settings().app_database_url is None
    finally:
        # The next settings() call reads the env again, after monkeypatch restores it.
        settings.cache_clear()


def test_get_app_db_not_configured(monkeypatch):
    from app import app_db

    unconfigured = Settings(database_url="postgresql:///x", default_tenant=SEEDED)
    monkeypatch.setattr(app_db, "settings", lambda: unconfigured)
    with pytest.raises(HTTPException) as raised:
        next(app_db.get_app_db())
    assert raised.value.status_code == 503
    assert raised.value.detail["code"] == "app_db_not_configured"


def test_get_app_db_yields_transaction(client):
    from app.app_db import get_app_db

    deps = get_app_db()
    conn = next(deps)
    try:
        (n,) = conn.execute("select count(*) from app.campaigns").fetchone()
        assert n == 7
        assert conn.info.transaction_status == TransactionStatus.INTRANS
    finally:
        deps.close()


def test_db_tenant_key(client):
    from app.db import get_db

    for header, expected in (("maple-corner", "maple-corner"), (None, SEEDED)):
        deps = get_db(header)
        try:
            assert next(deps).tenant_key == expected
        finally:
            deps.close()


def _cli(*args, **env):
    base = {k: v for k, v in os.environ.items() if k != "APP_DATABASE_URL"}
    return subprocess.run(
        [sys.executable, "-m", "app.app_db", *args],
        cwd=BACKEND,
        env=base | env,
        capture_output=True,
        text=True,
        check=False,  # the tests assert on the return code
    )


def test_cli_errors():
    missing = _cli("init")
    assert missing.returncode == 1
    assert "APP_DATABASE_URL is not set" in missing.stderr
    usage = _cli()
    assert usage.returncode == 2
    assert "usage: python -m app.app_db init" in usage.stderr


def test_cli_init(app_db_url):
    done = _cli("init", APP_DATABASE_URL=app_db_url)
    assert done.returncode == 0, done.stderr
    assert done.stdout.strip() == "app database ready: 7 campaigns for harbor-street"
