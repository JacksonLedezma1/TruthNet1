# TruthNet Backend API

API REST construida con NestJS que orquesta el sistema de verificación de desinformación TruthNet.

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        TruthNet System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐        HTTP/SSE         ┌──────────────────┐  │
│  │   Frontend   │ ◄────────────────────► │   NestJS API     │  │
│  │   (Next.js)  │      Puerto 3001        │   (Puerto 3001)  │  │
│  └──────────────┘                       └────────┬─────────┘  │
│                                                    │             │
│                           ┌──────────────────────┘             │
│                           │ HTTP (Interno)                      │
│                           ▼                                     │
│                  ┌──────────────────┐                         │
│                  │  Python Analyzer   │                         │
│                  │   (Puerto 3002)  │                         │
│                  └──────────────────┘                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │  PostgreSQL  │  │    Redis     │  │      Bull        │       │
│  │   (Datos)    │  │    (Queue)   │  │    (Jobs)        │       │
│  └──────────────┘  └──────────────┘  └──────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Responsabilidades del Backend

El backend NestJS actúa exclusivamente como **orquestador**. No realiza análisis NLP directamente:

1. **Recibe** el texto del usuario
2. **Autentica** y autoriza la petición
3. **Encola** un job en Bull/Redis para procesamiento asíncrono
4. **Llama** al microservicio Python paso por paso
5. **Stream** de progreso al frontend vía Server-Sent Events (SSE)
6. **Persiste** resultados en PostgreSQL

## Módulos

### 1. Auth (`src/auth/`)

Autenticación y autorización JWT.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/auth/register` | POST | Registro de usuarios |
| `/auth/login` | POST | Login, retorna Access + Refresh tokens |
| `/auth/refresh` | POST | Renovación de Access Token |
| `/auth/logout` | POST | Invalida tokens del usuario |

**Seguridad:**
- Passwords hasheados con bcrypt
- JWT Access Token (15 min)
- JWT Refresh Token (7 días)
- Guards protegen todas las rutas privadas

### 2. Users (`src/users/`)

Gestión de usuarios y perfiles.

- Entidad: `User` (id, email, password, createdAt)
- Relación: One-to-Many con Analysis
- Cascade delete: borrar usuario borra sus análisis

### 3. Analysis (`src/analysis/`)

Módulo principal del sistema. Orquesta el pipeline de verificación.

#### Estados del Análisis

```
PENDING ──► EXTRACTING ──► SCRAPING ──► ANALYZING ──► SCORING ──► DONE
   │                                                            │
   └──────────────────────────── FAILED ──────────────────────────┘
```

| Estado | Descripción | % Progreso |
|--------|-------------|------------|
| `PENDING` | En cola esperando | 0% |
| `EXTRACTING` | Python extrae claims | 20% |
| `SCRAPING` | Python busca fuentes | 45% |
| `ANALYZING` | LLM evalúa evidencia | 70% |
| `SCORING` | Calcula scores | 90% |
| `DONE` | Completado | 100% |
| `FAILED` | Error en pipeline | - |

#### API Endpoints

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/analysis` | POST | JWT | Crea nuevo análisis |
| `/analysis` | GET | JWT | Lista análisis del usuario |
| `/analysis/:id` | GET | JWT | Detalle de un análisis |
| `/analysis/:id/stream` | SSE | JWT | Stream de progreso en tiempo real |

#### Ejemplo: Crear Análisis

```bash
POST /api/v1/analysis
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "input": "El gobierno anunció que la economía creció 5% este año según datos del banco central."
}

Response:
{
  "message": "Análisis iniciado",
  "analysisId": "uuid-v4",
  "status": "PENDING"
}
```

#### Ejemplo: Stream SSE (Server-Sent Events)

```javascript
const eventSource = new EventSource(
  '/api/v1/analysis/uuid/stream',
  { headers: { Authorization: 'Bearer token' } }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.status);  // EXTRACTING, SCRAPING, etc.
  console.log(data.message); // "Extrayendo afirmaciones..."
  console.log(data.data);    // Datos parciales si existen
};
```

Eventos enviados:

