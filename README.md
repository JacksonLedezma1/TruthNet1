# TruthNet

**TruthNet es una plataforma de verificación de hechos que combina un frontend React, un backend NestJS y un microservicio Python para análisis de texto, búsqueda de fuentes y veredictos basados en IA.**

## Arquitectura general

- `apps/web` — Frontend React + Vite
- `apps/api` — Backend NestJS + TypeORM + Bull + JWT
- `services/analyzer` — Microservicio FastAPI Python para NLP, scraping y LLM
- `docker-compose.yml` — PostgreSQL y Redis para desarrollo local

## Resumen del flujo

1. El usuario envía un texto en la interfaz web.
2. El frontend pide al backend NestJS crear un análisis y encola un job.
3. El worker de Bull procesa el job y coordina las llamadas al microservicio Python.
4. El microservicio extrae claims, busca fuentes relevantes y genera un veredicto con Groq.
5. El backend persiste el resultado y lo notifica en tiempo real al frontend mediante SSE.

## Componentes principales

- **Frontend**: UI responsiva con React, Tailwind CSS y TanStack Query.
- **Backend**: API REST, autenticación JWT, procesamiento de colas y streaming de estado.
- **Analyzer**: NLP, scraping web y LLM para verificar afirmaciones.
- **Base de datos**: PostgreSQL para usuarios y resultados.
- **Cola**: Redis + Bull para jobs asíncronos.

## Instrucciones rápidas

### 1. Levantar dependencias

```bash
docker-compose up -d
```

### 2. Iniciar el backend

```bash
npm run api
```

Esto ejecuta `apps/api` en modo desarrollo.

### 3. Iniciar el frontend

```bash
npm run web
```

Esto ejecuta `apps/web` en modo desarrollo en `http://localhost:8080`.

### 4. Iniciar el microservicio de análisis

```bash
cd services/analyzer
./dev.sh
```

## Estructura del repositorio

```
TruthNet/
├── apps/
│   ├── api/                # Backend NestJS
│   └── web/                # Frontend React + Vite
├── services/
│   └── analyzer/           # Microservicio FastAPI Python
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

## Documentación actualizada

- `apps/api/README.md` — Documentación del backend NestJS.
- `apps/web/README.md` — Documentación del frontend React.
- `services/analyzer/README.md` — Documentación del microservicio Python.

## Archivos eliminados

- `claude.md` — Documentación obsoleta reemplazada por los READMEs actualizados.

## Variables de entorno importantes

### Raíz (`.env.example`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=truthnet
DB_PASSWORD=truthnet_secret
DB_NAME=truthnet_db
REDIS_HOST=localhost
REDIS_PORT=6379
API_PORT=3001
NODE_ENV=development
JWT_SECRET=cambia_esto_por_un_secreto_seguro
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=cambia_esto_tambien
JWT_REFRESH_EXPIRES_IN=30d
```

### Microservicio `services/analyzer` (`.env.example`)

```env
GROQ_API_KEY=tu_api_key_aqui
PORT=8000
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3001
```

## Notas

- El frontend se ejecuta en `http://localhost:8080`.
- El backend NestJS corre en `http://localhost:3001`.
- El analyzer Python corre en `http://localhost:8000`.
- El servicio de análisis usa Groq con `llama-3.3-70b-versatile`.
- `apps/api` y `apps/web` forman un monorepo Node.js con workspaces.
