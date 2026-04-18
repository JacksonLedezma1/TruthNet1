# TruthNet Analyzer Service

Microservicio Python construido con FastAPI que realiza:

1. extracción de claims verificables del texto
2. búsqueda de fuentes relevantes en la web
3. análisis de veredictos con Groq LLM

## Estructura

```
services/analyzer/
├── app/
│   ├── main.py
│   ├── routers/
│   │   ├── claims.py
│   │   ├── sources.py
│   │   └── verdict.py
│   ├── schemas/
│   │   └── analysis.py
│   └── services/
│       ├── claim_extractor.py
│       ├── source_searcher.py
│       └── verdict_analyzer.py
├── requirements.txt
├── dev.sh
├── Dockerfile
└── .env.example
```

## Endpoints

- `GET /health` — health check
- `POST /claims/extract` — extrae afirmaciones verificables
- `POST /sources/search` — busca fuentes web y rankea por similitud
- `POST /verdict/analyze` — genera veredictos con LLM

## Flujo de análisis

1. `extract_claims` procesa el texto con spaCy y heurísticas.
2. `search_sources_for_claims` hace scraping de Yahoo Search y calcula similitud con embeddings.
3. `analyze_claims_with_llm` llama a Groq para obtener veredictos estructurados.

## Dependencias principales

- `fastapi`
- `uvicorn[standard]`
- `spacy`
- `sentence-transformers`
- `langchain`
- `langchain-groq`
- `beautifulsoup4`
- `requests`
- `pydantic`
- `python-dotenv`

## Configuración

Copiar `services/analyzer/.env.example` a `services/analyzer/.env` y configurar:

```env
GROQ_API_KEY=tu_api_key_aqui
PORT=8000
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3001
```

## Ejecución en desarrollo

```bash
cd services/analyzer
./dev.sh
```

El script:

- crea un entorno virtual `.venv` si no existe
- instala dependencias de `requirements.txt`
- descarga el modelo spaCy `es_core_news_md` si falta
- inicia `uvicorn` en `http://localhost:8000`

## Notas técnicas

- `app/services/source_searcher.py` utiliza scraping de Yahoo Search y embeddings semánticos para rankear resultados.
- `app/services/verdict_analyzer.py` usa `langchain-groq` y `ChatGroq` con el modelo `llama-3.3-70b-versatile`.
- La respuesta LLM es parseada a Pydantic y luego se genera un veredicto final con resumen.
