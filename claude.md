# TruthNet — Contexto Completo del Proyecto

## ¿Qué es TruthNet?
Plataforma de verificación de desinformación. El usuario pega un texto o noticia,
y el sistema analiza automáticamente si las afirmaciones que contiene son verificables,
las busca en fuentes reales, y emite un veredicto con score de confianza por cada claim.

---

## Stack tecnológico

| Capa | Tecnología | Puerto | Rol |
|------|-----------|--------|-----|
| Backend API | NestJS (TypeScript) | 3001 | Orquestador, auth, colas, SSE |
| Frontend | Next.js (TypeScript) | 3000 | UI (pendiente — Fase 4) |
| Microservicio IA | FastAPI (Python) | 8000 | NLP, scraping, LLM |
| Base de datos | PostgreSQL 16 | 5432 | Persistencia principal |
| Cola de jobs | Redis 7 + Bull | 6379 | Jobs asíncronos |
| LLM | Groq (llama-3.3-70b-versatile) | — | Verificación semántica |

---

## Estructura de carpetas

```
truthnet/                          ← raíz del monorepo
├── apps/
│   ├── api/                       ← NestJS
│   │   └── src/
│   │       ├── main.ts            ← bootstrap, helmet, CORS, pipes, interceptors
│   │       ├── app.module.ts      ← módulo raíz: TypeORM, Bull, EventEmitter, Throttler
│   │       ├── app.config.ts      ← variables de entorno por namespaces tipados
│   │       ├── auth/              ← (tu estructura real usa esta ruta)
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.service.ts
│   │       │   ├── auth.module.ts
│   │       │   ├── DTO/
│   │       │   │   └── login.dto.ts
│   │       │   └── guards/
│   │       │       ├── jwt.strategy.ts
│   │       │       ├── jwt-auth.guard.ts
│   │       │       ├── jwt-refresh.strategy.ts
│   │       │       └── jwt-refresh-auth.guard.ts
│   │       ├── users/
│   │       │   ├── users.entity.ts
│   │       │   ├── users.service.ts
│   │       │   ├── users.module.ts
│   │       │   └── DTO/
│   │       │       └── create-user.dto.ts
│   │       ├── analysis/
│   │       │   ├── analysis.entity.ts
│   │       │   ├── analysis.service.ts
│   │       │   ├── analysis.controller.ts
│   │       │   ├── analysis.module.ts
│   │       │   ├── analysis.processor.ts
│   │       │   ├── analyzer-client.service.ts
│   │       │   ├── DTO/
│   │       │   │   └── create-analysis.dto.ts
│   │       │   └── events/
│   │       │       └── analysis-status.event.ts
│   │       └── common/
│   │           └── guards/
│   │               └── jwt-auth.guard.ts  ← copia para uso global
│   └── web/                       ← Next.js (Fase 4 — pendiente)
├── services/
│   └── analyzer/                  ← FastAPI Python
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py            ← bootstrap FastAPI, lifespan, CORS, routers
│       │   ├── routers/
│       │   │   ├── __init__.py
│       │   │   ├── claims.py      ← POST /claims/extract
│       │   │   ├── sources.py     ← POST /sources/search
│       │   │   └── verdict.py     ← POST /verdict/analyze
│       │   ├── schemas/
│       │   │   ├── __init__.py
│       │   │   └── analysis.py    ← modelos Pydantic (contratos de datos)
│       │   └── services/
│       │       ├── __init__.py
│       │       ├── claim_extractor.py   ← spaCy NER + patrones léxicos
│       │       ├── source_searcher.py   ← Wikipedia API + GNews + embeddings
│       │       └── verdict_analyzer.py  ← LangChain + Groq LLM
│       ├── requirements.txt
│       ├── Dockerfile
│       └── .env
├── docker-compose.yml             ← PostgreSQL + Redis
├── package.json                   ← monorepo workspaces
├── .env                           ← variables globales
└── .gitignore
```

---

## Variables de entorno (.env raíz)

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=truthnet
DB_PASSWORD=truthnet_secret
DB_NAME=truthnet_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# NestJS
API_PORT=3001
NODE_ENV=development

# JWT — generados con: node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_EXPIRES_IN=30d

