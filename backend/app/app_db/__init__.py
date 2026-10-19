"""The app database: what Constellate owns and writes itself (campaigns), apart from the read-only
warehouse. One transaction per request; `init` creates the schema and seeds the mock campaigns.

Campaigns are scoped by tenant key (`Db.tenant_key`); the tenant itself still resolves through the
warehouse's platform.tenants in app/db.py, so unknown stores keep answering 404.
"""

from collections.abc import Iterator
from functools import cache
from importlib.resources import files
from typing import Annotated

import psycopg
from fastapi import Depends, HTTPException
from psycopg_pool import ConnectionPool

from app.config import settings


@cache
def app_pool() -> ConnectionPool:
    return ConnectionPool(
        settings().app_database_url, min_size=1, max_size=10, open=True
    )


def close_app_pool() -> None:
    if app_pool.cache_info().currsize:
        app_pool().close()
        app_pool.cache_clear()


def get_app_db() -> Iterator[psycopg.Connection]:
    """A connection in one transaction; 503 when APP_DATABASE_URL isn't set."""
    if not settings().app_database_url:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "app_db_not_configured",
                "message": "The app database isn't configured (APP_DATABASE_URL).",
            },
        )
    with app_pool().connection() as conn, conn.transaction():
        yield conn


AppDbDep = Annotated[psycopg.Connection, Depends(get_app_db)]


def init(conn: psycopg.Connection) -> None:
    """Creates the schema and seeds the mock campaigns. Safe to re-run: neither step replaces
    existing rows, so status changes survive."""
    for name in ("schema.sql", "seed.sql"):
        conn.execute(files(__package__).joinpath(name).read_text())
