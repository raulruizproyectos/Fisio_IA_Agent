# Configuracion pendiente

## Estado vivo - 2026-05-12
- GitHub: cambios publicados en `main` hasta redisenio funcional `f589384`.
- Frontend: Dashboard y Pacientes usan markup `ops-*` para reducir cajas heredadas.
- Backend: sin cambios en esta sesion.
- Produccion: pendiente redeploy manual de `fisio-frontend` en EasyPanel.

## Validado
- `frontend`: `npm.cmd run check` OK.
- `frontend`: `npm.cmd run build` OK.
- Bundle JS actual reportado: `8Xqq_Vbu.js` (236.10 KB / 62.77 KB gzip).

## Pendiente operativo
1. Redeploy `fisio-frontend` en EasyPanel.
2. Hard refresh y comprobar que se ve el redisenio `ops-*`.
3. Smoke test: Inicio, Pacientes, Copiloto IA, Agenda, Finanzas, Documentos.
4. Si se ve UI antigua: revisar cache/commit desplegado antes de cambiar codigo.
5. Si se ve UI nueva: ajustar espaciado, responsive y detalles premium.

## Servicios
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Backend: `https://fisio-backend.b5xbaf.easypanel.host`
- Supabase/n8n: ver `.env.local` local.

## Principio de continuidad
Leer primero `README.md`, `docs/SESSION_CURRENT.md` y este archivo. El detalle historico queda en Git.
