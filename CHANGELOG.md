# Changelog

Solo se conserva el historial operativo reciente. Para detalles antiguos, usar el historial de Git.

## 2026-05-07 - Rail IA chat-first y cierre de sesion
- `frontend/src/pages/index.astro`:
  - compactacion agresiva del rail de asistente,
  - priorizacion del area de chat frente a bloques ornamentales,
  - inyeccion runtime para forzar layout en entorno con CSS legacy,
  - estado vacio util con chips de prompts rapidos para eliminar hueco muerto.
- Commits de sesion:
  - `c519b13` - `fix: compact assistant rail and prioritize chat workspace`
  - `53f4a2d` - `fix: make assistant rail chat-first with useful empty state`
- Estado funcional:
  - cambios subidos a `main`,
  - pendiente confirmacion visual final en produccion tras redeploy de `fisio-frontend`.

## 2026-05-07 - Consistencia router + limpieza lint
- `backend/src/routes/professional.js`: eliminado parametro sin uso en `buildCalendarEventPayload` para dejar `npm run lint` limpio.
- `frontend/src/pages/index.astro`: alias de secciones y `financeSections` pasan a una configuracion compartida (`window.__fisioShellConfig`) usada por fallback temprano y router principal.
- Validado:
  - `npm run lint` (backend): OK.
  - `npm.cmd run check` (frontend): OK.
  - `npm.cmd run build` (frontend): OK.

## 2026-05-06 - Cierre navegacion Finanzas/Documentos
- Arreglado router SPA para `Finanzas` y `Documentos`.
- `Finanzas` resuelve a `pagos`.
- `Documentos` abre `data-page="documentos"`.
- Eliminada dependencia de `CSS.escape`.
- Eliminados listeners duplicados de dashboard/finanzas.
- Aniadido router temprano `__fisioShellNavigate` como fallback si el script principal falla.
- Las paginas no activas usan `hidden` y `display: none !important` para que Agenda no quede visible por accidente.
- Limpieza de estilos antiguos de agenda semanal.
- Validado `npm.cmd run check` y `npm.cmd run build`.
- Commits principales:
  - `f90de99` - `fix: harden finance and documents navigation`
  - `d208233` - `refactor: remove stale agenda calendar styles`
  - `31f41bc` - `fix: make dashboard routing browser safe`
  - `f627a31` - `fix: add resilient shell navigation fallback`

## 2026-05-05 - Redisenio CRM premium
- Redisenio visual del CRM hacia workspace clinico premium.
- Agenda semanal reestructurada.
- Nueva cita y detalle en drawers contextuales.
- Facturacion migrada a drawer lateral.
- Agente IA de ejercicios reenfocado como estudio de informe.
- Validado frontend con check/build.

## 2026-05-04 - Finanzas DRY y limpieza tactica
- Finanzas unifica pestanas con `data-finance-tabs`.
- Limpieza visible de inline styles en Inicio, Agenda, Documentos, Ficha y Configuracion.
- Validado frontend con check/build.

## 2026-04-29 - Plataforma premium practica
- Ficha de paciente reforzada como centro operativo del caso.
- Seguimiento del caso simplificado.
- Finanzas mejorada como superficie operativa.
- Toast/confirmacion propios sustituyen `alert/confirm/prompt`.
- Backend tolera mejor pacientes CRM/legacy.

## 2026-04-22 - Simplificacion operativa
- Dashboard simplificado como cockpit diario.
- Finanzas consolidada como entrada unica.
- Ficha de paciente compactada.
- Copilot clinico estabilizado con una fuente visual principal.
