## Checkpoint: Sesion 113 — Corrección completa agente Telegram de citas

**Fecha:** 2026-04-01
**Rama:** `main`
**Último commit:** `51a4227`

### Resumen
Sesión dedicada a depurar y corregir el agente de citas de Telegram (bot citas_fisioterapia_CarlaJL).
Se resolvieron 7 bugs encadenados que impedían el funcionamiento end-to-end.

---

### Bugs resueltos

#### 1. W6 OAuth2 Google Calendar caducado
- **Síntoma:** Citas se creaban en BD pero no aparecían en Google Calendar
- **Fix:** Reautorizar credencial OAuth2 en n8n UI (Settings → Credentials)
- **Commit:** — (cambio en n8n UI)

#### 2. W1: `ignoreResponseCode` no funciona en n8n typeVersion 4.2
- **Síntoma:** Al intentar crear cita en slot ocupado (409), n8n lanzaba AxiosError en lugar de pasar el body. `Build Backend Response` no detectaba el 409 → siempre retornaba `status: 'error'` en lugar de `slot_not_available`
- **Fix:** `neverError: true` en opciones del nodo HTTP + mejora detección en `Build Backend Response` (extrae status de error.message si no viene en body)
- **Commit:** `5c41f52`

#### 3. W1: `request_id` formato inválido para UUID
- **Síntoma:** W1 generaba `req_timestamp_random` pero `crm_citas.request_id` es tipo UUID → error SQL al insertar
- **Fix:** Generar UUID real con función `uuid()` en `Build Backend Payload`
- **Commit:** `5c41f52`

#### 4. Bucle infinito día↔hora en el agente
- **Síntoma:** Usuario decía "martes" → bot pedía hora → usuario decía "a las 11" → bot pedía día → loop eterno
- **Causa:** Al guardar `missingTime`/`missingDay`, se guardaba `pendingSlot = null` → `resolveSlot` no podía combinar los fragmentos
- **Fix:** Guardar `partialDaySlot` (con fecha, hora placeholder 12:00) cuando `missingTime`, y `partialHourSlot` (fecha placeholder 1970-01-01, hora real) cuando `missingDay`. `resolveSlot` actualizado para combinar ambos casos.
- **Commit:** `2843d5e`

#### 5. Typos en hora no reconocidos
- **Síntoma:** "a asl 11", "a lsa 9" no se parseaban como horas
- **Fix:** Añadir `.replace(/\ba\s+asl\b/g, 'a las')` y `.replace(/\ba\s+lsa\b/g, 'a las')` en `normalizeAppointmentText`
- **Commit:** `2843d5e`

#### 6. "martes 14" parseado como próximo martes (7 abril) ignorando el 14
- **Síntoma:** Parser encontraba "martes" → calculaba próximo martes desde hoy (= 7 abril) → ignoraba el número "14" posterior
- **Fix:** Detectar número explícito tras nombre de día con regex; si existe, usarlo como día del mes y buscar el mes donde ese número coincida con el día de semana indicado
- **Commit:** `51a4227`

#### 7. slot_not_available borraba el día del contexto
- **Síntoma:** Slot ocupado → bot pedía otra hora → usuario decía "a las 12" → bot pedía el día de nuevo (loop)
- **Fix:** Al retornar `slot_not_available`, guardar `dayOnlySlot` en `pendingSlot` con la fecha del slot fallido. El usuario puede decir solo "a las 12" y `resolveSlot` combina con el día conservado.
- **Commit:** `51a4227`

---

### Estado BD
- Citas de test de sesión 113 canceladas: c3642a5a, 613c1134, 8634f018, 4cf9fb0b, 576c5bdb
- 7/7 readiness OK

### Estado n8n
- W1 Agenda de Citas: actualizado via API (cTp8bORuSL9hsdDk)
- Google Calendar OAuth2: reautorizado

### Pendiente para próxima sesión
1. Test funcional E2E Telegram tras redeploy backend en EasyPanel
2. Confirmar redeploy frontend (dashboard limpio sesión 112)
3. Roadmap #9: Reserva online pública
