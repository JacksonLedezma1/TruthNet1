import requests
import re
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

        # Optimizamos la query: quitamos ruido y agregamos contexto si es breve
        search_query = _simplify_query(claim.text)
        sources = _fetch_and_rank_sources(search_query, claim.text, max_sources, embedding_model)
        sources_by_claim[claim.id] = sources

    return sources_by_claim

def _simplify_query(text: str) -> str:
    """Limpia el texto para una búsqueda más efectiva."""
    # Quitar signos de puntuación y stop words comunes (simple)
    query = text.lower()
    query = re.sub(r'[¿?¡!.,:;]', '', query)
    # Si la query es muy corta, dejamos como está, si es larga, podríamos truncar
    return query.strip()


def _fetch_and_rank_sources(query: str, original_text: str, max_sources: int, embedding_model: SentenceTransformer) -> list[Source]:
    """
    Busca y rankea fuentes para un claim específico.
    """
    raw_results = _scrape_search_results(query, max_results=15)

    if not raw_results:
        return []

    # Calculamos relevancia semántica respecto al texto original del claim
    ranked = _rank_by_semantic_similarity(original_text, raw_results, embedding_model)

    return ranked[:max_sources]


def _scrape_search_results(query: str, max_results: int = 10) -> list[dict]:
    """
    Scraping de Yahoo Search — más permisivo que DuckDuckGo en este entorno.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        url = f"https://search.yahoo.com/search?p={quote(query)}"
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        results = []

        # Yahoo usa la clase .algo para los contenedores de resultados orgánicos
        for result in soup.select(".algo, .re-algo, .algo-sr")[:max_results]:
            # Selectores más robustos para título
            title_el = (result.select_one("h3") or 
                        result.select_one(".title") or 
                        result.select_one("a.d-ib"))
            
            # Selectores para snippet (Yahoo cambia estos frecuentemente)
            snippet_el = (result.select_one(".compText") or 
                          result.select_one(".st") or 
                          result.select_one(".lh-16") or 
                          result.select_one(".fc-smoke"))
            
            # Selectores para URL
            url_el = result.select_one("a[href]")

            if not title_el:
                continue

            results.append({
                "title": title_el.get_text(strip=True),
                "snippet": snippet_el.get_text(strip=True) if snippet_el else "Ver más en el sitio.",
                "url": url_el.get("href") if url_el else "",
            })

        return results

    except requests.RequestException as e:
        print(f"Error en búsqueda web (Yahoo): {e}")
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