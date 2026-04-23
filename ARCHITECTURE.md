# Fisio_IA_Agent - Arquitectura Objetivo (Pivot CRM + Agents)

## 1) Overview

El sistema evoluciona a una plataforma de operacion para centros de fisioterapia con dos capas:

- CRM Web para gestion clinica y operativa.
- Agentes conversacionales/orquestados para citas y recomendaciones de ejercicios.

Estado de alcance:

- En foco: CRM + Telegram + n8n + Supabase + Google Calendar + OpenAI.
- Fuera de alcance: generacion de video (eliminada de frontend y flujos n8n activos).

Principios de producto reforzados (benchmark funcional del mercado):

- Prevencion activa y deteccion temprana de deterioro funcional.
- Continuidad asistencial entre canales (Telegram <-> CRM).
- Interoperabilidad basada en datos estructurados y trazabilidad.
- IA confiable: recomendaciones prudentes, auditables y con gobernanza de datos.

Checkpoint de producto actual (2026-04-22, Sesion 120):

- El Copilot clinico del CRM queda reencauzado como componente con una unica fuente de verdad visual.
- El layout final vigente se define en `frontend/src/pages/index.astro` mediante `assistant-clinical-layout-reset-20260422`.
- El rail incluye marcador de verificacion de despliegue: `data-copilot-build="clinical-reset-20260422"`.
- El dashboard pasa a funcionar como cockpit diario, no como mapa completo de todas las funcionalidades.
- `Inicio` prioriza agenda, mensajes, pacientes, plan IA y cobros; documentos, biblioteca, historial, reserva y finanzas avanzadas quedan como modulos secundarios.
- La navegacion financiera se consolida en una entrada `Finanzas`; `Pagos`, `Facturas`, `Bonos` y `Gestoria` siguen siendo paginas existentes pero se presentan como pestanas internas.
- La ficha de paciente prioriza continuidad: el rail lateral se compacta en una unica tarjeta con accion principal, canales y pendientes prioritarios.
- Decision arquitectonica:
  - no seguir acumulando bloques CSS correctivos para el Copilot,
  - no ocultar bloques funcionales del dashboard con overrides globales,
  - simplificar primero navegacion/UX antes de fusionar contratos backend o modelos de datos,
  - evitar rails laterales con tarjetas estrechas y listas largas; resumir en estado + siguiente accion,
  - cualquier ajuste futuro debe tocar el reset clinico final o extraer el componente a modulo dedicado,
  - evitar estilos inline JS para layout salvo apertura/cierre del overlay,
  - historial y recomendaciones deben degradar en modo parcial si falla una dependencia secundaria.
- Estado operativo:
  - frontend validado con `npm run check` y `npm run build` tras la simplificacion de `Inicio`, `Finanzas` y ficha de paciente,
  - pendiente validar visualmente en EasyPanel tras redeploy.

Checkpoint de producto actual (2026-03-19, Sesion 109):

- La agenda productiva ya opera como espejo visible Calendar <-> CRM y muestra estados por cita en el frontend.
- El backend expone `calendar_sync_state` (`crm_only`, `linked`, `backfilled`, `calendar_only`) y `POST /api/profesional/appointments/check-availability` para dry-run seguro.
- W5 sigue siendo la ruta de lectura activa de Google Calendar via n8n OAuth2, sin requerir Service Account.
- W6 mantiene heartbeat visible en CRM y `GET /api/profesional/appointments/sync-calendar/status` ya expone `expected_interval_ms` y `next_expected_at`.
- Las citas CRM cuyo evento ya no existe o esta cancelado en Calendar dejan de presentarse como `linked` y pasan a `crm_only`, evitando falsos positivos de espejo.
- Queda pendiente una validacion viva de `available=false` con un `busy_event` realmente activo; en la ventana probada no habia bloqueos reales no cancelados.
## 2) Component Map

| Componente | Rol | Entradas | Salidas |
| --- | --- | --- | --- |
| Frontend CRM (Astro) | UI de gestion de pacientes, sesiones, citas y recomendaciones | Usuario autenticado | Llamadas a backend y visualizacion de datos |
| Backend (Node/Express) | Capa de entrega robusta: API, auth, persistencia, polling, PDF y archivado | CRM Web y Telegram | Llamadas seguras a n8n, writes en Supabase, PDF compartido, trazabilidad |
| n8n Orchestrator | Agente clinico oficial y motor de orquestacion | Telegram, triggers del backend, jobs programados | Decision clinica, routing, mensajes, reglas operativas y eventos de negocio |
| Supabase DB | Source of truth de negocio | Backend y n8n | Datos para CRM y agentes |
| Supabase Storage (`ejercicios`) | Almacen de media de ejercicios | Carga de media en procesos internos | object_key persistido, signed URL JIT |
| Telegram | Canal operacional primario paciente/centro | Mensajes texto/voz | Confirmaciones, recomendaciones y seguimiento |
| Google Calendar | Agenda de citas | n8n W1 | Eventos de cita sincronizados |
| OpenAI Node (n8n) | Razonamiento para seleccion de ejercicios | Sintomas + candidatos de catalogo | JSON estructurado para recomendaciones |

