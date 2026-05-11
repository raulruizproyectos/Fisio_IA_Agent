# Configuracion pendiente

## Estado vivo - 2026-05-11
- GitHub: `main` sincronizado hasta `a354405`.
- Frontend:
  - fix de navegacion `Finanzas`/`Documentos` consolidado,
  - ajustes de rail IA en commits `c519b13` y `53f4a2d` (chat-first + estado vacio util).
- Backend: warning de lint eliminado en `professional.js`.
- Deploy/cache de frontend: verificado en produccion con HTML que contiene `__fisioShellNavigate` y bundle `...BT9OP7ob.js`.
- Trabajo local en curso: modularizacion inicial del shell frontend con componentes Astro para rail IA, dock movil, feedback global, sidebar, topbar y bootstrap temprano de navegacion.
- Pendiente operativo: revisar/commitear modularizacion y smoke test visual/manual completo.

## Validado localmente
- `npm run lint` en `backend`: OK.
- `npm.cmd run check` en `frontend`: OK.
- `npm.cmd run build` en `frontend`: OK.
- `git diff --check`: OK salvo aviso normal LF/CRLF.
- `git fetch origin` y `git rev-parse --short HEAD/origin/main`: ambos en `a354405`.
- `Invoke-WebRequest` a `https://fisio-frontend.b5xbaf.easypanel.host/`: HTTP 200 y asset esperado presente.
- Tras modularizacion frontend:
  - `npm.cmd run check`: OK.
  - `npm.cmd run build`: OK.
  - `npm.cmd run preview` temporal: HTTP 200 con marcadores criticos presentes.
  - `npm.cmd run lint` en `backend`: OK.
  - Validacion JSON de workflows n8n: OK.

## Smoke test pendiente (visual/manual)
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
1. Crear commit atomico de la modularizacion frontend.
2. Completar smoke test visual tras deploy.
3. Siguiente deuda: extraer JS del shell/router y controlador del rail IA desde `frontend/src/pages/index.astro`.

## Variables y servicios utiles
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Backend: `https://fisio-backend.b5xbaf.easypanel.host`
- n8n: ver `.env.local` local para URL/API key.
- Supabase: ver `.env.local` local para proyecto y claves.
