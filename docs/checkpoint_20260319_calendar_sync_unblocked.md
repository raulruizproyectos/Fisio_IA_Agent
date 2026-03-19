## Checkpoint: Calendar Sync Desbloqueado via W5/n8n OAuth2

**Fecha:** 2026-03-19 (Sesion 106)
**Commit:** `7a86b7f` (docs) + `6165b7b` (feat)

### Cambios clave
1. `professional.js` refactorizado: `calendarIntegrationEnabled()` ahora soporta modo W5 (n8n OAuth2) sin necesitar Service Account.
2. `GOOGLE_CALENDAR_ID=raul.ruiz.diaz.bcn@gmail.com` publicada en EasyPanel `fisio-backend`.
3. Redeploy exitoso de `fisio-backend`.

### Verificacion E2E en produccion
```json
GET /api/profesional/appointments/sync-calendar/status
→ { "enabled": true, "mode": "w5", "calendar_id": "raul.ruiz.diaz.bcn@gmail.com" }

POST /api/profesional/appointments/sync-calendar
→ { "source": "w5_reader", "status": "ok", "ui_status": "healthy", "appointments_considered": 4 }

GET /api/health → { "status": "ok" }
```

### Modo de operacion
- **Sin Service Account**: el backend delega la lectura de Calendar al workflow W5 de n8n, que usa OAuth2 personal del profesional.
- **Con Service Account** (futuro): si se publican `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`, el backend cambiara automaticamente a modo `direct` (JWT) para lectura/escritura directa.

### Variables de entorno publicadas en EasyPanel
| Variable | Valor |
|----------|-------|
| `GOOGLE_CALENDAR_ID` | `raul.ruiz.diaz.bcn@gmail.com` |
| `GOOGLE_CALENDAR_TIMEZONE` | `Europe/Madrid` (ya estaba) |
| `GOOGLE_CALENDAR_REQUIRED` | `false` (ya estaba) |
| `GOOGLE_CLIENT_EMAIL` | (vacio - no necesario para modo W5) |
| `GOOGLE_PRIVATE_KEY` | (vacio - no necesario para modo W5) |

### Proximo paso
1. Verificar reconciliacion real de citas Calendar <-> CRM en la UI del frontend.
2. Bloqueos / no disponibilidad desde Google Calendar.
3. Envio real por Telegram desde el copilot.
4. Observabilidad ampliada en agenda.
