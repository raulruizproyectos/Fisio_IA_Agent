## Checkpoint: check-availability CRM validado + W6 Calendar Writer importado

**Fecha:** 2026-03-23 (Sesion 110)
**Commits:** `5a64b2e`

### Estado real al cierre

#### Backend (produccion)
- `POST /api/profesional/appointments/check-availability` con conflicto CRM → `available:false`, `source:crm` OK.
- `POST /api/profesional/appointments/check-availability` en hueco libre → `available:true` OK.
- Fix: cuerpo vacio de W5 ya no crashea con `JSON.parse`; devuelve `{events:[],busy_events:[]}`.
- `fisioterapeuta_id` productivo resuelto: `6dae4ef6-b6b3-4cb0-91d9-0320d10db255`.

#### n8n (produccion)
- 10 workflows Fisio_IA_Agent activos.
- W6 Calendar Writer nuevo: id `d1r1Vn1uRNwp36p5`, webhook `POST /fisio/w6/calendar-write`.
- W5 tiene fix `alwaysOutputData:true` en nodo `Get Calendar Events`.
- API key invalidada por deploy del usuario — obtener nueva en Settings → API.

#### Pendiente de verificar
- W5 y W6 Writer responden HTTP 200 con cuerpo vacio (0 nodos ejecutados). Posibles causas:
  1. Credencial OAuth2 Google Calendar caducada → reautorizar en n8n Credentials.
  2. Webhook registration stale tras el deploy → desactivar/reactivar ambos workflows.
- Caso vivo `available=false` con `source:google_calendar` aun no validado (necesita evento real en Calendar).

### Regla de arranque para la proxima sesion
1. Leer `configuracion_pendiente.md` y este checkpoint.
2. Obtener nueva API key de n8n.
3. Verificar W5 con: `curl -X POST https://n8n-n8n.b5xbaf.easypanel.host/webhook/fisio/w5/calendar-events -H "Content-Type: application/json" -d '{"time_min":"HOY","time_max":"HOY+7dias"}'`
   - Si responde con JSON: OK.
   - Si responde con cuerpo vacio: reautorizar credencial Google Calendar en n8n y/o desactivar-reactivar W5.
4. Crear evento en Google Calendar y validar `available=false` con `source:google_calendar`.
