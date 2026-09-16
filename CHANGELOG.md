# Changelog

Resumen compacto. Detalle completo en `git log`.

## 2026-09-15
- Auditoria tecnica y clinica completa del CRM y del agente IA: informe en `docs/AUDITORIA_CRM_IA_20260915.md` (seccion 7 = plan de mejoras; seccion 11 = como retomar).
- Hallazgo principal: el hardening de produccion esta en `origin/production-hardening` (`f4c04d4`, 2026-09-03) y **no** esta en `main` (`8c208cf`, 2026-05-27), que sigue siendo la rama productiva declarada. `main` no tiene autenticacion, ni RLS en tablas `crm_*`, ni auditoria.
- Verificado en la rama: JWT con Supabase Auth, perfil activo en `crm_perfiles`, cliente Supabase por peticion sin fallback privilegiado, RLS con aislamiento por profesional, helmet + tres niveles de rate limit, webhooks firmados, aprobacion clinica obligatoria antes de PDF/Telegram e idempotencia.
- Validado: backend de la rama `npm ci` + `eslint` (0 errores) + `npm test` (11/11); estado A frontend `astro check` y `astro build` OK; escaneo de secretos limpio.
- Pendientes tras la auditoria: R-1..R-11 en `configuracion_pendiente.md`, ordenados en cuatro bloques.
- Bloqueo de entorno: la politica de Control de Aplicaciones de Windows impide cargar el binario nativo de Astro 7, asi que el frontend actual no se puede compilar en este equipo (detalle en R-11). El backend si es validable en local.

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
