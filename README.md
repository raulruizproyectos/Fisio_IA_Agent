# Fisio_IA_Agent

CRM + agentes para centros de fisioterapia: gestión de pacientes, citas y recomendaciones de ejercicios desde Telegram y CRM web, orquestado con n8n y Supabase.

## Alcance activo (pivot)
- CRM web para operación clínica.
- Agente de citas: Telegram + n8n + Google Calendar + Supabase.
- Agente IA de ejercicios: Telegram + CRM + n8n/OpenAI + Supabase + Storage.
- Source of truth único: Supabase del proyecto `Fisio_IA_Agent`.

## En pausa
- Generación de vídeo: desactivada en backend y eliminada del frontend y de los workflows n8n activos.

## Checkpoint actual (Sesion 77 - 2026-03-11)\r
- La arquitectura vigente queda fijada como hibrida:\r
  - backend autoritativo para contratos, seguridad, persistencia, jobs, PDF y entrega,\r
  - `n8n` para orquestacion conversacional y clinica,\r
  - frontend como superficie de producto.\r
- El PDF profesional sigue unificado en backend y sirve tanto al CRM como al Telegram profesional.\r
- Fix critico del assistant rail responsive: chat input siempre visible en cualquier tamano de pantalla.\r
- Migracion `crm_async_jobs` aplicada en Supabase para persistencia de jobs async.\r
- n8n `fisio-agent-core` refinado con mejor clasificacion de intents.\r
- Pendiente: redeploy frontend y backend en EasyPanel para que los cambios surtan efecto.

## Arquitectura actual
- Frontend CRM: Astro
- Backend API: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Storage: Supabase Storage bucket `ejercicios` (private)
- Automatización: n8n
- IA de selección: OpenAI vía n8n
- Agenda: Google Calendar (n8n + fallback backend opcional)
- Canales conversacionales: CRM web + Telegram

## Principio operativo recomendado
- El backend es la frontera autoritativa del producto: valida entradas, protege contratos, persiste, coordina jobs y entrega el PDF profesional.
- `n8n` orquesta la logica conversacional, la automatizacion y el razonamiento clinico.
- El `frontend` no toma decisiones clinicas ni expone detalles internos de implementacion.
- Este reparto evita duplicar logica, facilita despliegue en VPS/EasyPanel y mantiene el sistema independiente del ordenador local.

## Estado actual verificado
- Frontend:
  - `astro build` OK en copia local aislada
  - `astro check` OK en copia local aislada
  - saneado de texto/encoding aplicado en `index.astro` y `Layout.astro`
- Backend:
  - `node --check` OK en rutas principales
  - `npm run lint` OK en copia local aislada con dependencias completas
- Producción:
  - `POST /api/exercises/recommend` y `/async` validados con imágenes
  - `POST /api/agent/message` validado en CRM
  - `POST /api/telegram/incoming?dry_run=true` validado con 5 casos reales de routing
  - pendiente redeploy de frontend en EasyPanel para publicar fix responsive del rail

## Endpoints backend principales
- `POST /api/telegram/incoming`
- `POST /api/telegram/link-code/:patientId`
- `POST /api/agent/message`
- `POST /api/exercises/recommend`
- `POST /api/exercises/recommend/async`
- `GET /api/exercises/recommend/jobs/:jobId`
- `GET /api/profesional/intakes/pending`
- `GET /api/profesional/appointments`
- `POST /api/profesional/appointments`
- `PATCH /api/profesional/appointments/:appointmentId`
- `GET /api/profesional/program-templates`
- `POST /api/profesional/program-templates/clone`
- `GET /api/profesional/patients/:patientId/history`
- `POST /api/profesional/notes`

## W2 asíncrono (polling CRM)
- El CRM puede lanzar el informe de ejercicios en segundo plano con `POST /api/exercises/recommend/async`.
- El estado se consulta con `GET /api/exercises/recommend/jobs/:jobId`.
- Si existe la tabla `crm_async_jobs`, el polling sobrevive a reinicios y despliegues del backend.
- Si la migración aún no está aplicada, el backend cae temporalmente a memoria sin romper el flujo.

## Observabilidad W2 (timeouts y reintentos)
- `POST /api/exercises/recommend` devuelve `engine_observability` con:
  - `attempts`, `retries_used`, `fallback_used`, `fallback_reason`, `total_duration_ms`
  - `catalog_total`, `candidate_count`, `candidate_limit` para medir cuánto contexto se envía al motor
