"""Warehouse connections, one transaction per request, scoped to the request's tenant."""

from collections.abc import Iterator
from dataclasses import dataclass
from functools import cache
from typing import Annotated
from uuid import UUID

import psycopg
from fastapi import Depends, Header, HTTPException
from psycopg_pool import ConnectionPool

from app.config import settings


@cache
def pool() -> ConnectionPool:
    return ConnectionPool(settings().database_url, min_size=1, max_size=10, open=True)


def close_pool() -> None:
    if pool.cache_info().currsize:
        pool().close()
        pool.cache_clear()


@dataclass(frozen=True)
class Db:
    """A connection inside the request's transaction, and the tenant it's scoped to."""

    conn: psycopg.Connection
    tenant_id: UUID


def get_db(x_tenant_key: Annotated[str | None, Header()] = None) -> Iterator[Db]:
    """The request's tenant (X-Tenant-Key, else the default) in a transaction that starts with
    set_config('app.tenant_id'): the serving views return nothing for any other tenant. Every
    repository query also filters tenant_id itself, so a wrong view can't leak data."""
    key = x_tenant_key or settings().default_tenant
    with pool().connection() as conn:
        row = conn.execute(
            "select tenant_id from platform.tenants where tenant_key = %s", (key,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Unknown tenant: {key}")
        # set_config, not SET LOCAL, because SET can't take a bind parameter.
        conn.execute("select set_config('app.tenant_id', %s, true)", (str(row[0]),))
        yield Db(conn, row[0])


DbDep = Annotated[Db, Depends(get_db)]
