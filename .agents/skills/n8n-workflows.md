# Skill: n8n-workflows

Objetivo: estandarizar diseno y operacion de workflows n8n del proyecto.

## Naming recomendado

- W0 Router Telegram
- W1 Agente Citas
- W2 Agente IA Ejercicios
- W3 Trigger Web CRM

Usar nombres de nodos descriptivos y mantener consistencia ES/EN por dominio.

## Contratos de entrada/salida

Todo workflow debe recibir/devolver JSON estructurado con:

- `request_id` (uuid)
- `patient_id` (uuid si aplica)
- `channel` (`telegram|crm_web|backend|n8n`)
- `status` (`queued|running|done|error`)

## Error handling minimo

1. Capturar errores por rama (`IF`, `Error Trigger`, o nodo dedicado).
2. Reintento con backoff en integraciones externas (Calendar, OpenAI, Telegram, Supabase API).
3. Registrar error final en tabla de comunicaciones/auditoria.
4. Responder fallback seguro al paciente/profesional.

## Logging minimo obligatorio

- `request_id`
- `workflow_name`
- `node_name`
- `patient_id`
- `channel`
- `status`
- `error_code`/`error_message` (si aplica)
- `created_at` y `updated_at`

## Integraciones clave

- Telegram: entrada y confirmaciones.
- Google Calendar: altas/modificaciones/cancelaciones de citas.
- OpenAI Node: clasificacion y seleccion de ejercicios.
- Supabase: source of truth y trazabilidad.

## Regla de oro

No introducir logica critica en un unico nodo opaco. Separar:

- validacion
- clasificacion
- accion
- persistencia
- notificacion
- auditoria
