# TruthNet Analyzer Service

## Overview

El **Analyzer Service** es un microservicio Python (FastAPI) que realiza el procesamiento de lenguaje natural y análisis de verificación de hechos para el sistema TruthNet. Este servicio trabaja en conjunto con el backend NestJS para determinar si una afirmación es verdadera, falsa o no verificable.

## Arquitectura

```
┌─────────────┐     HTTP/JSON      ┌───────────────┐
│  NestJS API │ ◄────────────────► │ Analyzer (Py) │
│   (Puerto   │    Puerto 8000     │  (Puerto 8000)│
│    3001)    │                    │               │
└─────────────┘                    └───────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │  spaCy   │        │Sentence  │        │   Groq   │
              │   NER    │        │Transformers│       │   LLM    │
              └──────────┘        └──────────┘        └──────────┘
```

## Componentes Principales

### 1. Claim Extractor (`app/services/claim_extractor.py`)

Extrae afirmaciones verificables de texto usando heurísticas estructurales complementadas con NER de spaCy.

#### Heurísticas Implementadas:

1. **Patrones estadísticos** - Detecta porcentajes, cantidades, montos monetarios
   - Ejemplo: `5%`, `$1 millón`, `50 mil millones`

2. **Términos económicos** - Identifica conceptos económicos relevantes
   - `inflación`, `PIB`, `desempleo`, `banco central`, `déficit fiscal`

3. **Verbos de declaración** - Detecta reportes oficiales
   - `anunció`, `declaró`, `reportó`, `señaló`, `confirmó`

4. **Citas de fuentes** - Identifica referencias a fuentes
   - `"según X"`, `"de acuerdo con X"`, `"fuentes de..."`

5. **Términos institucionales** - Detecta referencias gubernamentales
   - `gobierno`, `ministerio`, `banco central`, `congreso`

6. **Estructura periodística** - Patrones de reporte noticioso

#### Tipos de Claims Detectados:

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `estadística` | Contiene datos numéricos | "La economía creció 5%" |
| `declaración` | Verbos de declaración oficial | "El ministro anunció que..." |
| `reporte` | Cita fuentes externas | "Según el banco central..." |
| `evento` | Acciones con entidades detectadas | "El presidente firmó..." |
| `opinion` | Expresiones subjetivas (filtrado) | "Creo que es bueno..." |

#### Funciones Clave:

```python
def extract_claims(text: str, nlp: spacy.Language) -> dict:
    """
    Retorna: {
        "claims": [Claim, Claim, ...],
        "total": N,
        "language_bias_score": 0.0-1.0,
        "bias_indicators": ["palabra1", "palabra2"]
    }
    """
```

### 2. Source Searcher (`app/services/source_searcher.py`)

Busca y recupera fuentes relevantes para cada claim extraído usando DuckDuckGo y similitud semántica.

#### Responsabilidades:

- Búsqueda web con DuckDuckGo HTML (sin API key)
- Generación de embeddings con `sentence-transformers`
- Evaluación de relevancia por similitud de coseno
- Ranking de fuentes por score

#### Proceso:

1. Construye query de búsqueda a partir del claim
2. Scrapea resultados de DuckDuckGo HTML
3. Genera embeddings del claim y de cada resultado (título + snippet)
4. Calcula similitud coseno entre embeddings
5. Retorna las fuentes más relevantes ordenadas por score

### 3. Verdict Analyzer (`app/services/verdict_analyzer.py`)

Usa LLM (Groq) para evaluar evidencia y emitir veredicto final.

#### Pipeline de Análisis:

```
Claims + Fuentes → Prompt Engineering → Groq LLM → Veredicto Estructurado
```

#### Respuesta del LLM:

```json
{
  "overall_score": 85.5,
  "overall_verdict": "reliable",
  "claim_verdicts": [
    {
      "claim_id": "uuid",
      "verdict": "verified",
      "confidence": 92.0,
      "explanation": "...",
      "supporting_sources": ["url1", "url2"],
      "contradicting_sources": []
    }
  ],
  "summary": "El análisis indica que..."
}
```

#### Veredictos Posibles:

| Veredicto | Descripción |
|-----------|-------------|
| `verified` | Evidencia confiable confirma el claim |
| `false` | Evidencia confiable contradice el claim |
| `misleading` | Parcialmente verdadero pero con omisiones |
| `unverifiable` | Insuficiente evidencia disponible |

## API Endpoints

### Health Check
```
GET /health
Response: {
  "status": "ok",
  "spacy_loaded": true,
  "embedding_model_loaded": true
}
```

### Claims
```
POST /claims/extract
Body: {"text": "string"}
Response: ClaimExtractResponse
```

### Sources
```
POST /sources/search
Body: {"claims": [...], "max_sources_per_claim": 3}
Response: {"sources_by_claim": {"claim_id": [Source, ...]}}
```

