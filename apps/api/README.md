# TruthNet Backend API

API REST construida con NestJS que orquesta la verificación de hechos de TruthNet.

## Arquitectura

- **Frontend**: `apps/web` — React + Vite en `http://localhost:8080`
- **API**: `apps/api` — NestJS en `http://localhost:3001`
- **Analyzer**: `services/analyzer` — FastAPI en `http://localhost:8000`
- **Redis**: Cola de jobs Bull en `localhost:6379`
- **PostgreSQL**: Persistencia en `localhost:5432`

## Propósito

El backend no realiza análisis NLP directamente. Su responsabilidad es:

- validar y autenticar usuarios
- crear y listar análisis en PostgreSQL
- encolar trabajo en Bull/Redis
- llamar al microservicio Python para cada etapa del pipeline
- enviar actualizaciones en tiempo real al frontend mediante SSE

## Endpoints principales

### Auth

- `POST /api/v1/auth/register` — crear usuario y devolver tokens
- `POST /api/v1/auth/login` — iniciar sesión y devolver tokens
- `POST /api/v1/auth/refresh` — renovar access token
- `POST /api/v1/auth/logout` — cerrar sesión

### Analysis

- `POST /api/v1/analysis` — crear nuevo análisis y encolar job
- `GET /api/v1/analysis` — listar análisis del usuario
- `GET /api/v1/analysis/:id` — detalle de un análisis
- `GET /api/v1/analysis/:id/stream` — stream SSE de estado

## Estado del proyecto

- Autenticación JWT con refresh tokens
- Pipeline asíncrono con Bull/Redis
- SSE para actualizaciones en tiempo real
- Persistencia en PostgreSQL con TypeORM
- Integración con microservicio Python

## Variables de entorno claves

Copiar `.env.example` a `.env` y ajustar valores.

- `API_PORT=3001`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- `ANALYZER_URL=http://localhost:8000`

## Ejecución

```bash
cd apps/api
npm install
cp .env.example .env
npm run start:dev
```

## Scripts útiles

- `npm run start:dev` — servidor en modo desarrollo
- `npm run start:prod` — servidor preparado para producción
- `npm run build` — build del backend
- `npm run lint` — ESLint
- `npm run test` — Jest
- `npm run test:e2e` — pruebas end-to-end

## Notas de implementación

- `src/app.module.ts` configura TypeORM, Bull, Config y EventEmitter
- `src/auth` maneja JWT, Passport y refresh tokens
- `src/users` gestiona entidad `User` y relaciones con análisis
- `src/analysis` orquesta el pipeline de verificación
- `src/analysis/analysis.processor.ts` es el worker que llama al analyzer
- `src/analysis/analyzer-client.service.ts` abstrae las llamadas HTTP al microservicio Python
