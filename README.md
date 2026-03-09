# Fisio_IA_Agent

CRM + Agents para centros de fisioterapia: gestiÃ³n de pacientes, citas y recomendaciones de ejercicios desde Telegram y CRM Web, orquestado con n8n y Supabase.

## Alcance activo (pivot)
- CRM Web para operaciÃ³n clÃ­nica.
- Agente de Citas (Telegram + n8n + Google Calendar + Supabase).
- Agente IA de Ejercicios (Telegram + botÃ³n CRM + n8n OpenAI + Supabase + Storage).
- Source of truth Ãºnico: Supabase del proyecto Fisio_IA_Agent.

## En pausa
- Generacion de video (desactivada en backend y eliminada del frontend/n8n activo).

## Checkpoint actual (Sesion 61 - 2026-03-09)
- W2 ya funciona con flujo asincrono para CRM:
  - `POST /api/exercises/recommend/async`,
  - `GET /api/exercises/recommend/jobs/:jobId`,
  - persistencia en `crm_async_jobs` cuando la migracion esta aplicada,
  - fallback a memoria o ruta sincronica si el despliegue va por detras.
- Frontend validado en copia local no sincronizada:
  - `astro build` OK,
  - `astro check` OK.
- Backend validado en copia local no sincronizada:
  - `npm run lint` OK,
  - `node --check` OK en `src/index.js` y rutas principales.
- Punto exacto de continuidad: `docs/checkpoint_20260309_async_validation.md`.

## Arquitectura actual
- Frontend CRM: Astro
- Backend API: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Storage: Supabase Storage bucket `ejercicios` (private)
- AutomatizaciÃ³n: n8n
- IA de selecciÃ³n: OpenAI node en n8n
- Agenda: Google Calendar (n8n + fallback backend opcional)

## Endpoints backend principales
- `POST /api/telegram/incoming`
- `POST /api/telegram/link-code/:patientId`
- `POST /api/agent/message`
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

## W2 asincrono (polling CRM)
- El CRM puede lanzar el informe de ejercicios en segundo plano con `POST /api/exercises/recommend/async`.
- El estado se consulta con `GET /api/exercises/recommend/jobs/:jobId`.
- Si existe la tabla `crm_async_jobs`, el polling sobrevive a reinicios/despliegues del backend.
- Si la migracion aun no esta aplicada, el backend cae temporalmente a memoria sin romper el flujo.

## Observabilidad W2 (timeouts/reintentos)
- `POST /api/exercises/recommend` devuelve `engine_observability` con:
  - `attempts`, `retries_used`, `fallback_used`, `fallback_reason`, `total_duration_ms`.
- Variables de entorno backend:
  - `EXERCISE_ENGINE_TIMEOUT_MS` (default `30000`)
  - `EXERCISE_ENGINE_MAX_ATTEMPTS` (default `2`)
  - `EXERCISE_REQUIRE_PATIENT_ASSOCIATION` (default `true`)
- Frontend CRM muestra mÃ©trica operativa:
  - `Timeouts/Reintentos IA` (contador en dashboard, sin doble conteo cuando el backend devuelve `engine_observability`).

## Informe PDF (CRM y Telegram)
- En CRM (`Agente ClÃ­nico IA`):
  - Genera recomendaciÃ³n con botÃ³n de ejercicios.
  - Usa botÃ³n `PDF` para descargar informe estructurado.
  - El KPI `Informes IA archivados` solo incrementa cuando `/api/exercises/reports/archive` responde OK.
- En Telegram fisio (`FisioIA_Agent_bot`):
  - Comando: `/informe <paciente_id> | <sÃ­ntomas>`
  - El backend genera recomendaciÃ³n y envÃ­a PDF en el chat.

## Workflows n8n versionados en repo
- ProducciÃ³n actual: `n8n/Fisio_IA_Agent/production/` (sin workflows de video).
- CanÃ³nicos vNext: `n8n/Fisio_IA_Agent/vnext/`
  - `telegram-chat.json` (bot pacientes/citas)
  - `telegram-fisio-reports.json` (bot fisio/informes PDF)
  - `fisio-agent-core.json` (W0 router core)
  - `w1-appointment-agent.json`
  - `w2-exercise-agent.json`
  - `w3-crm-trigger.json`
  - `sw-fisio-pending-intakes.json`

## MigraciÃ³n de credenciales (test -> definitivo)
El sistema queda preparado para migrar cuentas sin tocar cÃ³digo: solo `.env` y credenciales n8n.

- Backend `.env`:
  - `TELEGRAM_PATIENT_BOT_TOKEN`
  - `TELEGRAM_PHYSIO_BOT_TOKEN`
  - `TELEGRAM_PATIENT_BOT_USERNAME`
  - `TELEGRAM_PHYSIO_BOT_USERNAME`
  - `GOOGLE_CALENDAR_ID`
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
  - `GOOGLE_CALENDAR_TIMEZONE`
  - `GOOGLE_CALENDAR_REQUIRED`

- n8n:
  - workflow de pacientes con credencial de `fisioterapia_CarlaJL`
  - workflow de fisio con credencial de `FisioIA_Agent_bot`
  - credencial Google Calendar del entorno definitivo

## Inicio rÃ¡pido
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

## Validacion local segura del frontend
Si `npm install` del frontend se bloquea en la ruta sincronizada (`G:\Mi unidad\...`), usa el flujo seguro ya validado en una ruta local no sincronizada:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1
cd C:\Temp\Fisio_IA_Agent_frontend_local
npm run check
```

## Validacion local segura del backend
Si `npm install` o `npm run lint` del backend fallan en la ruta sincronizada, usa el flujo seguro ya preparado:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backend-local-validate.ps1
```

Si necesitas validar manualmente la copia temporal:

```powershell
cd C:\Temp\Fisio_IA_Agent_backend_local
npm install --no-audit --no-fund
npm run lint
node --check src\index.js
node --check src\routes\exercises.js
```

Smoke test rapido del flujo async W2:

```powershell
node .\scripts\w2-smoke-async.mjs --baseUrl=http://localhost:3001 --patientId=<uuid> --professionalId=<uuid>
```

## Continuidad
- Estado detallado por sesiÃ³n: `CHANGELOG.md`
- Checklist operativo para retomar: `configuracion_pendiente.md`
- Arquitectura objetivo: `ARCHITECTURE.md`
- AnÃ¡lisis PROET: `docs/proet/platform_analysis_20260304.md`
- Norma n8n obligatoria (carpeta/tag): `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Playbook n8n importacion + smoke test: `docs/n8n/PLAYBOOK_IMPORTACION_Y_SMOKE_TEST.md`
- Norma de robustez y errores: `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`




