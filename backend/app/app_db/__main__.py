"""`uv run --env-file .env python -m app.app_db init`: create the app schema and seed the mock
campaigns. Safe to re-run. Reads APP_DATABASE_URL itself, so it doesn't need the warehouse."""

import os
import sys

import psycopg

from app.app_db import init

USAGE = "usage: python -m app.app_db init"
SEEDED = "harbor-street"


def main(args: list[str]) -> int:
    if args != ["init"]:
        print(USAGE, file=sys.stderr)
        return 2
    url = os.environ.get("APP_DATABASE_URL")
    if not url:
        print("APP_DATABASE_URL is not set; see backend/.env.example", file=sys.stderr)
        return 1
    with psycopg.connect(url) as conn:
        init(conn)
        (n,) = conn.execute(
            "select count(*) from app.campaigns where tenant_key = %s", (SEEDED,)
        ).fetchone()
    print(f"app database ready: {n} campaigns for {SEEDED}")
    return 0


sys.exit(main(sys.argv[1:]))
