from fastapi import APIRouter, HTTPException
from app.schemas.analysis import VerdictRequest, VerdictResponse
from app.services.verdict_analyzer import analyze_claims_with_llm
import os

router = APIRouter()

@router.post("/analyze", response_model=VerdictResponse)
async def analyze(body: VerdictRequest):
    """
    POST /verdict/analyze
    Recibe claims + fuentes y devuelve el veredicto final con scores.
    NestJS llama este endpoint en los pasos ANALYZING y SCORING del Processor.
    """
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY no configurada en .env"
        )

    try:
        result = analyze_claims_with_llm(
            body.original_text,
            body.claims,
            body.sources_by_claim,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis LLM: {str(e)}")