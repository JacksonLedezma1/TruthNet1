from fastapi import APIRouter, Request, HTTPException
from app.schemas.analysis import ClaimExtractRequest, ClaimExtractResponse
from app.services.claim_extractor import extract_claims

router = APIRouter()

@router.post("/extract", response_model=ClaimExtractResponse)
async def extract(request: Request, body: ClaimExtractRequest):
    """
    POST /claims/extract
    Recibe texto y devuelve los claims verificables extraídos.
    NestJS llama este endpoint en el paso EXTRACTING del Processor.
    
    request: Request nos da acceso a app.state.nlp (el modelo cargado al arrancar)
    """
    nlp = request.app.state.nlp
    
    if nlp is None:
        raise HTTPException(status_code=503, detail="Modelo NLP no disponible")
    
    try:
        result = extract_claims(body.text, nlp)
        return ClaimExtractResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extrayendo claims: {str(e)}")