# Session Current

## Estado
- Fecha: 2026-05-27.
- Rama: `main`.
- Fuente rapida: `PROJECT_CONTEXT.md`.
- EasyPanel ya funciona. Bloqueo resuelto: el repo privado necesitaba Git key/Deploy Key valida; el error no era el codigo.
- `origin/main` incluye fixes de Copiloto, Mensajes, responsive global, Agenda semanal visual y backend health/puertos para EasyPanel.
- Working tree local principal contiene cambios backend/sidebar previos no relacionados; no mezclarlos sin revisar.

## Validado
- Frontend `npm.cmd run check`: OK.
- Frontend `npm.cmd run build`: OK.
- Backend `npm.cmd run lint`: OK.

## Pendiente inmediato
1. Smoke visual en EasyPanel: Inicio, Pacientes, Mensajes, Agenda, Finanzas, Documentos, Copiloto.
2. Confirmar que backend muestra logs nuevos con `0.0.0.0`/Node 20 si se redepliega.
3. Revisar cambios backend locales antes de cualquier commit de backend.
