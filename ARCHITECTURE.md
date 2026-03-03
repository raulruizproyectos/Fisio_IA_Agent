# Fisio_IA_Agent - Arquitectura Objetivo (Pivot CRM + Agents)

## 1) Overview

El sistema evoluciona a una plataforma de operacion para centros de fisioterapia con dos capas:

- CRM Web para gestion clinica y operativa.
- Agentes conversacionales/orquestados para citas y recomendaciones de ejercicios.

Estado de alcance:

- En foco: CRM + Telegram + n8n + Supabase + Google Calendar + OpenAI.
- En pausa: pipeline de video (se conserva historial, no se elimina, pero queda fuera del alcance actual).

## 2) Component Map

| Componente | Rol | Entradas | Salidas |
| --- | --- | --- | --- |
| Frontend CRM (Astro) | UI de gestion de pacientes, sesiones, citas y recomendaciones | Usuario autenticado | Llamadas a backend y visualizacion de datos |
| Backend (Node/Express) | Capa de API y trigger web hacia n8n | CRM Web | Webhooks/requests a n8n, lectura/escritura segura |
| n8n Orchestrator | Motor de flujos y reglas operativas | Telegram, backend web trigger, jobs programados | Calendar events, mensajes Telegram, writes en Supabase |
| Supabase DB | Source of truth de negocio | Backend y n8n | Datos para CRM y agentes |
| Supabase Storage (`ejercicios`) | Almacen de media de ejercicios | Carga de media en procesos internos | object_key persistido, signed URL JIT |
| Telegram | Canal operacional primario paciente/centro | Mensajes texto/voz | Confirmaciones, recomendaciones y seguimiento |
| Google Calendar | Agenda de citas | n8n W1 | Eventos de cita sincronizados |
| OpenAI Node (n8n) | Razonamiento para seleccion de ejercicios | Sintomas + candidatos de catalogo | JSON estructurado para recomendaciones |

## 3) Trust Boundaries & Secrets

### Boundaries

- **Cliente (Frontend CRM)**:
  - Solo usa credenciales de cliente (anon key) y politicas RLS.
  - Nunca usa service role key.
- **Backend y n8n (server-side)**:
  - Pueden usar service role para operaciones privilegiadas y Storage signed URLs.
  - Deben limitarse a flujos auditables y con request_id.

### Gestion de secretos

- Nunca commitear secretos en el repositorio.
- Variables sensibles en entornos seguros:
  - Backend: `.env` (host seguro, no versionado).
  - n8n: Credentials manager nativo de n8n.
- Secretos esperados:
  - Supabase URL
  - Supabase service role key
  - Telegram bot token
  - Google Calendar OAuth credentials
  - OpenAI API key

## 4) Data Model (conceptual)

La ficha del paciente centraliza trazabilidad completa:

- Identidad y asignacion a fisioterapeuta(s).
- Citas (estado, origen, calendar_event_id).
- Sesiones y notas clinicas de seguimiento.
- Recomendaciones de ejercicios (seleccion, razones, cautelas).
- Comunicaciones inbound/outbound (Telegram, CRM, backend, n8n).
- Auditoria append-only de eventos tecnicos y de negocio.

Regla de negocio transversal:

- Todo evento relevante debe quedar registrado con `request_id`, `patient_id`, canal y estado final.

## 5) Workflows n8n - Detailed Specs

## W0 - Router de Intencion

### Trigger

- Telegram webhook (mensaje entrante).
- Opcionalmente trigger web interno para rutas de CRM.

### Input (contract)

```json
{
  "request_id": "uuid",
  "channel": "telegram",
  "patient_id": "uuid|null",
  "message_text": "string|null",
  "message_voice": {
    "file_id": "string|null",
    "transcript": "string|null"
  },
  "timestamp": "ISO-8601"
}
```

### Output (contract)

```json
{
  "request_id": "uuid",
  "route": "appointment|exercise|session_note|unknown",
  "confidence": 0.0,
  "normalized_payload": {}
}
```

### Error handling

- Reintentos para fallos transitorios de red.
- Si clasificacion falla: ruta `unknown` y mensaje seguro al usuario.
- Registro en `comunicaciones` y `audit_log`.

### Observabilidad minima

- `request_id`, `patient_id`, `channel`, `route`, `status`, `created_at`, `updated_at`.

## W1 - Appointment Agent (Citas)

### Trigger

- Salida de W0 con route `appointment`.

### Input (contract)

```json
{
  "request_id": "uuid",
  "patient_id": "uuid",
  "therapist_id": "uuid|null",
  "action": "create|update|cancel",
  "slot": {
    "start_at": "ISO-8601",
    "end_at": "ISO-8601",
    "timezone": "Europe/Madrid"
  },
  "notes": "string|null"
}
```

### Output (contract)

```json
{
  "request_id": "uuid",
  "status": "confirmed|rejected|cancelled|error",
  "appointment_id": "uuid|null",
  "google_calendar_event_id": "string|null",
  "message_to_patient_es": "string"
}
```

### Reglas

- Verificar conflictos de horario antes de crear/actualizar.
- Persistir cita en Supabase y enlazar `google_calendar_event_id` si existe.
- Confirmar resultado por Telegram.

### Error handling

