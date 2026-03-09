# Automatizacion con n8n - Fisio IA Agent

## Objetivo operativo
n8n es el orquestador principal para:
- Clasificar intencion de mensajes (citas, ejercicios, notas)
- Ejecutar Agente de Citas (Google Calendar + logging)
- Ejecutar Agente IA de Ejercicios (OpenAI + catalogo + signed URLs)
- Procesar trigger web desde CRM

## Workflows versionados actualmente
- Produccion remota activa (`n8n/Fisio_IA_Agent/production/`)
  - `nucleo-agente.json`
  - `puente-error-backend.json`
  - `subflujo-pendientes.json`
- Canonicos vNext (`n8n/Fisio_IA_Agent/vnext/`)
  - `fisio-agent-core.json`
  - `sw-fisio-pending-intakes.json`
  - `telegram-chat.json` (bot pacientes/citas - `agent_mode=patient_appointments`)
  - `telegram-fisio-reports.json` (bot fisio/informes - `agent_mode=physio_reports`)
  - `w1-appointment-agent.json`
  - `w2-exercise-agent.json`
  - `w3-crm-trigger.json`

## Configuracion 2 bots Telegram
- Bot pacientes (agenda citas): `fisioterapia_CarlaJL`
  - Workflow: `n8n/Fisio_IA_Agent/vnext/telegram-chat.json`
  - Debe usar credencial del bot de pacientes.
- Bot fisio (informes + PDF): `FisioIA_Agent_bot`
  - Workflow: `n8n/Fisio_IA_Agent/vnext/telegram-fisio-reports.json`
  - Debe usar credencial del bot del fisioterapeuta.

Comando principal en bot fisio:
- `/informe <paciente_id> | <sintomas>`
- Ejemplo: `/informe 11111111-2222-3333-4444-555555555555 | Dolor cervical al girar cuello desde hace 3 dias`

## Estado remoto (2026-03-04)
- Instancia auditada de extremo a extremo.
- Estado consolidado:
  - workflows totales: `54`
  - workflows activos: `5`
  - activos dentro de `Fisio_IA_Agent / ...`: `5`
  - workflows de video en nombre: `0`
- Backups de seguridad pre-limpieza:
  - `docs/data/n8n/backup_before_deactivate_20260304/` (local, no versionado)
- Artefactos de auditoria:
  - `docs/data/n8n/workflows_snapshot_20260304_raw.json` (local, no versionado)
  - `docs/data/n8n/workflows_summary_20260304.json`

## Convencion recomendada (vNext)
- W0 Router Telegram
- W1 Agente Citas
- W2 Agente IA Ejercicios
- W3 Trigger Web CRM

## Contrato minimo de trazabilidad
Cada ejecucion debe registrar:
- `request_id`
- `patient_id` (si aplica)
- `channel`
- `workflow_name`
- `status`
- `created_at`

## Integracion backend
Endpoints principales consumidos por workflows:
- `POST /api/telegram/incoming`
- `POST /api/agent/message`
- `GET /api/profesional/intakes/pending`
- `GET /api/profesional/appointments`
- `POST /api/profesional/appointments`
- `PATCH /api/profesional/appointments/:appointmentId`

## Integracion Supabase Storage
- Bucket `ejercicios` (private)
- object_key persistido en DB
- signed URLs generadas JIT desde n8n con service role

## Nota de alcance
- El set `production/` del repo queda sin flujos de video.
- El set `vnext/` contiene la version canÃ³nica objetivo (W0/W1/W2/W3) para migracion progresiva.
- Limitacion actual de API n8n:
  - `PUT /api/v1/workflows/{id}/tags` sigue devolviendo `500`, por lo que el etiquetado en carpeta/tag `Fisio_IA_Agent` puede requerir accion manual en UI.

## Norma obligatoria de carpeta/tag
- Referencia oficial: `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Regla estricta:
  - Todo workflow del proyecto debe quedar dentro de carpeta/tag `Fisio_IA_Agent`.
  - Si un workflow queda fuera, el trabajo no se considera cerrado.


