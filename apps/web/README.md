# TruthNet Frontend

Front-end de TruthNet construido con **React**, **Vite** y **Tailwind CSS**.

## Descripción

La aplicación web permite a los usuarios:

- iniciar sesión / registrarse
- enviar textos para verificación
- ver el estado del análisis en tiempo real
- explorar resultados, veredictos y fuentes
- revisar el historial de análisis

## Tecnologías

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Radix UI / shadcn/ui
- React Router v6
- TanStack Query
- Framer Motion
- Vitest

## Estructura importante

```
src/
├── components/
│   ├── truthnet/          # componentes de dominio
│   ├── ui/                # componentes base
│   └── NavLink.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── AnalysisPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── SettingsPage.tsx
│   └── LandingPage.tsx
├── hooks/                 # hooks de autenticación y análisis
├── api/                   # clientes HTTP hacia backend
├── lib/                   # helpers y utilidades
└── main.tsx               # punto de entrada
```

## Instalación y ejecución

```bash
cd apps/web
npm install
npm run dev
```

La app corre en `http://localhost:8080`.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run preview` — preview del build
- `npm run lint` — ESLint
- `npm run test` — Vitest

## Notas importantes

- El proyecto usa `vite.config.ts` para servir en el puerto `8080`.
- El contexto de autenticación se encuentra en `src/contexts/AuthContext.tsx`.
- La página principal del dashboard está en `src/pages/DashboardPage.tsx`.
- Las rutas se definen en `src/App.tsx`.