- Retries para Google API 429/5xx con backoff.
- Idempotencia por `request_id` cuando sea aplicable.
- En error definitivo: log completo + mensaje de fallback al paciente.

### Observabilidad minima

- `request_id`, `patient_id`, `calendar_event_id`, `operation`, `status`, `error_code`, `duration_ms`.

## W2 - Exercise AI Agent

### Trigger

- Salida de W0 con route `exercise`.
- O trigger web de CRM (W3) para invocacion manual asistida.

### Input (contract)

```json
{
  "request_id": "uuid",
  "patient_id": "uuid",
  "therapist_id": "uuid|null",
  "symptoms_text": "string",
  "red_flag_context": ["string"],
  "candidate_exercises": [
    {
      "exercise_id": "string",
      "name": "string",
      "description": "string",
      "contraindications": ["string"]
    }
  ]
}
```

### Output (contract)

```json
{
  "request_id": "uuid",
  "status": "generated|sent|needs_review|error",
  "recommendation_id": "uuid|null",
  "selected_exercises": [
    {
      "exercise_id": "string",
      "object_key": "string",
      "signed_url_ttl_seconds": 1200
    }
  ],
  "message_to_patient_es": "string",
  "message_to_therapist_es": "string"
}
```

### Reglas

- OpenAI solo puede seleccionar entre candidatos entregados por n8n.
- n8n genera signed URLs JIT desde bucket privado `ejercicios`.
- Persistir `object_key` (no signed URL) y log de comunicacion.

### Error handling

- Si no hay candidatos suficientes: devolver follow-up questions.
- Si hay red flags: marcar escalado y mensaje seguro.
- Si falla Storage signing: fallback sin imagen + registro de error.

### Observabilidad minima

- `request_id`, `patient_id`, `channel`, `model_name`, `status`, `red_flags_present`, `created_at`.

## W3 - Web Trigger (Boton CRM)

### Trigger

- Backend endpoint invocado desde boton "Recomendar ejercicios" en CRM.

### Input (contract)

```json
{
  "request_id": "uuid",
  "source": "crm_web",
  "patient_id": "uuid",
  "therapist_id": "uuid",
  "symptoms_text": "string",
  "context": {
    "latest_session_note": "string|null",
    "pain_level": 0
  }
}
```

### Output (contract)

```json
{
  "request_id": "uuid",
  "accepted": true,
  "workflow": "W2",
  "tracking_status": "queued|running|done|error"
}
```

### Error handling

- Respuesta rapida de aceptacion y ejecucion asincrona.
- En fallo de trigger: devolver error controlado al CRM y registrar en audit_log.

## 6) Storage Strategy (Bucket privado)

- Bucket de Supabase Storage: `ejercicios`.
- Configuracion esperada: **private**.
- Convencion de object_key:
  - `ejercicios/{exercise_id}/{filename}`
- Generacion signed URL:
  - n8n (server-side) con service role key.
  - TTL recomendado: 20 minutos (`1200s`) por defecto.
- Regla de persistencia:
  - Guardar `object_key` en DB.
  - No guardar signed URLs en DB.

## 7) Security & RLS Strategy (Admin/Fisioterapeuta)

Modelo de minimo privilegio:

- `admin`: gestion completa operativa y de configuracion.
- `fisioterapeuta`: acceso limitado a pacientes asignados.

Lineas guia RLS:

- `crm_pacientes`: lectura/escritura condicionada por asignacion.
- `crm_notas`, `crm_sesiones`, `crm_citas`, `crm_recomendaciones`: acceso por `patient_id` asignado al fisioterapeuta autenticado.
- `crm_comunicaciones`: lectura por contexto de paciente asignado; escritura mayoritariamente backend/n8n.

Service role:

- Uso exclusivo server-side (backend y n8n).
- Evitar exponer service role en frontend.
- Toda operacion privilegiada debe dejar evidencia en `audit_log`.

## 8) UX Touchpoints

CRM Web (objetivo UX minimo):

- Lista de pacientes con filtros (estado, fisioterapeuta, ultima actividad).
- Detalle de paciente (timeline unificada):
  - Citas
  - Sesiones/notas
  - Recomendaciones/ejercicios
  - Comunicaciones
- Boton "Recomendar ejercicios":
  - lanza trigger web (W3)
  - muestra estado de ejecucion
  - permite revisar mensaje final enviado

Telegram (intents base):

- Citas: "quiero cita", "cambiar cita", "cancelar cita".
- Ejercicios: "me duele lumbar", "necesito ejercicios para hombro".
- Nota de sesion: resumen breve post-tratamiento.

## 9) Migration Path (Non-breaking)

### Fase 1

- Documentacion de arquitectura y reglas.
- Propuesta SQL aditiva (`schema_vnext.sql`).
- Bucket privado `ejercicios`.

### Fase 2

- Implementacion progresiva de workflows n8n W0/W1/W2/W3.
- Logging estructurado por `request_id`.

### Fase 3

- Cableado del boton CRM a backend -> n8n.
- Visualizacion CRM de citas/notas/recomendaciones con imagenes on-demand.

Condicion de continuidad:

- Mantener pipeline de video en estado PAUSADO, sin borrar historial ni artefactos previos.