# Python microservice
ANALYZER_URL=http://localhost:8000
```

```env
# services/analyzer/.env
GROQ_API_KEY=gsk_xxxxxxxxxxxx
ANALYZER_PORT=8000
```

---

## Base de datos — tablas actuales

### Tabla: users
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | generado automáticamente |
| email | varchar(100) | unique |
| name | varchar(50) | |
| password | varchar | select:false + @Exclude() — nunca viaja en responses |
| hashedRefreshToken | varchar nullable | hash bcrypt del refresh token activo |
| resetPasswordToken | varchar nullable | para "olvidé mi contraseña" (futuro) |
| resetPasswordExpires | timestamp nullable | expiración del token de reset |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Tabla: analyses
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | → users.id, CASCADE DELETE |
| input | text | texto original enviado por el usuario |
| status | enum | PENDING, EXTRACTING, SCRAPING, ANALYZING, SCORING, DONE, FAILED |
| result | jsonb nullable | resultado completo cuando status=DONE |
| errorMessage | text nullable | mensaje de error cuando status=FAILED |
| createdAt | timestamp | |
| updatedAt | timestamp | |

---

## API Endpoints NestJS (prefijo: /api/v1)

### Auth
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | /auth/register | No | Registra usuario, devuelve tokens |
| POST | /auth/login | No | Login, devuelve tokens |
| POST | /auth/refresh | Bearer refresh token | Renueva access token |
| POST | /auth/logout | Bearer access token | Revoca refresh token en BD |

### Analysis
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | /analysis | Bearer access token | Crea análisis, encola job |
| GET | /analysis | Bearer access token | Lista análisis del usuario |
| GET | /analysis/:id | Bearer access token | Detalle de un análisis |
| GET (SSE) | /analysis/:id/stream | Bearer access token | Stream de progreso en tiempo real |

---

## API Endpoints Python FastAPI (puerto 8000)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /health | Health check — verifica que spaCy está cargado |
| POST | /claims/extract | Extrae claims verificables del texto con spaCy |
| POST | /sources/search | Busca fuentes en Wikipedia + GNews, rankea con embeddings |
| POST | /verdict/analyze | LLM evalúa cada claim contra sus fuentes (Groq) |

Documentación interactiva disponible en: http://localhost:8000/docs

---

## Flujo completo de un análisis

```
Usuario → POST /analysis (NestJS)
           │
           ├─ Crea registro en BD con status=PENDING
           ├─ Encola job en Bull (Redis) con { analysisId, input }
           └─ Responde { analysisId, status: "PENDING" }

Usuario → GET /analysis/:id/stream (SSE abierto)
           │
           └─ Replay inmediato del estado actual desde BD
              Luego escucha eventos en tiempo real

Bull Queue → AnalysisProcessor.handleAnalysis()
           │
           ├─ EXTRACTING → POST http://localhost:8000/claims/extract
           │                spaCy extrae claims + calcula sesgo lingüístico
           │
           ├─ SCRAPING   → POST http://localhost:8000/sources/search
           │                Wikipedia API + GNews + ranking por embeddings
           │
           ├─ ANALYZING  → POST http://localhost:8000/verdict/analyze
           │                LangChain + Groq LLM evalúa cada claim vs fuentes
           │
           ├─ SCORING    → Cálculo del score general (promedio ponderado)
           │
           └─ DONE       → Guarda result (jsonb) en BD
                           Emite evento final por SSE con el resultado completo
