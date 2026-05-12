# Changelog

Solo se conserva el historial operativo reciente. Para detalles antiguos, usar el historial de Git.

## 2026-05-12 - Redisenio sin cajas en Dashboard y Pacientes
- `frontend/src/styles/premium-clinic-ui.css`:
  - Nueva correccion "Unboxed workspace": las clases heredadas `card`, `metric-card`, `signal-card`, `cockpit-block` y `patients-directory-card` dejan de pintar cajas en dashboard y pacientes.
  - Dashboard pasa a secciones abiertas: hero sin marco, senales operativas con divisores, metricas como banda, chart/flujos como bloques de lectura sin contenedor.
  - Pacientes pasa a workspace abierto: header con linea, stats laterales sin tarjetas, buscador subrayado, filtros como tabs y listado con filas separadas.
  - Copiloto IA reduce contenedores internos: chat-log/input/modos usan divisores en vez de cajas redondeadas.
- Validado: `npm.cmd run check` OK, `npm.cmd run build` OK.

## 2026-05-12 - Correccion visual CRM premium calmado
- `frontend/src/styles/premium-clinic-ui.css`:
  - Rehecha la capa visual tras feedback real de EasyPanel: menos cajas, menos bordes, mas separadores y superficies continuas.
  - Eliminada la direccion editorial con serif; titulos, cuerpo, botones y controles vuelven a una sola voz tipografica (`Manrope`).
  - Dashboard: hero sin contenedor duro, senales y metricas como bandas compactas con separadores finos.
  - Pacientes: header mas sobrio, estadisticas como lista lateral, barra de busqueda/filtros sin caja exterior y acciones `Abrir ficha`/`Seguimiento` como pildoras compactas.
  - Copiloto IA: mantiene formato grande, pero con panel mas calmado y menos borde visible.
- `frontend/src/layouts/Layout.astro`:
  - Retirada la carga de `Newsreader`.
  - `--font-display` pasa a `Manrope` para evitar mezcla tipografica.
- Validado: `npm.cmd run check` OK, `npm.cmd run build` OK.

## 2026-05-12 - Fase 2: CSS del copiloto fuera del runtime
- `frontend/src/styles/premium-clinic-ui.css`:
  - Nueva capa final de redisenio premium usando la skill `frontend-design`.
  - Reduce sensacion de "cajas" con superficies continuas, bordes mas finos, sombras suaves, textura clinica sutil y jerarquia mas editorial.
  - Amplia el copiloto IA a estudio clinico (`1040px`, `94dvh`) y refuerza el chat-log como area principal.
- `frontend/src/layouts/Layout.astro`:
  - Anade `Newsreader` como display font premium para titulos y jerarquia clinica.
- `frontend/src/styles/global-shell.css`:
  - Nueva hoja global temporal para la recuperacion de sidebar, topbar, buscador, workspace y mobile dock tras extraer componentes Astro.
  - Se inyecta inline desde `index.astro` en el mismo punto de cascada del bloque anterior.
- `frontend/src/styles/assistant-rail.css`:
  - Nueva hoja global temporal para el override del copiloto IA.
  - Mantiene las reglas de altura, chat-log 55vh, textarea 3.5rem y controles compactos sin inyectar CSS desde JavaScript.
- `frontend/src/pages/index.astro`:
  - Eliminado `ensureAssistantCompactRuntimeStyles`.
  - Importados `global-shell.css`, `assistant-rail.css` y `premium-clinic-ui.css` con `?inline` para preservar el orden de cascada.
  - `index.astro` reducido hasta 27.060 lineas.
- Validado: `npm.cmd run check` OK, `npm.cmd run build` OK.
- Bundle: `index.astro_astro_type_script_index_0_lang.8Xqq_Vbu.js` (236.10 KB / 62.77 KB gzip).

## 2026-05-12 - Copiloto IA Full Height y Legibilidad Premium (Runtime Override)
- `frontend/src/pages/index.astro`:
  - Se reescribió el CSS de runtime (`ensureAssistantCompactRuntimeStyles`) para sobreescribir las reglas conflictivas del build anterior.
  - El rail del copiloto ahora ocupa toda la altura de la pantalla (94dvh) en todo momento (eliminado el colapso al estar vacío).
  - El `chat-log` absorbe todo el espacio vertical (`flex: 1 1 auto`) y tiene un tamaño de al menos 55vh.
  - El input textarea se hizo significativamente más grande (`min-height: 3.5rem`) para poder redactar notas clínicas con comodidad.
  - El tamaño de fuente de la conversación y del input se subió a 0.92rem para mejor ergonomía visual.
