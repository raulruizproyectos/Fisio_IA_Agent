# Configuracion pendiente

## Estado vivo - 2026-05-07
- GitHub: `main` sincronizado hasta `53f4a2d`.
- Frontend:
  - fix de navegacion `Finanzas`/`Documentos` consolidado,
  - ajustes de rail IA en commits `c519b13` y `53f4a2d` (chat-first + estado vacio util).
- Backend: warning de lint eliminado en `professional.js`.
- Pendiente manual: redeploy de `fisio-frontend` en EasyPanel.
- Asset esperado tras deploy: HTML con `__fisioShellNavigate` y bundle IA nuevo (ultimo local: `...BT9OP7ob.js`).

## Validado localmente
- `npm run lint` en `backend`: OK.
- `npm.cmd run check` en `frontend`: OK.
- `npm.cmd run build` en `frontend`: OK.
- `git diff --check`: OK salvo aviso normal LF/CRLF.

## Smoke test tras redeploy
1. Abrir produccion y refrescar fuerte.
2. Click en `Finanzas`: debe abrir resumen de pagos, no Agenda.
3. Click en `Documentos`: debe abrir documentos, no Agenda.
4. Click en `Agenda`: debe abrir agenda.
5. Click en tabs de Finanzas: `Pagos`, `Facturas`, `Bonos`, `Gestoria`.
6. Abrir agente IA y validar:
   - no aparece hueco grande inutil bajo los controles,
   - `chat-log` ocupa la mayor parte del rail,
   - estado vacio del chat muestra sugerencias rapidas.

## Siguiente bloque recomendado
1. Confirmar visualmente produccion tras redeploy.
2. Si rail IA sigue inconsistente en produccion, hacer refactor estructural del rail (modulo separado) y retirar cascada legacy en vez de seguir apilando overrides.
3. Prioridad de deuda: reducir el monolito `frontend/src/pages/index.astro` empezando por `assistant rail` y `router/shell`.

## Variables y servicios utiles
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Backend: `https://fisio-backend.b5xbaf.easypanel.host`
- n8n: ver `.env.local` local para URL/API key.
- Supabase: ver `.env.local` local para proyecto y claves.