- Variables de entorno backend:
  - `EXERCISE_ENGINE_TIMEOUT_MS` (default `30000`)
  - `EXERCISE_ENGINE_MAX_ATTEMPTS` (default `2`)
  - `EXERCISE_ENGINE_CANDIDATE_LIMIT` (default `24`)
  - `EXERCISE_REQUIRE_PATIENT_ASSOCIATION` (default `true`)
- El frontend CRM muestra la métrica operativa `Timeouts/Reintentos IA` sin doble conteo cuando el backend devuelve `engine_observability`.

## Informe PDF (CRM y Telegram)
- En CRM (`Agente clinico n8n`):
  - genera recomendación desde el rail derecho
  - permite descargar el informe estructurado en PDF
  - el KPI `Informes IA archivados` solo incrementa cuando `/api/exercises/reports/archive` responde OK
- En Telegram fisio (`FisioIA_Agent_bot`):
  - comando: `/informe <paciente_id> | <síntomas>`
  - el backend genera la recomendación y envía el PDF en el chat

## Workflows n8n versionados en el repo
- Producción actual: `n8n/Fisio_IA_Agent/production/`.
- Canónicos vNext: `n8n/Fisio_IA_Agent/vnext/`
  - `telegram-chat.json`
  - `telegram-fisio-reports.json`
  - `fisio-agent-core.json`
  - `w1-appointment-agent.json`
  - `w2-exercise-agent.json`
  - `w3-crm-trigger.json`
  - `sw-fisio-pending-intakes.json`

## Migración de credenciales (test a definitivo)
El sistema está preparado para migrar cuentas sin tocar código: solo `.env` y credenciales n8n.

- Backend `.env`:
  - `TELEGRAM_PATIENT_BOT_TOKEN`
  - `TELEGRAM_PHYSIO_BOT_TOKEN`
  - `TELEGRAM_PATIENT_BOT_USERNAME`
  - `TELEGRAM_PHYSIO_BOT_USERNAME`
  - `TELEGRAM_EDGE_ROUTER_ENABLED`
  - `GOOGLE_CALENDAR_ID`
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
  - `GOOGLE_CALENDAR_TIMEZONE`
  - `GOOGLE_CALENDAR_REQUIRED`
- n8n:
  - workflow de pacientes con la credencial del bot de pacientes
  - workflow de fisio con la credencial del bot de informes
  - credencial Google Calendar del entorno definitivo

## Inicio rápido
```bash
# backend
cd backend
npm install
cp .env.example .env
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

## Validación local segura del frontend
Si `npm install` del frontend se bloquea en la ruta sincronizada (`G:\Mi unidad\...`), usa el flujo seguro ya validado en una ruta local no sincronizada:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1
cd C:\Temp\Fisio_IA_Agent_frontend_local
npm run check
```

## Smoke test Telegram dry run
Para validar Telegram sin tocar chats reales ni crear datos productivos:

```powershell
node .\scripts\telegram-dry-run.mjs --baseUrl=https://fisio-backend.b5xbaf.easypanel.host
```

- Valida 5 casos: mensaje libre de ejercicios, cita libre, seguimiento, comando `/cita` y comando `/informe` del bot fisio.
- Espera `route` y `next_action` correctos sin crear pacientes, intakes, citas ni recomendaciones.
- Para ejecutar un caso concreto: `--only=exercise_free_text`.

## Smoke test rápido del flujo asíncrono W2
```powershell
node .\scripts\w2-smoke-async.mjs --baseUrl=http://localhost:3001 --patientId=<uuid> --professionalId=<uuid>
```

## Continuidad
- Estado detallado por sesión: `CHANGELOG.md`
- Checklist operativo para retomar: `configuracion_pendiente.md`
- Arquitectura objetivo: `ARCHITECTURE.md`
- Checkpoint operativo: `docs/checkpoint_20260309_async_validation.md`
- Análisis PROET: `docs/proet/platform_analysis_20260304.md`
- Norma n8n obligatoria: `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Playbook de importación y smoke test n8n: `docs/n8n/PLAYBOOK_IMPORTACION_Y_SMOKE_TEST.md`
- Norma de robustez y errores: `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`



