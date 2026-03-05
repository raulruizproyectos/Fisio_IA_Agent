# Fisio_IA_Agent

CRM + Agents para centros de fisioterapia: gestión de pacientes, citas y recomendaciones de ejercicios desde Telegram y CRM Web, orquestado con n8n y Supabase.

## Alcance activo (pivot)
- CRM Web para operación clínica.
- Agente de Citas (Telegram + n8n + Google Calendar + Supabase).
- Agente IA de Ejercicios (Telegram + botón CRM + n8n OpenAI + Supabase + Storage).
- Source of truth único: Supabase del proyecto Fisio_IA_Agent.

## En pausa
- Generación de video (desactivada en backend y eliminada del frontend/n8n activo).

## Arquitectura actual
- Frontend CRM: Astro
- Backend API: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Storage: Supabase Storage bucket `ejercicios` (private)
- Automatización: n8n
- IA de selección: OpenAI node en n8n
- Agenda: Google Calendar (n8n + fallback backend opcional)

## Endpoints backend principales
- `POST /api/telegram/incoming`
- `POST /api/telegram/link-code/:patientId`
- `POST /api/agent/message`
- `GET /api/profesional/intakes/pending`
- `GET /api/profesional/appointments`
- `POST /api/profesional/appointments`
- `PATCH /api/profesional/appointments/:appointmentId`
- `GET /api/profesional/program-templates`
- `POST /api/profesional/program-templates/clone`
- `GET /api/profesional/patients/:patientId/history`
- `POST /api/profesional/notes`

## Observabilidad W2 (timeouts/reintentos)
- `POST /api/exercises/recommend` devuelve `engine_observability` con:
  - `attempts`, `retries_used`, `fallback_used`, `fallback_reason`, `total_duration_ms`.
- Variables de entorno backend:
  - `EXERCISE_ENGINE_TIMEOUT_MS` (default `30000`)
  - `EXERCISE_ENGINE_MAX_ATTEMPTS` (default `2`)
  - `EXERCISE_REQUIRE_PATIENT_ASSOCIATION` (default `true`)
- Frontend CRM muestra métrica operativa:
  - `Timeouts/Reintentos IA` (contador en dashboard).

## Informe PDF (CRM y Telegram)
- En CRM (`Agente Clínico IA`):
  - Genera recomendación con botón de ejercicios.
  - Usa botón `PDF` para descargar informe estructurado.
- En Telegram fisio (`FisioIA_Agent_bot`):
  - Comando: `/informe <paciente_id> | <síntomas>`
  - El backend genera recomendación y envía PDF en el chat.

## Workflows n8n versionados en repo
- Producción actual: `n8n/Fisio_IA_Agent/production/` (sin workflows de video).
- Canónicos vNext: `n8n/Fisio_IA_Agent/vnext/`
  - `telegram-chat.json` (bot pacientes/citas)
  - `telegram-fisio-reports.json` (bot fisio/informes PDF)
  - `fisio-agent-core.json` (W0 router core)
  - `w1-appointment-agent.json`
  - `w2-exercise-agent.json`
  - `w3-crm-trigger.json`
  - `sw-fisio-pending-intakes.json`

## Migración de credenciales (test -> definitivo)
El sistema queda preparado para migrar cuentas sin tocar código: solo `.env` y credenciales n8n.

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

## Continuidad
- Estado detallado por sesión: `CHANGELOG.md`
- Checklist operativo para retomar: `configuracion_pendiente.md`
- Arquitectura objetivo: `ARCHITECTURE.md`
- Análisis PROET: `docs/proet/platform_analysis_20260304.md`
- Norma n8n obligatoria (carpeta/tag): `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Norma de robustez y errores: `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`
