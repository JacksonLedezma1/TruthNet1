import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer
import numpy as np
import uuid
from urllib.parse import quote
from fastapi import Request
from ..schemas.analysis import Claim, Source


def search_sources_for_claims(
    claims: list[Claim],
    max_sources: int = 3,
    embedding_model: SentenceTransformer = None,
) -> dict[str, list[Source]]:
    """
    Para cada claim verificable, busca fuentes en la web y las rankea
    por relevancia semántica usando embeddings.

    Flujo por claim:
    1. Construimos una query de búsqueda a partir del claim
    2. Hacemos scraping de los primeros resultados
    3. Calculamos similitud semántica entre el claim y cada fuente
    4. Devolvemos las más relevantes ordenadas por score
    """
    sources_by_claim: dict[str, list[Source]] = {}

    for claim in claims:
        if not claim.verifiable:
            sources_by_claim[claim.id] = []
            continue

        sources = _fetch_and_rank_sources(claim, max_sources, embedding_model)
        sources_by_claim[claim.id] = sources

    return sources_by_claim


def _fetch_and_rank_sources(claim: Claim, max_sources: int, embedding_model: SentenceTransformer) -> list[Source]:
    """
    Busca y rankea fuentes para un claim específico.
    Usamos DuckDuckGo HTML (no requiere API key) como buscador base.
    """
    raw_results = _scrape_search_results(claim.text, max_results=10)

    if not raw_results:
        return []

    # Calculamos relevancia semántica de cada resultado respecto al claim
    ranked = _rank_by_semantic_similarity(claim.text, raw_results, embedding_model)

    return ranked[:max_sources]


def _scrape_search_results(query: str, max_results: int = 10) -> list[dict]:
    """
    Scraping de DuckDuckGo HTML — no requiere API key ni registro.

    Limitaciones: DuckDuckGo puede bloquear requests frecuentes.
    En producción usaríamos SerpAPI, Brave Search API, o similar.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        url = f"https://html.duckduckgo.com/html/?q={quote(query)}"
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        results = []

        for result in soup.select(".result")[:max_results]:
            title_el = result.select_one(".result__title")
            snippet_el = result.select_one(".result__snippet")
            url_el = result.select_one(".result__url")

            if not title_el or not snippet_el:
                continue

            results.append({
                "title": title_el.get_text(strip=True),
                "snippet": snippet_el.get_text(strip=True),
                "url": url_el.get_text(strip=True) if url_el else "",
            })

        return results

    except requests.RequestException as e:
        print(f"Error en búsqueda web: {e}")
        return []


def _rank_by_semantic_similarity(
    claim_text: str,
    results: list[dict],
    embedding_model: SentenceTransformer,
) -> list[Source]:
    """
    Rankea los resultados por similitud semántica con el claim.

    Similitud coseno entre embeddings:
    - 1.0 = idénticos semánticamente
    - 0.0 = completamente diferentes

    Esto es mejor que buscar palabras exactas porque entiende sinónimos
    y paráfrasis — "el PIB subió 5%" y "la economía creció un 5%"
    tienen alta similitud aunque no compartan palabras exactas.
    """
    # Generamos el embedding del claim
    claim_embedding = embedding_model.encode(claim_text, convert_to_numpy=True)

    sources_with_scores = []

    for result in results:
        # Combinamos título + snippet para el embedding de la fuente
        source_text = f"{result['title']}. {result['snippet']}"
        source_embedding = embedding_model.encode(source_text, convert_to_numpy=True)

        # Similitud coseno
        similarity = float(np.dot(claim_embedding, source_embedding) / (
            np.linalg.norm(claim_embedding) * np.linalg.norm(source_embedding)
        ))

        sources_with_scores.append(Source(
            url=result["url"],
            title=result["title"],
            snippet=result["snippet"],
            relevance_score=round(max(similarity, 0.0), 3),
            supports_claim=None,  # El LLM lo determina en el paso siguiente
        ))

    # Ordenamos de mayor a menor relevancia
    return sorted(sources_with_scores, key=lambda s: s.relevance_score, reverse=True)