- Commit: `89b894b`
- Estado: Pruebas visuales validadas. Listo para extraer el CSS de runtime en Fase 2.


## 2026-05-12 - Copiloto IA mas grande y legible
- `frontend/src/pages/index.astro`:
  - Rail portal: de 900×760px a 1000×880px (94dvh).
  - Rail-card desktop: de 980×900px a 1000×920px.
  - Rail-card compact: de 780×860px a 860×900px.
  - Chat-log: min-height de clamp(14rem, 46vh, 32rem) a clamp(18rem, 52vh, 42rem).
  - Mensajes: font-size de 0.82rem a 0.92rem, line-height de 1.55 a 1.6, padding aumentado.
  - Overrides desktop/compact/mobile: unificados a 0.92rem/1.6.
- Commit: `e42d156`.
- Validado: check OK, build OK, bundle `CYppe4RU.js` (244 KB / 64 KB gzip).

## 2026-05-11 - Fase 1 CSS Premium Polish
- `frontend/src/pages/index.astro`:
  - Rail copiloto: animacion spring (cubic-bezier 0.32, 0.72, 0, 1) + opacity fade.
  - Chat messages: animacion de entrada con blur + scale + slide.
  - Textarea: double glow teal al focus + caret color teal.
  - Chat-log: gradient fade mask top/bottom para indicar scroll.
  - Signal cards: stagger animation de entrada con delays progresivos.
  - Cards: hover lift translateY(-2px) + glow ring.
  - Tablas: zebra stripes + row hover highlight.
  - Botones: gradient shift al hover + scale active.
  - Metricas: tabular-nums para alineacion profesional.
- Commit: `85d9c27`.
- Validado: check OK, build OK, bundle `Bz3UFDZ0.js` (244 KB / 64 KB gzip).

## 2026-05-11 - Fix textarea copiloto + auditoria premium
- `frontend/src/pages/index.astro`:
  - Textarea del copiloto: max-height de 5.5rem a 12rem, resize:none.
  - Auto-resize JS: maxPx de 120 a 220, viewport de 12% a 22%.
  - Chat-log: min-height de clamp(11rem, 38vh, 24rem) a clamp(14rem, 46vh, 32rem).
- Commit: `0271806` - `fix: enlarge assistant textarea and chat-log for better conversation UX`.
- Auditoria premium completa con capturas de produccion.
- Plan de 5 fases documentado en `docs/SESSION_CURRENT.md` y `configuracion_pendiente.md`.
- Directrices de producto actualizadas: premium clinico, agente IA como diferenciador, WCAG AA, modularizacion.
- Validado: check OK, build OK, bundle `Bz3UFDZ0.js`.

## 2026-05-11 - Modularizacion inicial del shell frontend
- `frontend/src/pages/index.astro` reduce markup inline extrayendo componentes Astro sin cambiar IDs ni contratos DOM.
- Publicado en `main`:
  - `3ddb77f` - `refactor: modularize frontend shell`
- Nuevos componentes:
  - `frontend/src/components/AssistantRail.astro`
  - `frontend/src/components/MobileDock.astro`
  - `frontend/src/components/GlobalFeedbackShell.astro`
  - `frontend/src/components/SidebarNav.astro`
  - `frontend/src/components/Topbar.astro`
  - `frontend/src/components/ShellNavigationBootstrap.astro`
- Validado:
  - `npm.cmd run check` en `frontend`: OK.
  - `npm.cmd run build` en `frontend`: OK.
  - `npm.cmd run preview` temporal: HTTP 200 con `__fisioShellNavigate`, `assistantRail`, `mobileDock` y `confirmDialog`.
  - `npm.cmd run lint` en `backend`: OK.
  - JSON de workflows n8n en `n8n/Fisio_IA_Agent`: OK.

## 2026-05-11 - Verificacion de continuidad y produccion
- Confirmado `main` sincronizado con `origin/main` en `a354405`.
- Confirmada respuesta de produccion en `fisio-frontend` con:
  - `__fisioShellNavigate` presente en HTML.
  - bundle `/_astro/index.astro_astro_type_script_index_0_lang.BT9OP7ob.js` activo.
- Documentacion de continuidad actualizada:
  - `docs/SESSION_CURRENT.md`
  - `configuracion_pendiente.md`
  - `README.md`
- Pendiente funcional: smoke test visual/manual completo de navegacion (`Finanzas`, `Documentos`, `Agenda`) y rail IA.

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
