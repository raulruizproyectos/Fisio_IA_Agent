# Configuracion pendiente

## Estado vivo - 2026-05-19
- GitHub: `main` alineado y publicado hasta `bfb88dc` antes de este cierre docs.
- Frontend: redisenio premium y fixes del copiloto publicados en GitHub, pendiente redeploy EasyPanel para verlos en produccion si no se ha hecho.
- Backend: prompt premium versionado del agente de ejercicios publicado en GitHub, pendiente redeploy EasyPanel para que el backend envie siempre el prompt nuevo.
- n8n produccion: actualizado directamente por API. Los 11 workflows del proyecto estan activos y renombrados como `Fisio IA | ...`.
- Workflow clave de ejercicios: `Fisio IA | Ejercicios` activo, contiene `system_prompt`, `prompt_version` y reenvia el prompt al motor.
- Repo n8n: JSON versionados alineados con los nombres nuevos y conexiones validadas.

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
1. Redeploy `fisio-frontend` en EasyPanel desde `main`.
2. Redeploy `fisio-backend` en EasyPanel desde `main`.
3. Hard refresh y comprobar que se ve el redisenio del copiloto y CRM.
4. Smoke test: Inicio, Pacientes, Copiloto IA, generar plan de ejercicios, Agenda, Finanzas, Documentos.
5. Confirmar que el plan IA devuelve contenido con el prompt premium y queda registrado en historial.
6. Si se ve UI antigua: revisar cache/commit desplegado antes de cambiar codigo.
7. Si se ve UI nueva: ajustar espaciado, responsive y detalles premium.

## Servicios
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Backend: `https://fisio-backend.b5xbaf.easypanel.host`
- Supabase/n8n: ver `.env.local` local.

## Principio de continuidad
Leer primero `README.md`, `docs/SESSION_CURRENT.md` y este archivo. El detalle historico queda en Git.
