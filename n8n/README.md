# Automatización n8n — Fisio IA Agent

n8n se mantiene como orquestador de integraciones; la autorización, las reglas clínicas, la persistencia y la aprobación de informes permanecen en el backend y Supabase. Esta separación evita que una automatización visual se convierta en la única capa de lógica crítica.

## Conjunto objetivo

Los flujos canónicos están en `n8n/Fisio_IA_Agent/vnext/`:

- `fisio-agent-core.json`: router del copiloto.
- `telegram-chat.json`: bot de pacientes y citas.
- `telegram-fisio-reports.json`: bot profesional e informes.
- `w1-appointment-agent.json`: creación de citas.
- `w2-exercise-agent.json`: selección de ejercicios.
- `w3-crm-trigger.json`: lanzamiento asíncrono desde CRM.
- `sw-fisio-pending-intakes.json`: bandeja pendiente.
- `w6-calendar-sync.json`: reconciliación de Calendar.

`production/` representa el estado exportado de la instancia anterior. Debe conservarse como referencia hasta completar el cambio, pero no se deben activar en paralelo dos flujos con el mismo trigger.

## Seguridad obligatoria

1. Crear en n8n una credencial **Header Auth** llamada `Fisio Internal Webhook`:
   - header: `X-Webhook-Secret`
   - valor: el mismo secreto configurado como `N8N_WEBHOOK_SECRET` en el backend.
2. Configurar en n8n estas variables de entorno, sin escribirlas dentro de los JSON:
   - `INTERNAL_API_KEY`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `N8N_WEBHOOK_SECRET`
   - `SUPABASE_ANON_KEY`
3. Limitar el editor de n8n a usuarios administradores, forzar HTTPS y activar el pruning de ejecuciones.
4. No guardar tokens, datos clínicos de prueba ni claves dentro de nodos Code/Set.

Los nodos HTTP versionados incluyen reintentos y envían la cabecera adecuada:

- Telegram → backend: `x-telegram-bot-api-secret-token`.
- n8n → endpoints internos del backend: `X-Internal-Api-Key`.
- backend/n8n → webhooks n8n: `X-Webhook-Secret` mediante Header Auth.

## Contrato mínimo

Cada entrada/salida debe incluir:

- `request_id` UUID.
- `patient_id` UUID cuando aplique.
- `channel`: `telegram`, `crm_web`, `backend` o `n8n`.
- `status`: `queued`, `running`, `done` o `error`.

El error final debe registrar `workflow_name`, `node_name`, `error_code`, `error_message` y marcas de tiempo, y devolver un mensaje seguro sin información técnica al paciente.

## Activación recomendada

1. Importar vNext desactivado.
2. Vincular credenciales Telegram, Google Calendar, Supabase y Header Auth.
3. Ejecutar cada flujo con datos ficticios y comprobar `request_id` de extremo a extremo.
4. Desactivar el flujo antiguo equivalente.
5. Activar un único flujo nuevo.
6. Verificar logs y ausencia de duplicados durante 24 horas.

Todo workflow del proyecto debe permanecer dentro de la carpeta/tag `Fisio_IA_Agent`.
