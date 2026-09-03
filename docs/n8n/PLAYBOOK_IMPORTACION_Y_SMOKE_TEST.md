# Playbook n8n - Importacion, activacion y smoke test

## Por que existe
Este playbook consolida lo que mejor funcionaba en los proyectos hermanos de `Proyectos_n8n`:
- checklist corto de credenciales,
- seleccion manual de calendario cuando aplica,
- activacion explicita tras importar,
- smoke test guiado por flujo.

## Workflows objetivo en Fisio_IA_Agent
Orden recomendado de importacion:
1. `n8n/Fisio_IA_Agent/vnext/fisio-agent-core.json`
2. `n8n/Fisio_IA_Agent/vnext/w1-appointment-agent.json`
3. `n8n/Fisio_IA_Agent/vnext/w2-exercise-agent.json`
4. `n8n/Fisio_IA_Agent/vnext/w3-crm-trigger.json`
5. `n8n/Fisio_IA_Agent/vnext/telegram-chat.json`
6. `n8n/Fisio_IA_Agent/vnext/telegram-fisio-reports.json`
7. `n8n/Fisio_IA_Agent/vnext/sw-fisio-pending-intakes.json`
8. `n8n/Fisio_IA_Agent/production/w5-calendar-reader.json`
9. `n8n/Fisio_IA_Agent/production/w6-calendar-writer.json`
10. `n8n/Fisio_IA_Agent/production/puente-error-backend.json`

## Credenciales a revisar antes de activar
- `Telegram API` del bot pacientes para `telegram-chat.json`.
- `Telegram API` del bot fisio para `telegram-fisio-reports.json`.
- `OpenAI` en workflows que extraen intencion o generan recomendacion.
- `Google Calendar` en el flujo W1 si la reserva se apoya en calendar desde n8n.
- `Supabase` o headers/API keys donde el workflow llame a backend o storage.
- `Gmail OAuth2` en `puente-error-backend.json`; se usa solo para alertas internas, no para contactar pacientes.

## Regla heredada de los proyectos Carla
Si un nodo de Google Calendar queda importado sin calendario concreto, el workflow no se da por listo.
Hay que abrir el nodo y seleccionar el calendario correcto manualmente.

## URLs y contratos criticos
- `telegram-chat.json` y `telegram-fisio-reports.json` deben apuntar a `POST /api/telegram/incoming` del backend activo.
- `w1-appointment-agent.json` debe apuntar a `POST /api/profesional/appointments`.
- `w3-crm-trigger.json` debe apuntar a `POST /api/exercises/recommend/async`.
- El ack esperado de W3 ahora incluye `job_id`, `tracking_request_id`, `poll_url` y `tracking_status`.

## Activacion minima obligatoria
1. Importar workflow desactivado.
2. Asignar credenciales.
3. Verificar carpeta/tag `Fisio_IA_Agent`.
4. Confirmar URLs de backend del entorno actual.
5. Activar workflow.
6. Ejecutar smoke test real.

Nunca activar a la vez dos Telegram Triggers o dos webhooks con la misma ruta. Los JSON versionados se mantienen desactivados para que la importación no sustituya accidentalmente el flujo operativo.

## Smoke test recomendado
### Bot pacientes
- Enviar `/start CODIGO`.
- Enviar `/cita <inicio_iso> <fin_iso>`.
- Verificar respuesta y alta de cita en backend/CRM.

### Bot fisio
- Enviar `/informe <paciente_id> | <sintomas>`.
- Verificar PDF recibido y recomendacion registrada.

### CRM / W3
- Lanzar peticion a `fisio/w3/crm-trigger` con `patient_id` y `symptoms_text`.
- Esperar respuesta inmediata con `accepted=true` y `job_id`.
- Confirmar que `tracking_status` llega como `queued` o `running`, no como `done` inmediato.
- Consultar despues el backend con `GET /api/exercises/recommend/jobs/:jobId`.
- Si prefieres validacion por terminal, ejecutar `node .\scripts\w2-smoke-async.mjs --baseUrl=http://localhost:3001 --patientId=<uuid> --professionalId=<uuid>`.

## Criterio de done para n8n
Un workflow no esta cerrado si falta cualquiera de estos puntos:
- credenciales enlazadas,
- carpeta/tag `Fisio_IA_Agent`,
- URL de backend correcta,
- smoke test real ejecutado,
- referencia actualizada en `CHANGELOG.md` o checkpoint activo.
