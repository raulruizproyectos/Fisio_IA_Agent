# Fisio_IA_Agent

CRM + agentes para centros de fisioterapia: gestiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de pacientes, citas y recomendaciones de ejercicios desde Telegram y CRM web, orquestado con n8n y Supabase.

## Alcance activo (pivot)
- CRM web para operaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n clÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nica.
- Agente de citas: Telegram + n8n + Google Calendar + Supabase.
- Bot de pacientes: solicitudes de cita por texto libre, comando `/cita` y nota de voz transcrita.

- Agente IA de ejercicios: Telegram + CRM + n8n/OpenAI + Supabase + Storage.
- Source of truth ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºnico: Supabase del proyecto `Fisio_IA_Agent`.

## En pausa
- GeneraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­deo: desactivada en backend y eliminada del frontend y de los workflows n8n activos.

## Checkpoint actual (Sesion 92 - 2026-03-11)
- La arquitectura vigente queda fijada como hibrida:
  - backend autoritativo para contratos, seguridad, persistencia, jobs, PDF y entrega,
  - `n8n` para orquestacion conversacional y clinica,
  - frontend como superficie de producto.
- El PDF profesional sigue unificado en backend y sirve tanto al CRM como al Telegram profesional.
- El core n8n ya resuelve `triage_needed` para sintomas demasiado vagos y el smoke test remoto Telegram queda en `6/6 OK`.
- `crm_perfiles` ya permite resolver el chat del bot fisio en produccion y `POST /api/telegram/physio-report/send` queda validado con `target_source=crm_perfiles`.
- El CRM ya expone la invitacion Telegram del paciente desde historial con `GET /api/telegram/link-code/:patientId`.
- El Copilot lateral se rehace tomando como referencia `frontend/stitch.zip`: composicion mas limpia, acciones abajo y tono visual blanco/slate/teal.
- El bot de pacientes queda conceptualmente separado del bot profesional: `@FisioIA_Agent_bot` es solo del fisioterapeuta y el bot de agenda de pacientes sera nuevo.
- El workflow canonico de agenda pasa a `n8n/Fisio_IA_Agent/vnext/w1-appointment-agent.json`, con disponibilidad Calendar + alta backend + cleanup compensatorio.
- La API publica de n8n no permite ubicar por token el workflow nuevo dentro de la carpeta `Fisio_IA_Agent`; para publicarlo ahi hace falta placeholder o movimiento manual en UI.
- El bot de pacientes ya crea citas reales en crm_citas desde Telegram por texto y por voice_transcript.
- Bloqueos reales ya confirmados en produccion:
  - falta OPENAI_API_KEY en fisio-backend para cerrar la rama nativa de nota de voz,
  - Google Calendar sigue desactivado en runtime backend (calendar_sync.enabled=false).
- El repo ya corrige la reutilizacion del paciente CRM cuando el flujo parte de un paciente legacy vinculado por Telegram.
- Pendiente inmediato: publicar credenciales reales de voz y Google Calendar en fisio-backend y repetir E2E con nota de voz real.

## Arquitectura actual
- Frontend CRM: Astro
- Backend API: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Storage: Supabase Storage bucket `ejercicios` (private)
- AutomatizaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: n8n
- IA de selecciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: OpenAI vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a n8n
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
- ProducciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n:
  - `POST /api/exercises/recommend` y `/async` validados con imÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡genes
  - `POST /api/agent/message` validado en CRM
  - `POST /api/telegram/incoming?dry_run=true` validado con 6 casos reales de routing
  - entrega real del triage Telegram validada en chat vinculado
  - GET /api/telegram/link-code/:patientId validado en backend publico
  - alta real de citas Telegram validada en crm_citas`r
  - voz nativa pendiente de OPENAI_API_KEY`r
  - sync a Google Calendar pendiente de credenciales backend

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

## W2 asÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ncrono (polling CRM)
- El CRM puede lanzar el informe de ejercicios en segundo plano con `POST /api/exercises/recommend/async`.
- El estado se consulta con `GET /api/exercises/recommend/jobs/:jobId`.
- Si existe la tabla `crm_async_jobs`, el polling sobrevive a reinicios y despliegues del backend.
- Si la migraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºn no estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ aplicada, el backend cae temporalmente a memoria sin romper el flujo.

## Observabilidad W2 (timeouts y reintentos)
- `POST /api/exercises/recommend` devuelve `engine_observability` con:
  - `attempts`, `retries_used`, `fallback_used`, `fallback_reason`, `total_duration_ms`
  - `catalog_total`, `candidate_count`, `candidate_limit` para medir cuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡nto contexto se envÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a al motor
- Variables de entorno backend:
  - `EXERCISE_ENGINE_TIMEOUT_MS` (default `30000`)
  - `EXERCISE_ENGINE_MAX_ATTEMPTS` (default `2`)
  - `EXERCISE_ENGINE_CANDIDATE_LIMIT` (default `24`)
  - `EXERCISE_REQUIRE_PATIENT_ASSOCIATION` (default `true`)
- El frontend CRM muestra la mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©trica operativa `Timeouts/Reintentos IA` sin doble conteo cuando el backend devuelve `engine_observability`.

## Informe PDF (CRM y Telegram)
- En CRM (`Agente clinico n8n`):
  - genera recomendaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n desde el rail derecho
  - permite descargar el informe estructurado en PDF
  - el KPI `Informes IA archivados` solo incrementa cuando `/api/exercises/reports/archive` responde OK
- En Telegram fisio (`FisioIA_Agent_bot`):
  - comando: `/informe <paciente_id> | <sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ntomas>`
  - el backend genera la recomendaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n y envÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a el PDF en el chat

## Workflows n8n versionados en el repo
- ProducciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n actual: `n8n/Fisio_IA_Agent/production/`.
- CanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³nicos vNext: `n8n/Fisio_IA_Agent/vnext/`
  - `telegram-chat.json`
  - `telegram-fisio-reports.json`
  - `fisio-agent-core.json`
  - `w1-appointment-agent.json`
  - `w2-exercise-agent.json`
  - `w3-crm-trigger.json`
  - `sw-fisio-pending-intakes.json`

## MigraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de credenciales (test a definitivo)
El sistema estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ preparado para migrar cuentas sin tocar cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³digo: solo `.env` y credenciales n8n.

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

## Inicio rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡pido
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

## ValidaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n local segura del frontend
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

- Valida 7 casos: triage, ejercicio, cita libre, cita por voz transcrita, seguimiento, comando `/cita` y comando `/informe` del bot fisio.
- Espera `route` y `next_action` correctos sin crear pacientes, intakes, citas ni recomendaciones.
- Para ejecutar un caso concreto: `--only=exercise_free_text`.

## Smoke test rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡pido del flujo asÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ncrono W2
```powershell
node .\scripts\w2-smoke-async.mjs --baseUrl=http://localhost:3001 --patientId=<uuid> --professionalId=<uuid>
```

## Continuidad
- Estado detallado por sesiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: `CHANGELOG.md`
- Checklist operativo para retomar: `configuracion_pendiente.md`
- Arquitectura objetivo: `ARCHITECTURE.md`
- Checkpoint operativo: `docs/checkpoint_20260317_frontend_copilot_handoff.md`
- AnÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lisis PROET: `docs/proet/platform_analysis_20260304.md`
- Norma n8n obligatoria: `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Playbook de importaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n y smoke test n8n: `docs/n8n/PLAYBOOK_IMPORTACION_Y_SMOKE_TEST.md`
- Norma de robustez y errores: `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`