### Verdict
```
POST /verdict/analyze
Body: VerdictRequest
Response: VerdictResponse
```

## Configuración

### Variables de Entorno

```bash
# API Key de Groq (requerida para análisis LLM)
GROQ_API_KEY=gsk_...

# Puerto del servicio (default: 8000)
PORT=8000

# Nivel de logging
LOG_LEVEL=INFO

# CORS - Backend NestJS
ALLOWED_ORIGINS=http://localhost:3001
```

### Dependencias Principales

```
fastapi==0.110.0           # Framework API
uvicorn[standard]==0.27.1 # ASGI server
spacy==3.8.2              # NLP / NER
sentence-transformers     # Embeddings semánticos
langchain-groq            # LLM integration
requests==2.31.0          # HTTP client
beautifulsoup4==4.12.3    # HTML parsing
pydantic==2.6.3           # Data validation
```

### Modelos necesarios

```bash
# Modelo de spaCy para español (medio)
python -m spacy download es_core_news_md
```

El modelo de embeddings `paraphrase-multilingual-MiniLM-L12-v2` se descarga automáticamente al iniciar.

## Flujo de Datos

```
1. NestJS POST /claims/extract
   └── Analyzer: extrae claims con spaCy + heurísticas
       
2. NestJS POST /sources/search  
   └── Analyzer: busca fuentes con embeddings + scraping
       
3. NestJS POST /verdict/analyze
   └── Analyzer: LLM evalúa evidencia y emite veredicto
```

## Estructura del Proyecto

```
services/analyzer/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Entry point FastAPI
│   ├── routers/
│   │   ├── claims.py              # POST /claims/extract
│   │   ├── sources.py             # POST /sources/search
│   │   └── verdict.py             # POST /verdict/analyze
│   ├── schemas/
│   │   └── analysis.py            # Pydantic models
│   └── services/
│       ├── claim_extractor.py     # Extracción con heurísticas
│       ├── source_searcher.py     # Búsqueda de fuentes
│       └── verdict_analyzer.py      # Análisis con LLM
├── requirements.txt
├── dockerfile
└── test_claim_extractor.py        # Tests unitarios
```

## Desarrollo

### Ejecutar en Desarrollo

**Opción 1: Script automático (recomendado)**
```bash
cd services/analyzer
./dev.sh
```

El script automáticamente:
- Crea el entorno virtual si no existe
- Instala dependencias
- Descarga el modelo de spaCy
- Copia `.env.example` a `.env` si no existe
- Inicia el servidor con hot-reload

**Opción 2: Manual**
```bash
cd services/analyzer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download es_core_news_md
uvicorn app.main:app --reload --port 8000
```

### Docker

```bash
# Construir imagen
docker build -t truthnet-analyzer .

# Ejecutar contenedor
docker run -p 8000:8000 --env-file .env truthnet-analyzer

# El health check está configurado automáticamente
# Verificar: curl http://localhost:8000/health
```

### Tests

```bash
source .venv/bin/activate
python -m pytest  # Tests unitarios (cuando existan)
```

## Decisiones de Diseño

### ¿Por qué heurísticas en lugar de LLM para extracción?

Siguiendo el principio de que el LLM solo debe hacer razonamiento, no tareas que se pueden resolver determinísticamente:

- Extracción de claims: **heurísticas estructurales** (más rápido, reproducible)
- Búsqueda de fuentes: **embeddings + scraping** (determinístico)
- Evaluación de evidencia: **LLM** (requiere razonamiento)

### ¿Por qué spaCy + heurísticas en lugar de solo spaCy?

spaCy en español tiene limitaciones reconocidas:
- No detecta bien entidades económicas ("banco central", "5%")
- Falla con términos compuestos ("déficit fiscal")

Las heurísticas estructurales actúan como fallback cuando NER falla.

### ¿Por qué FastAPI en lugar de integrar todo en NestJS?

- **Ecosistema Python** para NLP es superior (spaCy, transformers, FAISS)
- **Separación de responsabilidades**: NestJS orquesta, Python analiza
- **Escalabilidad independiente**: puedes escalar solo el analyzer si hay carga

## Limitaciones Conocidas

1. **spaCy Spanish**: Modelo medio (md), podría mejorar con modelo grande (lg)
2. **Fuentes**: Actualmente scraping básico, sin integración con APIs de noticias premium
3. **Idioma**: Optimizado para español, requeriría ajustes para otros idiomas
4. **LLM Costs**: Groq tiene límites de rate en tier gratuito

## Roadmap

- [ ] Integrar APIs de noticias (NewsAPI, GDELT)
- [ ] Cache de embeddings con Redis
- [ ] Modelo de clasificación propio entrenado
- [ ] Soporte multilingüe
- [ ] Análisis de imágenes (OCR + verificación)
