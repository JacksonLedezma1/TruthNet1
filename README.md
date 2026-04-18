# TruthNet

**Plataforma de verificación de hechos y detección de desinformación.**

TruthNet es un sistema integral que analiza textos para identificar afirmaciones verificables, buscar fuentes cruzadas y evaluar su veracidad mediante procesamiento de lenguaje natural y modelos de lenguaje de última generación.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TruthNet Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         HTTP/REST         ┌──────────────────┐             │
│  │   Frontend   │ ◄────────────────────► │   NestJS API     │             │
│  │ (React/Vite) │      Puerto 8080         │   Puerto 3001    │             │
│  │              │                         │                  │             │
│  └──────────────┘                         └────────┬─────────┘             │
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

1. **Usuario envía texto**: A través del dashboard en la web.
2. **NestJS API (Orquestador)**: Valida la sesión, persiste la solicitud en PostgreSQL y crea un job en Redis.
3. **Bull Processor (Worker)**: Recoge el job y coordina las llamadas al Analyzer.
4. **Paso 1: EXTRACTING**: El Analyzer extrae afirmaciones (claims) usando spaCy y heurísticas.
5. **Paso 2: SCRAPING**: Se buscan fuentes relacionadas en la web (DuckDuckGo Search).
6. **Paso 3: ANALYZING**: Un LLM (Groq/Llama-3) evalúa cada afirmación contra las fuentes encontradas.
7. **Paso 4: SCORING**: Se calcula la confianza final y se genera un resumen ejecutivo.
8. **DONE**: Los resultados se guardan y el usuario los ve en tiempo real vía Server-Sent Events (SSE).

## Tecnologías Principales

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Frontend** | React + Vite + Tailwind | Interfaz de usuario dinámica y responsiva |
| **Backend API** | NestJS + TypeScript | Orquestación, autenticación JWT, REST API |
| **NLP Microservice** | Python + FastAPI | Procesamiento de lenguaje natural, scraping |
| **IA / LLM** | spaCy + Groq (Llama-3) | NER, embeddings y razonamiento lógico |
| **Persistencia** | PostgreSQL + TypeORM | Almacenamiento de usuarios y resultados |
| **Cola / Tiempo Real** | Redis + Bull + SSE | Tareas asíncronas y updates en vivo |

## Estructura del Proyecto (Monorepo)

```
TruthNet/
├── apps/
│   ├── api/                    # NestJS Backend (Orquestador)
│   └── web/                    # React Frontend (Vite + shadcn/ui)
├── services/
│   └── analyzer/               # Python Microservice (NLP + AI)
├── docker-compose.yml          # Infraestructura (PostgreSQL + Redis)
├── CLAUDE.md                   # Guía de desarrollo
└── README.md                  # Documentación principal
```

## Inicio Rápido

### 1. Requisitos
- Node.js 20+ y Python 3.11+
- API Key de Groq (para el analizador)
- Docker (para base de datos y redis)

### 2. Levantar Infraestructura
```bash
docker-compose up -d
```

### 3. Iniciar el Backend (NestJS)
```bash
cd apps/api
npm install
cp .env.example .env
# Configurar variables de entorno en .env
npm run start:dev  # Puerto 3001
```

### 4. Iniciar el Analizador (Python)
```bash
cd services/analyzer
./dev.sh           # Puerto 8000 (instala venv y modelos automáticamente)
```

### 5. Iniciar el Frontend (React)
```bash
cd apps/web
npm install
npm run dev        # Puerto 8080
```

## Estado del Proyecto

| Módulo | Estado | Descripción |
|------------|--------|-------------|
| **Backend API** | ✅ Estable | Autenticación, gestión de colas, streaming de progreso. |
| **Analyzer** | ✅ Estable | Extracción de claims, búsqueda web y veredicto con LLM. |
| **Frontend** | 🔄 En curso | Integración con el backend y estados de carga animados. |
| **Infraestructura**| ✅ Completo | Configuración Docker para desarrollo local. |

## Licencia
MIT License - Ver [LICENSE](LICENSE) para más detalles.

---
**TruthNet: Combatiendo la desinformación con tecnología abierta.**