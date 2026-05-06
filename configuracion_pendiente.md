# Configuracion pendiente

## Estado vivo - 2026-05-06
- GitHub: `main` sincronizado hasta `f627a31`.
- Frontend: fix de navegacion de `Finanzas` y `Documentos` subido.
- Pendiente manual: redeploy de `fisio-frontend` en EasyPanel.
- Asset esperado tras deploy: nuevo HTML con `__fisioShellNavigate` y JS nuevo distinto de `Ct2KrhHS.js`.

## Validado localmente
- `npm.cmd run check` en `frontend`: OK.
- `npm.cmd run build` en `frontend`: OK.
- `git diff --check`: OK salvo aviso normal LF/CRLF.

## Smoke test tras redeploy
1. Abrir produccion y refrescar fuerte.
2. Click en `Finanzas`: debe abrir resumen de pagos, no Agenda.
3. Click en `Documentos`: debe abrir documentos, no Agenda.
4. Click en `Agenda`: debe abrir agenda.
5. Click en tabs de Finanzas: `Pagos`, `Facturas`, `Bonos`, `Gestoria`.
6. Abrir agente IA y confirmar que no tapa la navegacion.

## Siguiente bloque recomendado
1. Confirmar visualmente produccion tras redeploy.
2. Si la navegacion queda bien, continuar Fase 1 premium.
3. Prioridad: reducir el monolito `frontend/src/pages/index.astro` empezando por router/shell o finanzas.

## Variables y servicios utiles
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Backend: `https://fisio-backend.b5xbaf.easypanel.host`
- n8n: ver `.env.local` local para URL/API key.
- Supabase: ver `.env.local` local para proyecto y claves.
