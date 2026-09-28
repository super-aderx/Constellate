"""The model-client seam: services call `LLM.generate`, tests swap in a fake through `get_llm`."""

from typing import Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMTimeout(Exception):
    """The model didn't finish within the timeout."""


class LLMRefused(Exception):
    """The model refused, or returned nothing that parses as the schema."""


class LLMUnavailable(Exception):
    """The provider couldn't be reached, or answered with an error (auth, rate limit, 5xx)."""


class LLM(Protocol):
    def generate(
        self,
        *,
        instructions: str,
        messages: list[dict],
        schema: type[T],
        timeout: float,
        cache_key: str,
    ) -> T:
        """One model call: instructions plus messages in, an instance of `schema` out."""
        ...


def get_llm() -> LLM | None:
    """The configured model client, or None when AI isn't set up. (The OpenAI client is CSA-12.)"""
    return None
