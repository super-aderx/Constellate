"""A throwaway app database for the tests: the app schema and its mock seed (app/app_db), built
in its own database next to the fixture warehouse, so the tests never touch a real one."""

import psycopg
from psycopg import sql

from app.app_db import init

TEST_APP_DB = "constella_app_test"


def build(admin_url: str) -> str:
    """(Re)creates the test app database and returns a connection string for it. The admin role
    owns the app schema, as the app's own role does in dev."""
    with psycopg.connect(admin_url, autocommit=True) as admin:
        admin.execute(
            sql.SQL("drop database if exists {} with (force)").format(
                sql.Identifier(TEST_APP_DB)
            )
        )
        admin.execute(sql.SQL("create database {}").format(sql.Identifier(TEST_APP_DB)))

    db_url = psycopg.conninfo.make_conninfo(admin_url, dbname=TEST_APP_DB)
    with psycopg.connect(db_url) as conn:
        init(conn)
    return db_url
