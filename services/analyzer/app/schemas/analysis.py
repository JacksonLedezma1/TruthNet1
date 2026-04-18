from pydantic import BaseModel, Field
from typing import Optional

class ClaimExtractRequest(BaseModel):
    """Lo que NestJS envía al endpoint /claims/extract"""
    text: str = Field(..., min_length=20, description="Texto a analizar")

class Claim(BaseModel):
    """Una afirmación factual extraída del texto"""
    id: str
    text: str                    # El claim en sí: "La economía creció 5%"
    entities: list[str]          # Entidades detectadas: ["economía", "5%"]
    claim_type: str              # "estadística", "evento", "declaración"
    verifiable: bool             # ¿Es verificable con fuentes externas?

class ClaimExtractResponse(BaseModel):
    claims: list[Claim]
    total: int
    language_bias_score: float = Field(
        ...,
        ge=0.0, le=1.0,
        description="0 = neutral, 1 = muy sesgado emocionalmente"
    )
    bias_indicators: list[str]   # Palabras que dispararon el score de sesgo


class SourceSearchRequest(BaseModel):
    """Lo que NestJS envía al endpoint /sources/search"""
    claims: list[Claim]
    max_sources_per_claim: int = Field(default=3, ge=1, le=10)

class Source(BaseModel):
    url: str
    title: str
    snippet: str                 # Fragmento relevante de la fuente
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    stance: Optional[str] = None  # "supports", "contradicts", "neutral"
    supports_claim: Optional[bool] = None

class SourceSearchResponse(BaseModel):
    sources_by_claim: dict[str, list[Source]]  # claim_id → lista de fuentes


class VerdictRequest(BaseModel):
    """Lo que NestJS envía al endpoint /verdict/analyze"""
    original_text: str
    claims: list[Claim]
    sources_by_claim: dict[str, list[Source]]

class ClaimVerdict(BaseModel):
    claim_id: str
    claim_text: str
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    verdict: str                 # "verified", "false", "misleading", "unverifiable"
    explanation: str             # Por qué el LLM llegó a esta conclusión
    sources: list[Source]        # Lista detallada de fuentes con su postura y score

class VerdictResponse(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0)
    overall_verdict: str         # "reliable", "suspicious", "misleading", "false"
    claim_verdicts: list[ClaimVerdict]
    summary: str                 # Resumen en lenguaje natural para la UI