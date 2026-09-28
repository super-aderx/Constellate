"""Writing the report's summary and recommendations (POST /ai/report). The service is CSA-19."""

from app.ai.errors import AIError
from app.ai.llm import LLM
from app.ai.schemas import ReportRequest, ReportText
from app.db import Db


def write_report(db: Db, llm: LLM | None, request: ReportRequest) -> ReportText:
    raise AIError("not_configured")
