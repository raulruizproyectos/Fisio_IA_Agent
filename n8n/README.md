# Automatizacion con n8n - Fisio IA Agent

## Objetivo operativo
n8n es el orquestador principal para:
- Clasificar intencion de mensajes (citas, ejercicios, notas)
- Ejecutar Agente de Citas (Google Calendar + logging)
- Ejecutar Agente IA de Ejercicios (OpenAI + catalogo + signed URLs)
- Procesar trigger web desde CRM

## Workflows versionados actualmente
- `n8n/Fisio_IA_Agent/fisio-agent-core.json`
- `n8n/Fisio_IA_Agent/sw-fisio-pending-intakes.json`
- `n8n/Fisio_IA_Agent/telegram-chat.json`
- `n8n/Fisio_IA_Agent/w1-appointment-agent.json`

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
El pipeline de video legacy no forma parte del alcance activo actual.
