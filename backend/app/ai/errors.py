"""The one error type AI services raise; the routes turn it into a response with its code."""

from typing import Literal

ErrorCode = Literal[
    "not_configured",
    "limit_reached",
    "provider_error",
    "timeout",
    "unverified",
    "refused",
]

MESSAGES: dict[str, str] = {
    "not_configured": "Constella AI isn't set up: no OpenAI key or model is configured.",
    "limit_reached": "This store has used today's AI requests.",
    "provider_error": "The AI provider couldn't be reached or returned an error.",
    "timeout": "The AI took too long to answer.",
    "unverified": "The AI's answer contained figures that couldn't be matched to the data.",
    "refused": "The AI declined to answer, or its answer couldn't be read.",
}


class AIError(Exception):
    """A request the AI couldn't answer. The frontend falls back on any of these."""

    def __init__(self, code: ErrorCode, message: str | None = None):
        self.code: ErrorCode = code
        self.message = message or MESSAGES[code]
        super().__init__(self.message)

    @property
    def status_code(self) -> int:
        # The daily limit is the client's to wait out; everything else is the service being
        # unavailable for this request.
        return 429 if self.code == "limit_reached" else 503
