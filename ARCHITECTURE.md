# Arquitectura

## Principio
Backend autoritativo, frontend como superficie de producto, n8n como orquestador. La logica clinica critica no debe quedar solo en UI.

## Componentes
- `frontend`: Astro CRM, Copiloto IA, calendario, responsive.
- `backend`: Express API, Supabase, Google Calendar, Telegram, PDFs.
- `database`: schema/migrations/seed.
- `n8n`: workflows W0/W1/W2/W3/W5/W6.
- `scripts`: validacion, sincronizacion y smokes.

## Contratos sensibles
- `/api/profesional/appointments`
- `/api/profesional/appointments/sync-calendar/status`
- `/api/pagos`, `/api/facturas`, `/api/bonos`, `/api/documentos`
- `/api/exercises/recommend`, `/api/exercises/recommend/async`
- `/api/telegram/*`

## Frontend
- `index.astro` aun concentra controladores; no romper IDs ni `data-*`.
- CSS canonico:
  - `global-shell.css`: shell.
  - `assistant-rail.css`: Copiloto IA.
  - `premium-clinic-ui.css`: UI responsive y vistas.
- Proximo refactor seguro: extraer controladores por dominio sin cambiar markup publico.

## Backend
- Rutas grandes a dividir: `professional.js`, `telegram.js`, `exercises.js`.
- Mantener separacion: rutas delgadas, servicios por dominio, Supabase en lib/servicios.

## Seguridad
Secretos solo en `.env.local` o plataforma. Nunca en docs, n8n raw exports ni commits.
