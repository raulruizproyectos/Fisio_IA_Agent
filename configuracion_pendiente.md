# Configuracion pendiente

## Estado vivo - 2026-05-25
- GitHub: saneamiento del Copiloto IA publicado en `origin/main`.
- Commit publicado: `14790592fed128fd38e4eef4c252c8cb25c4870b`.
- Frontend: Copiloto IA corregido como drawer lateral canonico en `assistant-rail.css`; pendiente smoke visual real y redeploy EasyPanel.
- Backend: sin cambios en esta intervencion.
- n8n produccion: actualizado directamente por API. Los 11 workflows del proyecto estan activos y renombrados como `Fisio IA | ...`.
- Workflow clave de ejercicios: `Fisio IA | Ejercicios` activo, contiene `system_prompt`, `prompt_version` y reenvia el prompt al motor.
- Repo n8n: JSON versionados alineados con los nombres nuevos y conexiones validadas.

## Actualizacion 2026-05-25
- Eliminados enforcers JS de layout del Copiloto (`style.setProperty(..., 'important')`).
- Eliminados bloques globales `assistant-*` redundantes en `index.astro`.
- `global-shell.css` y `premium-clinic-ui.css` ya no definen reglas `#assistantRail`.
- `premium-clinic-ui.css` conserva un unico bloque `:root`.
- Validado localmente: `frontend` check/build OK.
- Rebase sobre `origin/main` resuelto antes del push; se conserva el `index.astro` compacto del remoto.

## Actualizacion 2026-05-18
- Redisenio premium aplicado en shell, navegacion, topbar, documentos, tablas, formularios y copiloto IA.
- Validado localmente: `frontend` check/build OK y `backend` lint OK.
- Copiloto IA rehecho despues del deploy: conversacion con scroll propio, composer fijo, rail clinico compacto y acciones rapidas.

## Validado
- `frontend`: `npm.cmd run check` OK.
- `frontend`: `npm.cmd run build` OK.
- `backend`: `npm.cmd run lint` OK.
- n8n remoto: 11 workflows `Fisio IA | ...` activos.
- n8n local: JSON parse OK y conexiones sin nodos faltantes.

## Pendiente operativo
1. Smoke visual local o en preview del Copiloto IA.
2. Redeploy `fisio-frontend` en EasyPanel desde `main`.
3. Hard refresh y comprobar que el Copiloto no cubre el dashboard en desktop.
4. Smoke test: Inicio, Pacientes, Copiloto IA, generar plan de ejercicios, Agenda, Finanzas, Documentos.
5. Confirmar que el plan IA devuelve contenido con el prompt premium y queda registrado en historial.
6. Si se ve UI antigua: revisar cache/commit desplegado antes de cambiar codigo.

## Servicios
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Backend: `https://fisio-backend.b5xbaf.easypanel.host`
- Supabase/n8n: ver `.env.local` local.

## Principio de continuidad
Leer primero `README.md`, `docs/SESSION_CURRENT.md` y este archivo. El detalle historico queda en Git.
