from fastapi import APIRouter, Request, HTTPException
from app.schemas.analysis import SourceSearchRequest, SourceSearchResponse
from app.services.source_searcher import search_sources_for_claims

router = APIRouter()

@router.post("/search", response_model=SourceSearchResponse)
async def search(request: Request, body: SourceSearchRequest):
    """
    POST /sources/search
    Recibe los claims y devuelve fuentes rankeadas por relevancia semántica.
    NestJS llama este endpoint en el paso SCRAPING del Processor.
    """
    embedding_model = request.app.state.embedding_model

    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Modelo de embeddings no disponible")

    try:
        sources_by_claim = search_sources_for_claims(
            body.claims,
            max_sources=body.max_sources_per_claim,
            embedding_model=embedding_model,
        )
        return SourceSearchResponse(sources_by_claim=sources_by_claim)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error buscando fuentes: {str(e)}")