# TruthNet

**Plataforma de verificación de hechos y detección de desinformación.**

TruthNet es un sistema que analiza textos para identificar afirmaciones verificables, buscar fuentes cruzadas y evaluar su veracidad mediante procesamiento de lenguaje natural y modelos de lenguaje.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TruthNet Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         HTTP/REST         ┌──────────────────┐             │
│  │   Frontend   │ ◄────────────────────► │   NestJS API     │             │
│  │   (Next.js)  │      Puerto 3000         │   Puerto 3001    │             │
│  │              │         (TBD)             │                  │             │
│  └──────────────┘                          └────────┬─────────┘             │
│                                                      │                        │
│                           ┌──────────────────────────┤                        │
│                           │                          │                        │
│                           │ HTTP (Interno)          │                        │
│                           ▼                          ▼                        │
│                  ┌──────────────────┐      ┌──────────────────┐              │
│                  │ Python Analyzer   │      │     Redis        │              │
│                  │   Puerto 8000    │      │   Bull Queue     │              │
│                  │   (FastAPI)      │      │   Puerto 6379    │              │
│                  └──────────────────┘      └──────────────────┘              │
│                           │                          ▲                        │
│                           │                          │                        │
│                           ▼                          │                        │
│                  ┌──────────────────┐               │                        │
│                  │    Groq LLM      │               │                        │
│                  │  (llama-3.3-70b) │               │                        │
│                  └──────────────────┘               │                        │
│                                                      │                        │
│                           ┌──────────────────────────┘                        │
│                           ▼                                                  │
│                  ┌──────────────────┐                                        │
│                  │   PostgreSQL     │                                        │
│                  │   Puerto 5432     │                                        │
│                  └──────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Procesamiento

```
Usuario envía texto
        │
        ▼
┌─────────────────┐
│   NestJS API    │ ◄── Autenticación JWT
│  (Orquestador)  │
└────────┬────────┘
         │
         ▼ Crea job en Bull Queue
┌─────────────────┐
│  Bull Processor │
│   (Worker)      │
└────────┬────────┘
         │
         ▼ Paso 1: EXTRACTING (20%)
┌─────────────────┐
│ Python Analyzer │ ◄── spaCy NER + Heurísticas
│ claim_extractor │      Extrae afirmaciones verificables
└────────┬────────┘
         │
         ▼ Paso 2: SCRAPING (45%)
┌─────────────────┐
│ Python Analyzer │ ◄── DuckDuckGo + Embeddings
│ source_searcher │      Busca fuentes relevantes
└────────┬────────┘
         │
         ▼ Paso 3: ANALYZING (70%)
┌─────────────────┐
│ Python Analyzer │ ◄── Groq LLM (llama-3.3-70b)
│ verdict_analyzer│      Evalúa evidencia
└────────┬────────┘
         │
         ▼ Paso 4: SCORING (90%)
┌─────────────────┐
│   Cálculo de    │ ◄── Agrega scores
│   Confianza     │      Genera resumen
└────────┬────────┘
         │
         ▼ DONE (100%)
┌─────────────────┐
│   PostgreSQL    │ ◄── Persiste resultado
│   (Database)    │
└─────────────────┘
```

## Tecnologías

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **API Backend** | NestJS + TypeScript | Orquestación, autenticación, REST API |
| **Procesamiento NLP** | Python + FastAPI | Análisis de texto, extracción de claims |
| **Modelos de Lenguaje** | spaCy + sentence-transformers + Groq | NER, embeddings, verificación |
| **Base de Datos** | PostgreSQL + TypeORM | Persistencia de usuarios y análisis |
| **Cola de Tareas** | Redis + Bull | Procesamiento asíncrono |
| **Tiempo Real** | Server-Sent Events (SSE) | Actualizaciones de progreso |

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Cuenta de Groq (API Key gratuita)

### 1. Configuración de Infraestructura

```bash
# Clonar el repositorio
git clone <repo-url>
cd TruthNet

# Iniciar PostgreSQL y Redis con Docker
docker-compose up -d
```

### 2. Configurar API NestJS

```bash
# Desde la raíz del proyecto
cd apps/api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar en modo desarrollo
npm run start:dev
```

### 3. Configurar Analyzer Python