## 2.1) Principio de orquestacion hibrida

- El backend es la frontera autoritativa del producto: contratos API, auth, persistencia, jobs async, PDF y trazabilidad.
- n8n orquesta la logica conversacional, la automatizacion y el razonamiento clinico donde aporta mas velocidad de iteracion.
- La generacion final del PDF se mantiene en backend para compartir exactamente el mismo documento entre CRM y Telegram.
- El frontend solo presenta el resultado y dispara acciones, sin decidir logica clinica ni exponer detalles internos como n8n al usuario final.

## 2.2) Contrato de agenda Calendar <-> CRM

- Read path: `GET /api/profesional/appointments` toma `crm_citas`, reconcilia con W5/direct Calendar y devuelve una lista fusionada para la agenda.
- Estados de espejo por cita:
  - `crm_only`: existe en CRM pero no hay evento activo equivalente en Calendar. Incluye citas historicas cuyo evento ya fue cancelado o desaparecio.
  - `linked`: existe una cita CRM enlazada a un evento activo de Google Calendar.
  - `backfilled`: el evento existia en Calendar, se persistio en CRM y queda ya enlazado.
  - `calendar_only`: bloque detectado en Calendar sin correspondencia persistida en CRM.
- Observabilidad: `GET /api/profesional/appointments/sync-calendar/status` expone `ui_status`, `last_success_at`, `last_error_at`, `expected_interval_ms` y `next_expected_at`.
- Write path: la creacion/edicion usa `resolveAppointmentAvailability()` y cruza conflictos locales CRM con bloques ocupados de Calendar.
- Dry-run: `POST /api/profesional/appointments/check-availability` permite validar disponibilidad sin escrituras.
- Operacion real a fecha de cierre: W5 devuelve la vista activa de Calendar; si no hay `busy_events` activos, la agenda puede quedar solo con citas CRM historicas/canceladas correctamente marcadas como `crm_only`.
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
  "route": "appointment|exercise|session_note|triage_needed|unknown",
  "confidence": 0.0,
  "normalized_payload": {}
}
```

### Error handling

- Reintentos para fallos transitorios de red.
- Si falta contexto clinico minimo en mensajes de sintomas vagos: ruta `triage_needed` con solicitud de aclaracion segura.
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

### Regla obligatoria: Responsive Design (PC + MÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil)

Todo el frontend CRM debe ser completamente funcional y visualmente accesible tanto en **escritorio** como en **dispositivos mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³viles** (smartphones y tablets).

Principios responsive:

- **Mobile-first CSS**: diseÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±ar primero para mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil, ampliar para desktop con `@media (min-width: ...)`.
- **Sidebar**: colapsable en mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil (hamburger menu o drawer), visible en desktop.
- **Tablas de datos**: scroll horizontal en pantallas pequeÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±as o layout de tarjetas en mobile.
- **Topbar/Header**: compacto en mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil, con menÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº hamburguesa si aplica.
- **Panel de Agente IA / Chat**: a ancho completo en mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil (100vw), panel lateral en desktop.
- **Botones y targets tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ctiles**: mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nimo 44x44px en mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil (estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ndar WCAG).
- **TipografÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a**: escalado fluido (`clamp()` o media queries) para legibilidad en todas las pantallas.
- **MÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©tricas/Cards del dashboard**: layout de 1 columna en mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil, grid multi-columna en desktop.
- **Formularios e inputs**: ancho completo en mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil, no overflow horizontal.
- **Viewport meta tag**: obligatorio `<meta name="viewport" content="width=device-width, initial-scale=1">`.

Todo cambio de frontend debe verificarse visualmente en al menos:

- Desktop (~1280px+)
- MÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vil (~375px)

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
- Bot pacientes/citas: entrada por texto y nota de voz Telegram; la voz se transcribe antes de clasificar la intencion.

- Ejercicios: "me duele lumbar", "necesito ejercicios para hombro".
- Nota de sesion: resumen breve post-tratamiento.
- Triage inicial recomendado en agente de ejercicios:
  - localizacion del dolor
  - inicio/tiempo de evolucion
  - factor que empeora/mejora
  - antecedentes o tratamiento previo

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

- Mantener el flujo centrado en informe clÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nico de ejercicios (sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ntomas -> selecciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n -> imÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡genes/pautas -> entrega CRM/Telegram).