```json
{
  "type": "analysis.status",
  "data": {
    "analysisId": "uuid",
    "status": "EXTRACTING",
    "message": "Extrayendo afirmaciones del texto...",
    "data": null,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Arquitectura del Módulo Analysis

```
AnalysisController ──► AnalysisService ──► Bull Queue ──► AnalysisProcessor
       │                       │                              │
       │                       ▼                              ▼
   SSE Stream          PostgreSQL                     AnalyzerClient
                                                            │
                                                            ▼
                                                    Python Microservice
```

**Componentes:**

1. **AnalysisController**: HTTP endpoints + SSE streaming
2. **AnalysisService**: CRUD + encolamiento de jobs
3. **AnalysisProcessor**: Worker que procesa jobs de Bull
4. **AnalyzerClientService**: Cliente HTTP para Python

## Pipeline de Verificación

El processor ejecuta 4 pasos llamando al microservicio Python:

```typescript
// Paso 1: EXTRACTING (20%)
const { claims, biasScore } = await analyzerClient.extractClaims(input);

// Paso 2: SCRAPING (45%)
const { sourcesByClaim } = await analyzerClient.searchSources(claims);

// Paso 3: ANALYZING (70%)
const verdict = await analyzerClient.analyzeVerdict(input, claims, sourcesByClaim);

// Paso 4: SCORING (90%)
// Ensamblar resultado final y guardar en BD

// DONE (100%)
```

## Base de Datos

### Entidades

```
┌─────────────────┐       ┌──────────────────┐
│     users       │       │     analyses     │
├─────────────────┤       ├──────────────────┤
│ id (UUID)  PK   │──┐    │ id (UUID)   PK   │
│ email           │  │    │ user_id     FK   │
│ password_hash   │  │    │ input (text)     │
│ created_at      │  │    │ status (enum)    │
│ updated_at      │  │    │ result (jsonb)   │
└─────────────────┘  │    │ error_message    │
                     │    │ created_at       │
                     └───►│ updated_at       │
                          └──────────────────┘
```

### PostgreSQL Features Usados

- **UUID**: IDs de usuario y análisis
- **JSONB**: Almacenamiento flexible de resultados
- **ENUM**: Estados del análisis tipados
- **Foreign Keys**: Relación user-analyses con cascade delete

## Configuración

### Variables de Entorno (`.env`)

```bash
# API
API_PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=truthnet
DB_PASSWORD=password
DB_NAME=truthnet

# Redis (Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Python Analyzer
ANALYZER_URL=http://localhost:3002

# Groq (passthrough para Python)
GROQ_API_KEY=gsk_xxx
```

## Instalación y Desarrollo

### Requisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Python Analyzer corriendo (puerto 3002)

### Setup

```bash
# 1. Instalar dependencias
cd apps/api
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Ejecutar migraciones (si aplica)
npx typeorm migration:run

# 4. Iniciar en modo desarrollo
npm run start:dev
```

### Docker Compose (todo el stack)

```bash
# Desde la raíz del proyecto
docker-compose up

# Esto levanta:
# - PostgreSQL (5432)
# - Redis (6379)
# - Analyzer (3002)
# - API (3001)
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Estructura de Carpetas

