# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TruthNet is a fact-checking platform with a monorepo structure containing:
- **`apps/api`** - NestJS API (authentication, analysis orchestration, REST endpoints)
- **`services/analyzer`** - Python FastAPI microservice (NLP/LLM processing)

## Common Commands

```bash
# Start development servers
npm run api              # Start NestJS API in watch mode (from root)
cd apps/api && npm run start:dev  # Same, from api directory
cd services/analyzer && ./dev.sh  # Start Python service with auto-reload

# Run tests
cd apps/api && npm run test        # Unit tests
cd apps/api && npm run test:e2e    # E2E tests (requires PostgreSQL and Redis)
cd apps/api && npm run test:cov    # Coverage report

# Linting & formatting
cd apps/api && npm run lint        # ESLint with auto-fix
cd apps/api && npm run format      # Prettier

# Build for production
cd apps/api && npm run build
cd apps/api && npm run start:prod
cd services/analyzer && docker build -t truthnet-analyzer .
```

## Environment Setup

Copy `.env.example` to `.env` in the repository root. Required variables:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL
- `REDIS_HOST`, `REDIS_PORT` - Redis for Bull queues
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - Auth tokens
- `API_PORT`, `NODE_ENV`, `FRONTEND_URL`
- `ANALYZER_URL` - Python microservice URL (defaults to `http://localhost:8000`)

Start infrastructure with Docker Compose:
```bash
docker-compose up -d  # Starts PostgreSQL and Redis
```

## Architecture

### NestJS API (`apps/api`)

**Entry point**: `src/main.ts`
- Global prefix: `/api/v1`
- Helmet for security headers
- CORS enabled for frontend URL
- ValidationPipe with whitelist/transform
- ClassSerializerInterceptor for `@Exclude()` fields

**Modules**:
- `AuthModule` - JWT authentication with access + refresh tokens, Passport strategies
- `UsersModule` - User entity with bcrypt password hashing
- `AnalysisModule` - Bull queue processing with real-time SSE updates

**Analysis Pipeline** (async job processing):
1. Controller creates `Analysis` entity with `PENDING` status, adds job to Bull queue
2. `AnalysisProcessor` processes the job through 5 stages:
   - `EXTRACTING` - Python extracts claims from text
   - `SCRAPING` - Python searches for cross-sources
   - `ANALYZING` - LLM evaluates claims against sources
   - `SCORING` - Final confidence score calculated
   - `DONE` - Results stored in PostgreSQL
3. Status updates broadcast via EventEmitter2 to SSE streams

**Real-time updates**: Clients connect to `GET /api/v1/analysis/:id/stream` (SSE endpoint). Controller maintains a `Map<analysisId, Subject<MessageEvent>>` to push updates to connected clients.

**Auth flow**:
- `POST /auth/register` and `/auth/login` return both `accessToken` and `refreshToken`
- Refresh tokens are hashed and stored in `users.hashedRefreshToken`
- `JwtAuthGuard` protects routes; refresh endpoint validates stored hash

### Python Analyzer Service (`services/analyzer`)

FastAPI microservice providing:
- `POST /claims/extract` - Extract verifiable claims from text (spaCy NER)
- `POST /sources/search` - Search cross-reference sources
- `POST /verdict/analyze` - LLM-based verdict generation

**Architecture**:
- **spaCy** (`es_core_news_md`) - NER and sentence tokenization for claim extraction
- **sentence-transformers** - Semantic similarity for source ranking
- **LangChain + Groq** - LLM integration for verdict analysis (llama-3.3-70b-versatile)
- **DuckDuckGo HTML scraping** - Source search (no API key required)

**Startup flow**:
1. Load spaCy model (Spanish)
2. Load sentence-transformers model (paraphrase-multilingual-MiniLM-L12-v2)
3. Both models stored in `app.state` for request access

**Environment variables**:
- `GROQ_API_KEY` - Required for LLM verdict analysis

**Development commands**:
```bash
# Start with auto-reload
cd services/analyzer && ./dev.sh

# Or manually:
cd services/analyzer
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Run with Docker
docker build -t truthnet-analyzer .
docker run -p 8000:8000 --env-file .env truthnet-analyzer
```

**Key files**:
- `app/main.py` - FastAPI entry point with lifespan model loading
- `app/services/claim_extractor.py` - spaCy-based claim extraction with heuristics
- `app/services/source_searcher.py` - DuckDuckGo scraping + semantic ranking
- `app/services/verdict_analyzer.py` - LangChain/Groq LLM integration
- `app/schemas/analysis.py` - Pydantic models for API contracts

The NestJS `AnalyzerClientService` wraps these HTTP calls with error handling and logging.

### Database

PostgreSQL with TypeORM:
- Entities in `*.entity.ts` files
- `autoLoadEntities: true` - no manual entity registration needed
- `synchronize: true` in development (auto-migration)
- UUID primary keys for security (non-sequential)

### Job Queue

Bull (Redis-backed):
- Queue name: `'analysis'`
- Jobs configured with exponential backoff: 3 attempts, 2s initial delay
- `removeOnComplete: true`, `removeOnFail: false`

## Code Conventions

- Configuration uses namespaced `registerAs()` pattern (e.g., `config.get('database.host')`)
- Entities use `@Exclude()` from `class-transformer` for sensitive fields (passwords, tokens)
- DTOs use `class-validator` decorators; ValidationPipe validates automatically
- Comments in Spanish explain architectural decisions in key files
- E2E tests replicate `main.ts` configuration (global prefix, pipes, interceptors)

## Key Files

| Path | Purpose |
|------|---------|
| `apps/api/src/app.module.ts` | Module composition, Bull/TypeORM/Config setup |
| `apps/api/src/app.config.ts` | Namespaced environment configuration |
| `apps/api/src/analysis/analysis.processor.ts` | Job processing pipeline |
| `apps/api/src/analysis/analysis.controller.ts` | REST endpoints + SSE stream |
| `apps/api/src/analysis/analyzer-client.service.ts` | HTTP client to Python service |
| `apps/api/src/users/users.entity.ts` | User model with password hashing hooks |
| `services/analyzer/app/main.py` | FastAPI entry point with lifespan |
| `services/analyzer/app/services/claim_extractor.py` | spaCy claim extraction |
| `services/analyzer/app/services/source_searcher.py` | DuckDuckGo + semantic ranking |
| `services/analyzer/app/services/verdict_analyzer.py` | Groq LLM verdict analysis |
| `services/analyzer/app/schemas/analysis.py` | Pydantic API models |