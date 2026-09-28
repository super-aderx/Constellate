"""Settings from the environment (see backend/.env.example)."""

import os
from dataclasses import dataclass
from functools import cache


@dataclass(frozen=True)
class Settings:
    # The warehouse, as api_reader: it can read only serving.*, meta.* and platform.tenants.
    database_url: str
    # The tenant used when a request has no X-Tenant-Key header, until sign-in exists.
    default_tenant: str


@cache
def settings() -> Settings:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set; see backend/.env.example")
    return Settings(
        database_url=url,
        default_tenant=os.environ.get("CONSTELLA_DEFAULT_TENANT", "harbor-street"),
    )
