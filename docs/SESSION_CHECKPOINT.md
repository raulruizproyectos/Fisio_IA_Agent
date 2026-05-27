# Session Checkpoint

Lee `PROJECT_CONTEXT.md`.

## Ultimos cambios publicados
- Copiloto IA: drawer/panel responsive estable.
- Mensajes: layout responsive sin cortes en portatil.
- Agenda: calendario semanal visual; Google Calendar aparece como citas, bloqueos o festivos.
- EasyPanel: repo privado requiere Deploy Key/SSH; usar `git@github.com:raulruizproyectos/Fisio_IA_Agent.git`.
- Backend: health aliases `/`, `/health`, `/api/health`; soporte `PORT`, `3001`, compat `3000`; Node 20 fijado en Nixpacks.

## Validacion habitual
```powershell
cd frontend; npm.cmd run check; npm.cmd run build
cd backend; npm.cmd run lint
```

## Cuidado
- No tocar secretos.
- No romper IDs/data hooks del frontend.
- No mezclar cambios locales backend/sidebar con fixes UI.
- Build paths EasyPanel van sin slash inicial: `frontend` y `backend`.
