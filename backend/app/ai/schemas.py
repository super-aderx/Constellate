"""Constella AI contracts (docs/specs/onecall-ai/tech-plan.md, "Interfaces & contracts").

Three groups: the API's request and response bodies, the error body, and the model-output
schemas the model is asked to fill. Request bodies reject unknown fields. Model-output schemas have
no defaults, so every field is required, as strict structured output expects.
"""

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.ai.errors import ErrorCode
from app.schemas import MAX_RANGE_DAYS

Language = Literal["en", "zh-Hant"]
OfferType = Literal[
    "n_for_price", "buy_x_get_y", "pct_off_set", "coupon_percent", "coupon_fixed"
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --- Shared ---


class Part(BaseModel):
    """A run of answer text. With a source it's a figure: `text` is the value as displayed."""

    text: str
    source: str | None


class TraceStep(BaseModel):
    label: str
    call: str
    result: str


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str


class ErrorResponse(BaseModel):
    detail: ErrorDetail


# --- POST /ai/ask ---


class HistoryTurn(Strict):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class AskRequest(Strict):
    question: str = Field(min_length=1, max_length=1000)
    start: date | None = None
    end: date | None = None
    segment: str = Field(
        "all", description="RFM segment id, or 'all' for every customer"
    )
    language: Language
    history: list[HistoryTurn] = Field(
        default_factory=list, max_length=12, description="Earlier turns, oldest first"
    )

    @model_validator(mode="after")
    def check_range(self):
        if self.start and self.end:
            if self.start > self.end:
                raise ValueError("start must be on or before end")
            if (self.end - self.start).days > MAX_RANGE_DAYS:
                raise ValueError(f"date range must be at most {MAX_RANGE_DAYS} days")
        return self


class LiftRow(BaseModel):
    id: str = Field(description="SKU")
    label: str
    lift: float
    co_orders: int


class LiftEvidence(BaseModel):
    kind: Literal["lift"] = "lift"
    caption: str
    rows: list[LiftRow] = Field(max_length=5)


class RankItem(BaseModel):
    id: str
    name: str
    community: int | None
    score: float


class RankEvidence(BaseModel):
    kind: Literal["rank"] = "rank"
    label: str
    format: Literal["money", "up", "down", "count"]
    items: list[RankItem]


Evidence = Annotated[LiftEvidence | RankEvidence, Field(discriminator="kind")]


class CampaignDraft(BaseModel):
    name: str
    offer: str
    offer_type: OfferType
    products: list[str] = Field(
        min_length=2, max_length=2, description="[anchor SKU, add-on SKU]"
    )
    community: int | None = Field(description="The anchor product's store community")
    slogan_sets: list[list[str]]
    why: list[Part]


class AskAnswer(BaseModel):
    headline: list[Part]
    points: list[list[Part]] = Field(max_length=4)
    focus_product: str | None = Field(description="A SKU the store sells")
    evidence: Evidence | None
    campaign: CampaignDraft | None
    offer_report: bool
    follow_ups: list[str] = Field(max_length=3)
    trace: list[TraceStep]


# --- POST /ai/report ---


class TopProductFact(Strict):
    name: str
    revenue_4w: float
    change: float = Field(description="Ratio, e.g. 0.058 for up 5.8%")


class MoveFact(Strict):
    name: str
    change: float


class PairFact(Strict):
    a: str
    b: str
    lift: float
    co_orders: int


class CommunityFact(Strict):
    label: str
    products: int
    revenue: float
    change: float


class BridgeFact(Strict):
    name: str
    holds: list[str]


class CampaignFact(Strict):
    name: str
    status: str
    redemptions: int
    extra_revenue: float
    discount_cost: float
    return_ratio: float


class DiscountCandidate(Strict):
    anchor: str
    addon: str
    lift: float
    attach: float


class StockCheck(Strict):
    name: str
    change: float
    partner: str | None
    partner_change: float | None


class ReportFacts(Strict):
    """Names and numbers only: exactly what the report page shows."""

    revenue_4w: float
    revenue_change: float
    orders: int
    pairs: int
    bridge_count: int
    product_count: int
    top: list[TopProductFact] = Field(max_length=5)
    rising: list[MoveFact] = Field(max_length=3)
    falling: list[MoveFact] = Field(max_length=3)
    strongest_pairs: list[PairFact] = Field(max_length=6)
    near_chance_pair: PairFact | None
    communities: list[CommunityFact]
    bridges: list[BridgeFact]
    campaigns: list[CampaignFact]
    discount_candidate: DiscountCandidate | None
    stock_check: StockCheck | None


class ReportRequest(Strict):
    language: Language
    period_label: str
    segment_label: str
    weeks_label: str
    facts: ReportFacts


class Recommendation(BaseModel):
    title: str
    body: list[Part]
    prompt: str | None


class ReportText(BaseModel):
    summary: list[Part]
    recommendations: list[Recommendation] = Field(
        min_length=2, max_length=4, description="Priority order"
    )


# --- GET /ai/status ---


class AIStatus(BaseModel):
    enabled: bool
    daily_limit: int
    used_today: int
    remaining: int


# --- What the model is asked to return ---


class AskDraftCampaign(BaseModel):
    name: str
    anchor_sku: str
    addon_sku: str
    offer_type: OfferType
    offer: str
    slogan_sets: list[list[str]]
    why: list[Part]


class AskDraft(BaseModel):
    headline: list[Part]
    points: list[list[Part]]
    focus_product: str | None
    evidence: Literal[
        "product_pairs", "bridges", "communities", "rising", "falling", "none"
    ]
    campaign: AskDraftCampaign | None
    offer_report: bool
    follow_ups: list[str]


ReportDraft = ReportText