```bash
# Desde la raíz del proyecto
cd services/analyzer

# Crear entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Descargar modelo de spaCy
python -m spacy download es_core_news_md

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar GROQ_API_KEY

# Iniciar servidor
./dev.sh
# O manualmente:
# uvicorn app.main:app --reload --port 8000
```

### 4. Verificar que todo funciona

```bash
# Health check de la API
curl http://localhost:3001/api/v1/health

# Health check del Analyzer
curl http://localhost:8000/health
```

## Estructura del Proyecto

```
TruthNet/
├── apps/
│   └── api/                    # NestJS Backend
│       ├── src/
│       │   ├── analysis/       # Módulo de análisis (core)
│       │   ├── auth/           # Autenticación JWT
│       │   ├── users/          # Gestión de usuarios
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/               # E2E tests
│       ├── package.json
│       └── README.md
│
├── services/
│   └── analyzer/               # Python FastAPI Microservice
│       ├── app/
│       │   ├── main.py         # Entry point
│       │   ├── routers/        # API endpoints
│       │   ├── services/       # Lógica de negocio
│       │   └── schemas/        # Pydantic models
│       ├── requirements.txt
│       ├── Dockerfile
│       ├── dev.sh              # Script de desarrollo
│       └── README.md
│
├── docker-compose.yml          # PostgreSQL + Redis
├── CLAUDE.md                   # Contexto para Claude Code
└── README.md                  # Este archivo
```

## Variables de Entorno

### API NestJS (`apps/api/.env`)

```bash
# Servidor
API_PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=truthnet
DB_PASSWORD=password
DB_NAME=truthnet

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_REFRESH_SECRET=otro_secreto_refresh

# Python Analyzer
ANALYZER_URL=http://localhost:8000
```

### Analyzer Python (`services/analyzer/.env`)

```bash
# API Key de Groq (requerida)
GROQ_API_KEY=gsk_tu_api_key_aqui

# Puerto del servidor
PORT=8000

# Nivel de logging
LOG_LEVEL=INFO

# CORS
ALLOWED_ORIGINS=http://localhost:3001
```

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Registrar nuevo usuario |
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/refresh` | Renovar access token |
| POST | `/api/v1/auth/logout` | Cerrar sesión |

### Análisis (requiere autenticación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/analysis` | Crear nuevo análisis |
| GET | `/api/v1/analysis` | Listar análisis del usuario |
| GET | `/api/v1/analysis/:id` | Obtener análisis por ID |
| GET | `/api/v1/analysis/:id/stream` | SSE: Stream de progreso |

### Analyzer Python (interno)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/claims/extract` | Extraer claims del texto |
| POST | `/sources/search` | Buscar fuentes para claims |
| POST | `/verdict/analyze` | Evaluar veredicto final |

## Desarrollo

### Comandos Útiles

```bash
# === NestJS API ===
cd apps/api

npm run start:dev      # Desarrollo con hot-reload
npm run test           # Tests unitarios
npm run test:e2e       # Tests E2E
npm run lint           # ESLint
npm run format         # Prettier

# === Python Analyzer ===
cd services/analyzer

./dev.sh               # Desarrollo con hot-reload
source .venv/bin/activate
uvicorn app.main:app --reload

# === Docker ===
docker-compose up -d              # Levantar infra
docker-compose down               # Detener
docker-compose logs -f postgres   # Ver logs
```

### Testing

```bash
# Tests de la API
cd apps/api
npm run test        # Unit tests
npm run test:e2e    # Integration tests

# Tests del Analyzer
cd services/analyzer
source .venv/bin/activate
python -m pytest    # (cuando existan tests)
```

## Documentación Adicional

- [**CLAUDE.md**](./CLAUDE.md) - Contexto detallado para Claude Code
- [**apps/api/README.md**](./apps/api/README.md) - Documentación del backend NestJS
- [**services/analyzer/README.md**](./services/analyzer/README.md) - Documentación del microservicio Python

## Estado del Proyecto

| Componente | Estado | Descripción |
|------------|--------|-------------|
| API NestJS | ✅ Completo | Auth, análisis, SSE, Bull queue |
| Analyzer Python | ✅ Completo | spaCy, embeddings, Groq LLM |
| Frontend Next.js | 🔄 Pendiente | UI para usuarios |
| Tests E2E | ✅ Parcial | Tests de autenticación |
| Docker | ✅ Básico | Dockerfile para analyzer |

## Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

---

**Desarrollado con ❤️ para combatir la desinformación.**