```

Cada paso emite un evento por SSE usando EventEmitter2 interno de NestJS:
`Processor → EventEmitter2 → AnalysisController → Subject RxJS → SSE → Cliente`

---

## Seguridad implementada

- **Helmet**: cabeceras HTTP de seguridad automáticas
- **CORS**: solo permite el frontend en localhost:3000
- **ValidationPipe global**: whitelist:true elimina campos no declarados en DTOs
- **ClassSerializerInterceptor**: @Exclude() en entidades impide filtración de datos sensibles
- **bcrypt (12 rondas)**: hash de contraseñas con @BeforeInsert/@BeforeUpdate
- **JWT dual**: access token (7d) + refresh token (30d) con secretos diferentes
- **Refresh token en BD**: logout real — el token se invalida en BD, no solo en cliente
- **getOrThrow**: falla al arrancar si falta JWT_SECRET o JWT_REFRESH_SECRET
- **ThrottlerGuard global**: 100 requests/min por IP → HTTP 429 si se supera
- **UUID como PK**: imposible enumerar recursos (/users/1, /users/2...)
- **select:false en password**: nunca sale de BD sin pedirlo explícitamente
- **Error message uniformity**: mismo mensaje para email/password incorrectos

---

## Estado actual del proyecto

### ✅ Completado
- Fase 1: NestJS completo — auth (register/login/refresh/logout), módulo analysis con Bull Queue y SSE
- Fase 2: Python FastAPI completo — claim extractor (spaCy), source searcher (Wikipedia+GNews+embeddings), verdict analyzer (LangChain+Groq)
- Tests E2E auth: 9 tests pasando (register, login, refresh, logout, rate limiting, token revocado)
- Docker Compose: PostgreSQL + Redis

### 🔧 En progreso
- Ajuste del claim extractor: el modelo es_core_news_md de spaCy a veces no detecta entidades numéricas. Fix aplicado: patrones léxicos como fallback cuando spaCy no encuentra entidades
- Ajuste del source searcher: DuckDuckGo bloqueaba requests. Migrado a Wikipedia API + GNews

### ⏳ Pendiente
- Fase 3: Conectar y validar el pipeline Python completo end-to-end con datos reales
- Fase 4: Frontend Next.js — App Router, consumir SSE en tiempo real, árbol interactivo de claims

---

## Decisiones de arquitectura importantes

**¿Por qué monorepo?**
Un solo repo para apps/api, apps/web y services/analyzer. Un docker-compose levanta todo.
Los tipos compartidos entre NestJS y Next.js irán en packages/types/ (Fase 4).

**¿Por qué Bull Queue en lugar de procesar directo?**
Si la app cae durante un análisis, Bull reencola el job automáticamente (attempts:3).
Sin cola, el usuario perdería el resultado sin explicación.

**¿Por qué SSE en lugar de polling?**
Polling = el cliente pregunta cada N segundos "¿terminaste?". SSE = el servidor avisa
cuando hay algo nuevo. SSE es más eficiente y la UI se actualiza instantáneamente.

**¿Por qué SSE en lugar de WebSockets?**
El análisis es unidireccional — el servidor empuja progreso, el cliente no necesita
responder. SSE es más simple, funciona sobre HTTP normal y es suficiente para este caso.

**¿Por qué el refresh token se guarda en BD?**
Sin esto el logout no existe realmente — el token seguiría siendo válido hasta expirar.
Guardando el hash en BD, al hacer logout se borra y cualquier uso posterior del token
falla aunque sea criptográficamente válido.

**¿Por qué Python separado de NestJS?**
spaCy, sentence-transformers y LangChain son librerías del ecosistema Python/ML.
Intentar usarlas desde Node.js sería artificial. Python es el lenguaje natural para ML.
NestJS es el orquestador, Python es el cerebro analítico.

**¿Por qué Groq en lugar de OpenAI?**
Groq es gratuito para desarrollo, extremadamente rápido (tokens/seg muy altos),
y LangChain abstrae el proveedor — cambiar a OpenAI o Anthropic es una línea de código.

---

## Cómo arrancar el proyecto

```bash
# 1. Infraestructura
docker-compose up -d

# 2. NestJS
cd apps/api
npm install
npm run start:dev

# 3. Python
cd services/analyzer
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download es_core_news_md
uvicorn app.main:app --reload --port 8000
```

### Verificar que todo está vivo
```bash
curl http://localhost:8000/health
# → {"status":"ok","model_loaded":true}

curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"x@x.com","password":"wrong"}'
# → 401 (confirma que NestJS responde)
```

---

## Próximos pasos (Fase 4 — Next.js)

- App Router con rutas: `/` (landing), `/dashboard` (historial), `/analysis/:id` (resultado)
- Autenticación: interceptar requests con middleware, redirigir si no hay token
- Consumir SSE: `EventSource` nativo del browser para el stream de progreso
- Árbol interactivo de claims: cada claim expandible con sus fuentes y veredicto
- Indicador visual de confianza: barra de score con color según nivel (rojo/amarillo/verde)
- Historial de análisis del usuario con filtros por veredicto y fecha