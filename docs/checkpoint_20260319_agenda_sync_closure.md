## Checkpoint: Cierre operativo Agenda Calendar <-> CRM

**Fecha:** 2026-03-19 (Sesion 109)
**Codigo productivo ya publicado:** `2dfbb6f`, `62729ec`, `1dc252f`

### Estado real al cierre
- `fisio-backend` en produccion ya expone:
  - `POST /api/profesional/appointments/check-availability`
  - `GET /api/profesional/appointments/sync-calendar/status` con `next_expected_at`
  - metadata por cita `calendar_sync_state` y `calendar_origin`
- `fisio-frontend` en produccion ya muestra:
  - columna `Espejo`
  - facts del sincronizador (`agendaSyncFacts`)
  - labels saneados, sin mojibake
- W5 remoto devuelve `busy_events` y `events`.
- Las citas canceladas o sin evento activo ya no se presentan como `linked`; ahora salen `crm_only`.

### Verificaciones cerradas
```text
GET  /api/profesional/appointments/sync-calendar/status
-> incluye next_expected_at

POST /api/profesional/appointments/check-availability  {}
-> 400 (ruta viva en produccion)

Frontend productivo
-> contiene Espejo + agendaSyncFacts y ya no contiene mojibake

GET /api/profesional/appointments?... 
-> devuelve calendar_sync_state=crm_only para citas canceladas sin evento activo
```

### Lo que falta de verdad
1. Localizar o crear un `busy_event` activo/no cancelado para demostrar un caso vivo `available=false`.
2. Si ese caso queda validado, decidir si la UI debe pintar tambien el bloqueo en la parrilla semanal.
3. Retomar Telegram/copilot cuando agenda quede cerrada del todo.

### Regla de arranque para la proxima sesion
- Leer primero `configuracion_pendiente.md` y este checkpoint.
- Validar `GET /api/profesional/appointments/sync-calendar/status` antes de tocar frontend.
- Para validar frontend, usar `scripts/frontend-local-build.ps1` en copia aislada; no confiar en `G:` para `astro`.