```
apps/api/
├── src/
│   ├── analysis/
│   │   ├── DTO/
│   │   │   └── create-analysis.dto.ts
│   │   ├── events/
│   │   │   └── analysis-status.event.ts
│   │   ├── analysis.controller.ts      # HTTP + SSE endpoints
│   │   ├── analysis.service.ts         # CRUD + Bull jobs
│   │   ├── analysis.processor.ts       # Worker de procesamiento
│   │   ├── analyzer-client.service.ts    # Cliente HTTP Python
│   │   ├── analysis.entity.ts          # Entidad TypeORM
│   │   └── analysis.module.ts
│   ├── auth/
│   │   ├── DTO/
│   │   │   └── login.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── jwt-refresh-auth.guard.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/
│   │   ├── users.entity.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── app.config.ts                   # Config namespaces
│   ├── app.module.ts                   # Root module
│   └── main.ts                         # Entry point
├── test/                               # E2E tests
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Decisiones de Diseño

### ¿Por qué Bull + Redis para Jobs?

- **Desacoplamiento**: El análisis puede tardar minutos, no bloqueamos HTTP
- **Retries automáticos**: Si falla, Bull reintenta con backoff exponencial
- **Escalabilidad**: Podemos tener múltiples workers en diferentes máquinas
- **Persistencia**: Los jobs sobreviven reinicios del servidor

### ¿Por qué SSE en lugar de WebSockets?

- **Unidireccionalidad**: Solo servidor → cliente (progreso), no necesitamos cliente → servidor
- **HTTP simple**: No requiere protocolo upgrade, funciona con proxies estándar
- **Reconexión automática**: El navegador maneja reconexiones nativamente
- **Menos complejidad**: No necesitamos manejar rooms, sockets, etc.

### ¿Por qué TypeORM?

- **Integración NestJS**: Decoradores nativos (`@Entity`, `@Column`)
- **TypeScript first**: Tipado completo de entidades y queries
- **Migrations**: Control de schema versionado
- **QueryBuilder**: SQL complejo tipado
- **Relaciones**: ManyToOne, OneToMany manejadas automáticamente

### ¿Por qué separar Python en microservicio?

- **Ecosistema**: NLP/ML es superior en Python (spaCy, transformers, FAISS)
- **Escalabilidad**: Podemos escalar Python independientemente de NestJS
- **Resiliencia**: Si Python falla, NestJS sigue funcionando para auth/users
- **Desarrollo paralelo**: Equipos pueden trabajar en cada servicio independientemente

## API Reference Completa

### Autenticación

Todas las rutas protegidas requieren header:

```
Authorization: Bearer <access_token>
```

### Endpoints Públicos

| Método | Ruta | Body | Response |
|--------|------|------|----------|
| POST | `/api/v1/auth/register` | `{email, password}` | `{message, accessToken, refreshToken}` |
| POST | `/api/v1/auth/login` | `{email, password}` | `{message, accessToken, refreshToken}` |

### Endpoints Protegidos (requieren JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/refresh` | Renueva Access Token |
| POST | `/api/v1/auth/logout` | Cierra sesión |
| GET | `/api/v1/analysis` | Lista análisis del usuario |
| POST | `/api/v1/analysis` | Crea nuevo análisis |
| GET | `/api/v1/analysis/:id` | Detalle de análisis |
| SSE | `/api/v1/analysis/:id/stream` | Stream de progreso |

## Seguridad

### Implementaciones de Seguridad

- **Helmet**: Headers HTTP de seguridad (CSP, HSTS, X-Frame-Options)
- **CORS**: Solo orígenes permitidos
- **Throttler**: Rate limiting (100 req/min por IP)
- **ValidationPipe**: Whitelist + transform automático
- **ClassSerializerInterceptor**: Exclusión automática de campos sensibles (@Exclude)
- **bcrypt**: Hash de passwords (salt rounds: 10)
- **JWT**: Tokens firmados con secreto, expiración corta

### Headers de Seguridad (Helmet)

```
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=15552000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## Troubleshooting

### El análisis se queda en PENDING

1. Verificar que Redis está corriendo: `redis-cli ping`
2. Verificar que el Processor está registrado: revisar logs de NestJS
3. Revisar dashboard de Bull: `npm run bull-board` (si configurado)

### Error conectando a Python

```
El microservicio de análisis falló: ...
```

1. Verificar que Python Analyzer está en puerto 3002
2. Verificar `ANALYZER_URL` en `.env`
3. Probar health check: `curl http://localhost:3002/health`

### Error de CORS en desarrollo

Asegúrate de que `FRONTEND_URL` en `.env` coincida exactamente con la URL del frontend (incluyendo puerto).

## Roadmap

- [ ] Dashboard de Bull para monitoreo de jobs
- [ ] Webhooks para notificaciones externas
- [ ] Caché de análisis con Redis
- [ ] Batch processing (múltiples textos)
- [ ] Exportar resultados (PDF, CSV)

## Documentación Relacionada

- [Analyzer Service](../../services/analyzer/README.md) - Microservicio Python
- [Frontend](../web/README.md) - Aplicación Next.js
- [CLAUDE.md](../../CLAUDE.md) - Contexto del proyecto

## Licencia

MIT License - Ver [LICENSE](../../LICENSE)
