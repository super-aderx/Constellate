from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.ai import ask as ask_service
from app.ai import report as report_service
from app.ai.errors import AIError
from app.ai.llm import LLM, get_llm
from app.ai.schemas import (
    AIStatus,
    AskAnswer,
    AskRequest,
    ErrorResponse,
    ReportRequest,
    ReportText,
)
from app.config import settings
from app.db import DbDep

router = APIRouter(prefix="/ai", tags=["ai"])

LLMDep = Annotated[LLM | None, Depends(get_llm)]

# Every AI failure has a code; the frontend falls back to its scripted answer on any of them.
AI_ERRORS: dict[int | str, dict] = {
    429: {
        "model": ErrorResponse,
        "description": "The store has used today's AI requests",
    },
    503: {
        "model": ErrorResponse,
        "description": "AI not configured, provider error, timeout, unverified figures or refused",
    },
}


def _error(e: AIError) -> JSONResponse:
    return JSONResponse(
        status_code=e.status_code,
        content={"detail": {"code": e.code, "message": e.message}},
    )


@router.get("/status", response_model=AIStatus)
def get_status(db: DbDep):
    """Whether AI is set up, and the store's use of its daily limit."""
    limit = settings().ai_daily_limit
    return AIStatus(
        enabled=settings().ai_enabled, daily_limit=limit, used_today=0, remaining=limit
    )


@router.post("/ask", response_model=AskAnswer, responses=AI_ERRORS)
def ask(db: DbDep, llm: LLMDep, body: AskRequest):
    """Answer a question about the store from its data, for a period and customer group."""
    try:
        return ask_service.ask(db, llm, body)
    except AIError as e:
        return _error(e)


@router.post("/report", response_model=ReportText, responses=AI_ERRORS)
def report(db: DbDep, llm: LLMDep, body: ReportRequest):
    """Write the business report's summary and recommendations from its computed facts."""
    try:
        return report_service.write_report(db, llm, body)
    except AIError as e:
        return _error(e)
