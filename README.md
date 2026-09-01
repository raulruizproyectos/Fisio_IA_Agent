# Fisio IA Agent

CRM clinico para fisioterapia con agenda Google Calendar, pacientes, finanzas, documentos, Telegram y Copiloto IA.

## Stack
- Frontend: Astro, Tailwind utilities, Nanostores, CSS modular.
- Backend: Node/Express, Supabase, Google Calendar, Telegram, PDFKit.
- Automatizacion: n8n workflows versionados en `n8n/Fisio_IA_Agent`.

## Arranque rapido
```powershell
cd frontend
npm.cmd ci
npm.cmd run check
npm.cmd run build

cd ..\backend
npm.cmd ci
npm.cmd run lint
npm.cmd test
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
- Repo privado: usar Deploy Key/SSH en EasyPanel.
- URL SSH recomendada: `git@github.com:raulruizproyectos/Fisio_IA_Agent.git`.
- Build paths: `frontend` y `backend` sin `/` inicial.
- Checklist y orden seguro: `docs/PRODUCTION_READINESS.md`.

## Seguridad

- El panel profesional usa Supabase Auth; no hay UUID de profesional fijo en frontend.
- Las rutas clínicas usan JWT + RLS. Las rutas internas usan `INTERNAL_API_KEY`.
- Telegram y n8n utilizan secretos de webhook independientes.
- Todo informe generado por IA requiere aprobación profesional antes de PDF o envío al paciente.
