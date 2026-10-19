import os

import pytest
from fastapi.testclient import TestClient

from tests import app_db_fixture, warehouse_fixture


@pytest.fixture(scope="session")
def app_db_url():
    """A throwaway app database (tests/app_db_fixture.py), seeded, for tests that query it."""
    admin_url = os.environ.get("TEST_POSTGRES_URL")
    if not admin_url:
        pytest.skip("TEST_POSTGRES_URL is not set; see backend/.env.example")
    return app_db_fixture.build(admin_url)


@pytest.fixture(scope="session")
def client(app_db_url):
    """The API against a throwaway copy of the serving contract (tests/warehouse_fixture.py)
    and a throwaway app database.

    TEST_POSTGRES_URL is an admin connection to any Postgres 17 server; the tests create their own
    databases and read-only role there and never touch other databases.
    """
    admin_url = os.environ["TEST_POSTGRES_URL"]
    os.environ["DATABASE_URL"] = warehouse_fixture.build(admin_url)
    os.environ["APP_DATABASE_URL"] = app_db_url
    os.environ["CONSTELLA_DEFAULT_TENANT"] = "harbor-street"

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def fake_llm():
    """A FakeLLM that routes receive in place of the real model client, for one test."""
    from app.ai.llm import get_llm
    from app.main import app
    from tests.fake_llm import FakeLLM

    fake = FakeLLM()
    app.dependency_overrides[get_llm] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_llm, None)
