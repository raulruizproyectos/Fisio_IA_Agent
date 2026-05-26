# Fisio IA Agent

CRM clinico para fisioterapia con agenda Google Calendar, pacientes, finanzas, documentos, Telegram y Copiloto IA.

## Stack
- Frontend: Astro, Tailwind utilities, Nanostores, CSS modular.
- Backend: Node/Express, Supabase, Google Calendar, Telegram, PDFKit.
- Automatizacion: n8n workflows versionados en `n8n/Fisio_IA_Agent`.

## Arranque rapido
```powershell
cd frontend
npm.cmd run check
npm.cmd run build

cd ..\backend
npm.cmd run lint
```

## Contexto vivo
Lee primero `PROJECT_CONTEXT.md`. Es la fuente compacta para futuras sesiones.

## Reglas criticas
- No subir secretos. `.env.local` esta ignorado y es la fuente local.
- No romper IDs, `data-*` ni eventos del frontend: muchas vistas se hidratan desde `frontend/src/pages/index.astro`.
- `assistant-rail.css` es la fuente canonica del Copiloto IA.
- Google Calendar se renderiza en Agenda desde `renderAgendaCalendar()` y estilos `.agenda-*`.

## Deploy
- Rama productiva: `main`.
- Frontend EasyPanel: `fisio-frontend`.
- Backend EasyPanel: `fisio-backend`.
