# Checkpoint 2026-03-18 - Google Calendar gate before real mirror sync

## Commit exacto
- `c651966`

## Estado real verificado en produccion
- La agenda del CRM ya muestra observabilidad de sincronizacion y deja ver si `W6 Calendar Sync` esta al dia o no.
- El workflow `Fisio_IA_Agent / W6 Calendar Sync` existe en n8n y sigue programado cada 2 minutos.
- El bloqueo real no esta en el frontend ni en n8n: esta en el backend desplegado.
- El endpoint vivo `GET /api/profesional/appointments/sync-calendar/status` devuelve:
  - `enabled: false`
  - `status: idle`
  - `last_run_at: null`
  - `last_success_at: null`
- Eso confirma que la integracion directa con Google Calendar sigue desactivada en runtime del backend y que, por tanto, la agenda todavia no puede comportarse como espejo real del calendario.

## Lo que ya esta hecho
### Backend
- Archivo: `backend/src/routes/professional.js`
- Estado interno del sincronizador background anadido con heartbeat de inicio, exito y error.
- Endpoint nuevo: `GET /api/profesional/appointments/sync-calendar/status`.
- El endpoint `POST /api/profesional/appointments/sync-calendar` ya actualiza ese heartbeat.

### Frontend
- Archivo: `frontend/src/pages/index.astro`
- La vista `Agenda` ahora ensena el estado del sincronizador W6.
- Muestra chips tipo `Al dia`, `Sincronizando`, `Con retraso`, `Error` o `Solo vista`.
- Resume frescura del ultimo sync y conteo de nuevas, actualizadas y canceladas.

### n8n
- Workflow activo: `Fisio_IA_Agent / W6 Calendar Sync`
- Workflow id: `kq7EvZp2Y1X1E6Mk`
- Frecuencia: cada 2 minutos

## Diagnostico exacto
La agenda y Google Calendar no coinciden todavia porque falta configuracion en el backend productivo. Sin estas variables, `calendarIntegrationEnabled()` devuelve `false`:
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- opcional: `GOOGLE_CALENDAR_REQUIRED=true`

Mientras esto no este publicado en EasyPanel y redesplegado el backend:
- `W6` no puede leer Google Calendar de verdad desde backend
- no deja heartbeat real de sync completado
- la agenda se queda en reconciliacion parcial / solo vista CRM
- borrados, altas y bloqueos de Google Calendar no entran como espejo operativo completo

## Siguiente paso exacto para la proxima sesion
1. Publicar en EasyPanel del backend:
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - opcional: `GOOGLE_CALENDAR_REQUIRED=true`
2. Redeploy de `fisio-backend`.
3. Comprobar que `GET /api/profesional/appointments/sync-calendar/status` pasa a `enabled: true` y empieza a registrar `last_success_at`.
4. En cuanto eso este activo, continuar con:
   - espejo real del calendario clinico
   - bloqueos / no disponibilidad desde Google Calendar
   - envio real por Telegram desde el copilot
   - observabilidad ampliada en agenda con ultimo sync, proximo ciclo y trazas de errores recientes

## Deploy
- Frontend: desplegado con observabilidad de agenda.
- Backend: necesita las variables de Google Calendar para desbloquear la sync real.

## Validacion ya hecha
- `node --check backend/src/routes/professional.js` OK
- `npm exec astro check` OK (0 errors, 0 warnings, 11 hints)
- `scripts/frontend-local-build.ps1` OK
- GitHub sincronizado en `origin/main` con `c651966`
