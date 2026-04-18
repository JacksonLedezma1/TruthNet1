import os
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from ..schemas.analysis import Claim, Source, ClaimVerdict, VerdictResponse


class LLMClaimVerdict(BaseModel):
    verdict: str = Field(description="verified | false | misleading | unverifiable")
    confidence_score: float = Field(description="0 a 100")
    explanation: str = Field(description="Explicación en español de máximo 2 oraciones")
    supports_claim: list[str] = Field(description="URLs que apoyan el claim")
    contradicts_claim: list[str] = Field(description="URLs que contradicen el claim")


CLAIM_VERDICT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Eres un verificador de hechos experto y objetivo. 
Tu tarea es evaluar si una afirmación es verdadera, falsa, engañosa o no verificable, 
basándote ÚNICAMENTE en las fuentes proporcionadas en esta petición.

CRÍTICO: 
- Si no se proporcionan fuentes ("No se encontraron fuentes relevantes."), tu veredicto DEBE ser "unverifiable" y la explicación debe decir simplemente que no hay suficiente información pública.
- NUNCA uses conocimiento propio ni menciones temas que no estén en la afirmación actual (ej. no hables de Bitcoin si la afirmación es sobre fútbol).
- Si la afirmación es sobre un evento reciente y no hay fuentes, responde: "No se encontraron fuentes recientes que confirmen o desmientan esta información."
- Mantén la brevedad y objetividad total.

{format_instructions}"""),
    ("human", """Afirmación actual a verificar: {claim}

Fuentes encontradas para esta afirmación específica:
{sources}

Evalúa la afirmación basándote exclusivamente en la información de arriba."""),
])


def _get_llm() -> ChatGroq:
    """
    Instancia el cliente de Groq.
    Usamos llama-3.3-70b-versatile — es el modelo más capaz disponible en Groq
    de forma gratuita. Rápido y con buen razonamiento para verificación de hechos.
    temperature=0 para respuestas deterministas y consistentes.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY no configurada en .env")

    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=api_key,
    )


def analyze_claims_with_llm(
    original_text: str,
    claims: list[Claim],
    sources_by_claim: dict[str, list[Source]],
) -> VerdictResponse:
    """
    Evalúa cada claim contra sus fuentes usando Groq + LangChain.
    El flujo es idéntico al de OpenAI — solo cambia el cliente LLM.
    Esto demuestra el valor de LangChain: cambiar de proveedor es
    reemplazar una línea, no reescribir la lógica.
    """
    llm = _get_llm()
    parser = PydanticOutputParser(pydantic_object=LLMClaimVerdict)
    chain = CLAIM_VERDICT_PROMPT | llm | parser

    claim_verdicts: list[ClaimVerdict] = []

    for claim in claims:
        if not claim.verifiable:
            claim_verdicts.append(ClaimVerdict(
                claim_id=claim.id,
                claim_text=claim.text,
                confidence_score=0.0,
                verdict="unverifiable",
                explanation="Esta afirmación no contiene elementos verificables con fuentes externas.",
                supporting_sources=[],
                contradicting_sources=[],
            ))
            continue

        sources = sources_by_claim.get(claim.id, [])
        sources_text = _format_sources_for_prompt(sources)

        try:
            result: LLMClaimVerdict = chain.invoke({
                "claim": claim.text,
                "sources": sources_text,
                "format_instructions": parser.get_format_instructions(),
            })

            # Mapeamos las URLs del LLM de vuelta a objetos Source con su stance
            detailed_sources = []
            for src in sources:
                # Normalizamos para comparar
                url = src.url.lower().strip()
                
                # Determinamos la postura (stance)
                stance = "neutral"
                if any(u.lower().strip() in url for u in result.supports_claim):
                    stance = "supports"
                elif any(u.lower().strip() in url for u in result.contradicts_claim):
                    stance = "contradicts"
                
                # Clonamos el objeto con el stance
                detailed_sources.append(Source(
                    url=src.url,
                    title=src.title,
                    snippet=src.snippet,
                    relevance_score=src.relevance_score,
                    stance=stance
                ))

            claim_verdicts.append(ClaimVerdict(
                claim_id=claim.id,
                claim_text=claim.text,
                confidence_score=result.confidence_score,
                verdict=result.verdict,
                explanation=result.explanation,
                sources=detailed_sources
            ))

        except Exception as e:
            print(f"Error del LLM para claim {claim.id}: {e}")
            claim_verdicts.append(ClaimVerdict(
                claim_id=claim.id,
                claim_text=claim.text,
                confidence_score=0.0,
                verdict="unverifiable",
                explanation=f"No se pudo analizar este claim: {str(e)}",
                sources=[]
            ))

    return _build_overall_verdict(original_text, claim_verdicts, llm)


def _format_sources_for_prompt(sources: list[Source]) -> str:
    if not sources:
        return "No se encontraron fuentes relevantes."

    lines = []
    for i, source in enumerate(sources, 1):
        lines.append(
            f"{i}. [{source.title}]\n"
            f"   URL: {source.url}\n"
            f"   Relevancia: {source.relevance_score:.0%}\n"
            f"   Extracto: {source.snippet}"
        )
    return "\n\n".join(lines)


def _build_overall_verdict(
    original_text: str,
    claim_verdicts: list[ClaimVerdict],
    llm: ChatGroq,
) -> VerdictResponse:
    verifiable = [v for v in claim_verdicts if v.verdict != "unverifiable"]

    if verifiable:
        overall_score = sum(v.confidence_score for v in verifiable) / len(verifiable)
    else:
        overall_score = 0.0

    if overall_score >= 70:
        overall_verdict = "reliable"
    elif overall_score >= 40:
        overall_verdict = "suspicious"
    elif overall_score >= 20:
        overall_verdict = "misleading"
    else:
        overall_verdict = "false"

    summary = _generate_summary(original_text, claim_verdicts, overall_score, llm)

    return VerdictResponse(
        overall_score=round(overall_score, 1),
        overall_verdict=overall_verdict,
        claim_verdicts=claim_verdicts,
        summary=summary,
    )


def _generate_summary(
    original_text: str,
    verdicts: list[ClaimVerdict],
    overall_score: float,
    llm: ChatGroq,
) -> str:
    verdicts_summary = "\n".join(
        f"- '{v.claim_text[:60]}': {v.verdict} ({v.confidence_score:.0f}/100)"
        for v in verdicts
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Eres un periodista de verificación de hechos. Escribe resúmenes objetivos y claros en español."),
        ("human", """Texto analizado: {text}

Resultados por afirmación:
{verdicts}

Score general: {score}/100

Escribe un párrafo corto (2-3 oraciones) resumiendo el análisis de forma objetiva."""),
    ])

    try:
        result = (prompt | llm).invoke({
            "text": original_text[:500],
            "verdicts": verdicts_summary,
            "score": round(overall_score, 1),
        })
        return result.content
    except Exception:
        return f"Análisis completado con un score de confianza de {overall_score:.0f}/100."