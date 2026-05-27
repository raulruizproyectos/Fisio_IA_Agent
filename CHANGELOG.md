# Changelog

Resumen compacto. Detalle completo en `git log`.

## 2026-05-27
- EasyPanel restaurado: el bloqueo era acceso Git a repo privado, resuelto con Deploy Key/SSH.
- Backend endurecido para deploy: health en `/`, `/health`, `/api/health`; soporte puerto plataforma, `3001` y compat `3000`.
- Backend Nixpacks fijado a Node 20 con start `node src/index.js`.
- Documentacion actualizada para retomar sesion sin repetir diagnostico.

## 2026-05-26
- Copiloto IA corregido: apertura/cierre estable, drawer desktop, panel movil.
- UI CRM pulida: sidebar, dashboard, pacientes, Mensajes y layout responsive global.
- Mensajes: filtros y listado ajustados; tabla pasa a cards en anchos reducidos.
- Agenda: calendario semanal visual con columnas por dia, horas, eventos, bloqueos y festivos Google Calendar.
- Validado frontend: `npm.cmd run check` OK y `npm.cmd run build` OK.

## 2026-05-25
- `assistant-rail.css` definido como fuente canonica del Copiloto IA.
- Retirados overrides redundantes del assistant en `index.astro`, `global-shell.css` y `premium-clinic-ui.css`.
- Documentacion operativa compactada.

## 2026-05-20
- Modales migrados a Nanostores y CustomEvents.
- Hotfix de `ConfirmDialog` y estilos globales tras extraccion de componentes.

## 2026-05-18
- Redisenio premium CRM: shell, navegacion, tablas, formularios y Copiloto.
- Prompt premium de ejercicios versionado y enviado a n8n.

## 2026-05-12
- Dashboard y Pacientes migrados a markup `ops-*`.
- Tipografia unificada y reduccion de cajas visuales.
