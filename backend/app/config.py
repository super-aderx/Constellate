"""Settings from the environment (see backend/.env.example)."""

import os
from dataclasses import dataclass
from functools import cache

# Constella AI time budgets, in seconds: under the frontend's 20 s (a question) and 45 s (the
# report), so the API answers with its own timeout error before the browser gives up. A retry
# after a figure mismatch only starts if at least AI_MIN_RETRY_S of the budget is left.
AI_ASK_BUDGET_S = 18
AI_REPORT_BUDGET_S = 42
AI_MIN_RETRY_S = 6


@dataclass(frozen=True)
class Settings:
    # The warehouse, as api_reader: it can read only serving.*, meta.* and platform.tenants.
    database_url: str
    # The tenant used when a request has no X-Tenant-Key header, until sign-in exists.
    default_tenant: str
    # Constella AI. The store owner supplies the key and chooses the model; without both, AI is
    # off and the frontend shows its scripted answers.
    openai_api_key: str | None = None
    ai_model: str | None = None
    # AI requests per store per local day.
    ai_daily_limit: int = 50

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openai_api_key and self.ai_model)


@cache
def settings() -> Settings:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set; see backend/.env.example")
    return Settings(
        database_url=url,
        default_tenant=os.environ.get("CONSTELLA_DEFAULT_TENANT", "harbor-street"),
        openai_api_key=os.environ.get("OPENAI_API_KEY") or None,
        ai_model=os.environ.get("CONSTELLA_AI_MODEL") or None,
        ai_daily_limit=int(os.environ.get("CONSTELLA_AI_DAILY_LIMIT") or 50),
    )
