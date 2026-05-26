# Session Checkpoint

Lee `PROJECT_CONTEXT.md`.

## Ultimos cambios publicados
- Copiloto IA: drawer/panel responsive estable.
- Mensajes: layout responsive sin cortes en portatil.
- Agenda: calendario semanal visual; Google Calendar aparece como citas, bloqueos o festivos.

## Validacion habitual
```powershell
cd frontend; npm.cmd run check; npm.cmd run build
cd backend; npm.cmd run lint
```

## Cuidado
- No tocar secretos.
- No romper IDs/data hooks del frontend.
- No mezclar cambios locales backend/sidebar con fixes UI.
