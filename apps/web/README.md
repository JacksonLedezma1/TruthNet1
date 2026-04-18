# TruthNet

> **Verifica antes de compartir.**

TruthNet es una plataforma web de verificación de desinformación con IA. El usuario pega un texto o noticia, y el sistema analiza automáticamente si las afirmaciones son verdaderas, falsas o engañosas — mostrando el progreso en tiempo real y un árbol de evidencias al terminar.

---

## 📑 Tabla de contenidos

- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Scripts disponibles](#-scripts-disponibles)
- [Sistema de diseño](#-sistema-de-diseño)
- [Páginas y rutas](#-páginas-y-rutas)
- [Componentes principales](#-componentes-principales)
- [Convenciones de código](#-convenciones-de-código)
- [Roadmap](#-roadmap)

---

## ✨ Características

- 🔍 **Extracción de afirmaciones** — Identifica automáticamente qué partes del texto son verificables.
- 🌐 **Búsqueda de fuentes reales** — Cruza información con Wikipedia, noticias y fuentes primarias.
- 🤖 **Veredicto con IA** — Un LLM evalúa cada claim contra las fuentes encontradas.
- 📊 **Score de confiabilidad** — Puntuación de 0 a 100 con desglose por afirmación.
- 🌳 **Árbol de evidencias** — Visualización clara de fuentes que apoyan o contradicen cada claim.
- ⏱️ **Progreso en tiempo real** — Timeline animada que muestra cada paso del análisis.

---

## 🛠 Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | **React 18** + **Vite 5** |
| Lenguaje | **TypeScript 5** |
| Estilos | **Tailwind CSS v3** + tokens semánticos HSL |
| UI Components | **shadcn/ui** (Radix UI) |
| Animaciones | **Framer Motion** |
| Routing | **React Router v6** |
| Data fetching | **TanStack Query** |
| Iconos | **lucide-react** |
| Tests | **Vitest** + **Playwright** |

---

## 📁 Estructura del proyecto

```
src/
├── components/
│   ├── truthnet/          # Componentes específicos del dominio
│   │   ├── AnalysisCard.tsx
│   │   ├── ClaimCard.tsx
│   │   ├── ProgressTimeline.tsx
│   │   ├── ScoreCircle.tsx
│   │   ├── SourceItem.tsx
│   │   └── VerdictBadge.tsx
│   ├── ui/                # Componentes base de shadcn/ui
│   └── NavLink.tsx
├── pages/
│   ├── LandingPage.tsx    # /
│   ├── LoginPage.tsx      # /login
│   ├── RegisterPage.tsx   # /register
│   ├── DashboardPage.tsx  # /dashboard
│   ├── AnalysisPage.tsx   # /analysis/:id
│   ├── SettingsPage.tsx   # /settings
│   └── NotFound.tsx       # 404
├── hooks/
├── lib/
│   └── utils.ts           # Helper `cn()` para clases Tailwind
├── test/
├── App.tsx                # Definición de rutas
├── main.tsx               # Entry point
└── index.css              # Tokens de diseño y estilos globales
```

---

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en [http://localhost:8080](http://localhost:8080).

---

## 📜 Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción |
| `npm run build:dev` | Build en modo desarrollo |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Linter ESLint |
| `npm run test` | Tests unitarios con Vitest |

---

## 🎨 Sistema de diseño

TruthNet usa **dark mode por defecto** con tokens semánticos definidos en HSL en `src/index.css` y `tailwind.config.ts`. **Nunca uses colores directos** en componentes — siempre tokens semánticos.

### Paleta de colores

| Token | Uso |
|---|---|
| `background` (Midnight) | Fondo principal |
| `card` / `surface` | Cards y paneles |
| `border` | Bordes sutiles |
| `primary` (Indigo) | CTAs y acciones principales |
| `accent` (Verde) | Estado verificado / confiable |
| `warning` (Amarillo) | Estado sospechoso / engañoso |
| `destructive` (Rojo) | Estado falso / peligroso |
| `unverifiable` (Gris) | Estado no verificable |
| `muted` | Texto secundario y hints |

### Tipografía

- **Headings & Body**: `Inter` (400-700)
- **Monospace** (scores, IDs): `JetBrains Mono`

### Border radius

- `sm` (8px) — componentes pequeños
- `lg` (12px) — cards
- `2xl` (16px) — modales

### Veredictos

| Veredicto | Color | Uso |
|---|---|---|
| `verified` | 🟢 Verde | Información confirmada |
| `misleading` | 🟡 Amarillo | Engañoso o parcialmente cierto |
| `false` | 🔴 Rojo | Información falsa |
| `unverifiable` | ⚪ Gris | Sin fuentes suficientes |
| `suspicious` | 🟠 Naranja | Requiere precaución |

---

## 🗺 Páginas y rutas

| Ruta | Página | Descripción |
|---|---|---|
| `/` | `LandingPage` | Hero con input para análisis directo + features |
| `/login` | `LoginPage` | Inicio de sesión |
| `/register` | `RegisterPage` | Registro con indicador de fortaleza de contraseña |
| `/dashboard` | `DashboardPage` | Historial de análisis con filtros por veredicto |
| `/analysis/:id` | `AnalysisPage` | Estado loading (timeline) + estado done (resultados) |
| `/settings` | `SettingsPage` | Configuración de cuenta |
| `*` | `NotFound` | 404 personalizado |

---

## 🧩 Componentes principales

### `VerdictBadge`
Pill coloreado según el veredicto (`verified`, `misleading`, `false`, `unverifiable`, `suspicious`). Tamaños: `sm`, `md`, `lg`.

### `ScoreCircle`
Círculo SVG animado con el score (0-100). El color del arco cambia según el rango: verde (70+), amarillo (40-69), rojo (<40).

### `ProgressTimeline`
Timeline vertical de pasos con estados `completed` / `active` / `pending` / `failed`. Usado durante el análisis.

### `ClaimCard`
Card expandible con borde izquierdo coloreado según veredicto. Muestra el claim, explicación del LLM y fuentes colapsables (apoyan / contradicen / neutrales).

### `SourceItem`
Item de fuente individual con favicon, título, score de relevancia y icono indicando si apoya/contradice/es neutral.

### `AnalysisCard`
Card de historial usada en el dashboard. Muestra badge, score, preview del texto y metadata.

---

## 📐 Convenciones de código

- **Tokens semánticos siempre**: nunca `text-white` o `bg-black` — usa `text-foreground`, `bg-background`, etc.
- **HSL en CSS variables**: todas las variables de color deben estar en HSL en `index.css`.
- **Componentes pequeños y enfocados**: un archivo = una responsabilidad.
- **Mobile first**: todos los layouts deben funcionar a partir de 375px sin scroll horizontal.
- **Sin scroll horizontal**: todo fluye verticalmente.

---

## 🛣 Roadmap

- [ ] Conectar Lovable Cloud para autenticación real (email + Google)
- [ ] Persistir análisis en base de datos
- [ ] Integración con LLM para análisis real
- [ ] Búsqueda y cruce de fuentes (Wikipedia, news APIs)
- [ ] Exportar análisis como PDF
- [ ] Compartir resultado vía link público
- [ ] Modo light opcional con toggle
- [ ] Estados de error explícitos con botón "Reintentar"

---

## 📄 Licencia

Proyecto privado — todos los derechos reservados.
