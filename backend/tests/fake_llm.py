"""A stand-in for the AI model client (app/ai/llm.py) in tests: no network, no key.

Queue what each call should return (a parsed model) or raise (an exception), in order. Every call
is recorded, so tests can check the instructions and messages the service sent.
"""

from typing import Any

from pydantic import BaseModel


class FakeLLM:
    def __init__(self, responses: list[BaseModel | Exception] | None = None):
        self.responses: list[BaseModel | Exception] = list(responses or [])
        self.calls: list[dict[str, Any]] = []

    def generate(
        self,
        *,
        instructions: str,
        messages: list[dict],
        schema: type[BaseModel],
        timeout: float,
        cache_key: str,
    ) -> Any:
        self.calls.append(
            {
                "instructions": instructions,
                "messages": messages,
                "schema": schema,
                "timeout": timeout,
                "cache_key": cache_key,
            }
        )
        if not self.responses:
            raise AssertionError("FakeLLM has no more queued responses")
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response
