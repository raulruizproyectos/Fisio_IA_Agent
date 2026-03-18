# Checkpoint 2026-03-18 - Agenda sync + sidebar pending

## Commit exacto
- `d5fe6de`

## Estado real al cerrar la sesion
- El copilot de ejercicios ya ha salido de la fase de rotura grave y vuelve a ser una base valida para seguir desarrollando.
- La agenda del CRM ya no trabaja solo con `crm_citas`: ahora reconcilia la ventana semanal consultada contra Google Calendar.
- El frontend refresca agenda cada 45 segundos y al volver a enfocar la pestana.
- `Mensaje paciente` se aparta del primer nivel del copilot hasta que pueda enviar una comunicacion real al paciente y dejar rastro clinico.

## Lo ultimo implementado
### Backend
- Archivo: `backend/src/routes/professional.js`
- `GET /api/profesional/appointments` ahora:
  - actualiza eventos movidos si estan vinculados por `google_calendar_event_id`
  - marca como cancelados los vinculados que desaparecen o llegan cancelados desde Google Calendar
  - devuelve filas sinteticas para eventos presentes en Calendar dentro de la ventana aunque aun no exista fila local equivalente

### Frontend
- Archivo: `frontend/src/pages/index.astro`
- La agenda se recarga automaticamente en Inicio y Agenda:
  - cada 45 segundos
  - al volver a enfocar la pestana

## Pendiente inmediato de la proxima sesion
1. Montar sincronizacion background real de Google Calendar via n8n o backend.
2. Corregir la desaparicion de etiquetas en la sidebar cuando el colapso automatico entra demasiado pronto.
3. Seguir el desarrollo funcional del agente de ejercicios y de la agenda sobre esta base.

## Deploy pendiente
- `fisio-backend`
- `fisio-frontend`

## Validacion ya hecha
- `node --check backend/src/routes/professional.js` OK
- `astro check` OK en copia limpia
- `astro build` OK en copia limpia
