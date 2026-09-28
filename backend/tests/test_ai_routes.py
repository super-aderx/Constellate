"""The AI contract (CSA-11): settings, the model-client seam, and the /api/v1/ai routes wired to
stub services. The services themselves are built in later tickets."""

import pytest
from pydantic import BaseModel

from app.ai import ask as ask_service
from app.ai.errors import AIError
from app.ai.llm import LLMTimeout, get_llm
from app.config import settings
from tests.fake_llm import FakeLLM

VALID_ASK = {"question": "What sells with Whole Milk?", "language": "en"}
VALID_REPORT = {
    "language": "en",
    "period_label": "Jun 29 – Sep 26",
    "segment_label": "All customers",
    "weeks_label": "Aug 30 – Sep 26",
    "facts": {
        "revenue_4w": 193673.0,
        "revenue_change": 0.058,
        "orders": 23686,
        "pairs": 99,
        "bridge_count": 3,
        "product_count": 30,
        "top": [{"name": "Ground Coffee", "revenue_4w": 23000.5, "change": 0.1}],
        "rising": [{"name": "Olive Oil", "change": 0.183}],
        "falling": [{"name": "Tortilla Chips", "change": -0.037}],
        "strongest_pairs": [
            {"a": "Coffee Filters", "b": "Oat Milk", "lift": 5.18, "co_orders": 700}
        ],
        "near_chance_pair": {
            "a": "Eggs",
            "b": "Whole Milk",
            "lift": 1.67,
            "co_orders": 4995,
        },
        "communities": [
            {
                "label": "Whole Milk & Eggs",
                "products": 8,
                "revenue": 190000.0,
                "change": 0.018,
            }
        ],
        "bridges": [{"name": "Whole Milk", "holds": ["Ground Coffee", "Oat Milk"]}],
        "campaigns": [
            {
                "name": "Game day kit",
                "status": "ended",
                "redemptions": 250,
                "extra_revenue": 800.0,
                "discount_cost": 142.5,
                "return_ratio": 5.6,
            }
        ],
        "discount_candidate": {
            "anchor": "Red Wine",
            "addon": "Fresh Basil",
            "lift": 3.68,
            "attach": 0.18,
        },
        "stock_check": {
            "name": "Tortilla Chips",
            "change": -0.037,
            "partner": "Lager (6-pack)",
            "partner_change": 0.05,
        },
    },
}


AI_VARS = ("OPENAI_API_KEY", "CONSTELLA_AI_MODEL", "CONSTELLA_AI_DAILY_LIMIT")


@pytest.fixture
def no_ai(monkeypatch):
    """AI switched off for one test, whatever backend/.env says."""
    for name in AI_VARS:
        monkeypatch.delenv(name, raising=False)
    settings.cache_clear()
    yield
    settings.cache_clear()


# --- Routes with no AI configured ---


def test_ask_without_ai_configured_is_503(client, no_ai):
    response = client.post("/api/v1/ai/ask", json=VALID_ASK)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "not_configured"
    assert response.json()["detail"]["message"]


@pytest.mark.parametrize(
    "body",
    [
        {**VALID_ASK, "unexpected": True},
        {**VALID_ASK, "question": ""},
        {**VALID_ASK, "question": "x" * 1001},
        {**VALID_ASK, "history": [{"role": "user", "content": "earlier"}] * 13},
        {**VALID_ASK, "history": [{"role": "system", "content": "earlier"}]},
        {**VALID_ASK, "language": "fr"},
        {**VALID_ASK, "start": "2026-09-10", "end": "2026-09-01"},
    ],
    ids=[
        "unknown-field",
        "empty",
        "too-long",
        "13-turns",
        "bad-role",
        "bad-language",
        "range",
    ],
)
def test_ask_rejects_invalid_bodies(client, body):
    assert client.post("/api/v1/ai/ask", json=body).status_code == 422


