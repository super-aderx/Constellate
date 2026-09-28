"""Answering a question (POST /ai/ask). The briefing, model call and answer assembly are CSA-18."""

from app.ai.errors import AIError
from app.ai.llm import LLM
from app.ai.schemas import AskAnswer, AskRequest
from app.db import Db


def ask(db: Db, llm: LLM | None, request: AskRequest) -> AskAnswer:
    raise AIError("not_configured")