def test_ask_accepts_a_full_valid_body(client, no_ai):
    body = {
        **VALID_ASK,
        "start": "2026-08-28",
        "end": "2026-09-26",
        "segment": "champions",
        "language": "zh-Hant",
        "history": [
            {"role": "user", "content": "What sells with coffee?"},
            {"role": "assistant", "content": "Oat Milk, most of all."},
        ],
    }
    # Valid, so it reaches the stub service rather than failing validation.
    assert client.post("/api/v1/ai/ask", json=body).status_code == 503


def test_status_without_ai_configured(client, no_ai):
    response = client.get("/api/v1/ai/status")
    assert response.status_code == 200
    assert response.json() == {
        "enabled": False,
        "daily_limit": 50,
        "used_today": 0,
        "remaining": 50,
    }


def test_report_without_ai_configured_is_503(client, no_ai):
    response = client.post("/api/v1/ai/report", json=VALID_REPORT)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "not_configured"


def test_report_rejects_unknown_fact(client):
    body = {**VALID_REPORT, "facts": {**VALID_REPORT["facts"], "customer_emails": []}}
    assert client.post("/api/v1/ai/report", json=body).status_code == 422


# --- Error mapping ---


@pytest.mark.parametrize(
    ("code", "status"),
    [
        ("limit_reached", 429),
        ("not_configured", 503),
        ("provider_error", 503),
        ("timeout", 503),
        ("unverified", 503),
        ("refused", 503),
    ],
)
def test_ai_error_status_mapping(client, monkeypatch, code, status):
    def failing(db, llm, request):
        raise AIError(code)

    monkeypatch.setattr(ask_service, "ask", failing)
    response = client.post("/api/v1/ai/ask", json=VALID_ASK)
    assert response.status_code == status
    detail = response.json()["detail"]
    assert detail["code"] == code
    assert detail["message"]


# --- Settings ---


@pytest.fixture
def fresh_settings(monkeypatch):
    """Re-read settings from the environment for one test, and again afterwards."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://reader@localhost/warehouse")
    for name in AI_VARS:
        monkeypatch.delenv(name, raising=False)
    settings.cache_clear()
    yield monkeypatch
    settings.cache_clear()


@pytest.mark.parametrize(
    ("key", "model", "enabled"),
    [
        ("sk-test", "some-model", True),
        ("sk-test", None, False),
        (None, "some-model", False),
    ],
)
def test_ai_settings_enabled_only_with_key_and_model(
    fresh_settings, key, model, enabled
):
    if key:
        fresh_settings.setenv("OPENAI_API_KEY", key)
    if model:
        fresh_settings.setenv("CONSTELLA_AI_MODEL", model)
    assert settings().ai_enabled is enabled


def test_ai_settings_daily_limit(fresh_settings):
    assert settings().ai_daily_limit == 50
    fresh_settings.setenv("CONSTELLA_AI_DAILY_LIMIT", "20")
    settings.cache_clear()
    assert settings().ai_daily_limit == 20


# --- The model-client seam ---


class Echo(BaseModel):
    text: str


def generate(llm):
    return llm.generate(
        instructions="be brief",
        messages=[{"role": "user", "content": "hi"}],
        schema=Echo,
        timeout=5.0,
        cache_key="harbor-street",
    )


def test_fake_llm_returns_raises_and_records():
    fake = FakeLLM([Echo(text="hello"), LLMTimeout("too slow")])
    assert generate(fake) == Echo(text="hello")
    with pytest.raises(LLMTimeout):
        generate(fake)
    assert len(fake.calls) == 2
    assert fake.calls[0]["instructions"] == "be brief"
    assert fake.calls[0]["messages"] == [{"role": "user", "content": "hi"}]
    assert fake.calls[0]["cache_key"] == "harbor-street"
    with pytest.raises(AssertionError):
        generate(fake)


def test_get_llm_is_none_until_a_client_exists():
    assert get_llm() is None


def test_fake_llm_override_reaches_the_service(client, fake_llm, monkeypatch):
    received = {}

    def spy(db, llm, request):
        received["llm"] = llm
        raise AIError("not_configured")

    monkeypatch.setattr(ask_service, "ask", spy)
    client.post("/api/v1/ai/ask", json=VALID_ASK)
    assert received["llm"] is fake_llm
