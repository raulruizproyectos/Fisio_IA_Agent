# Checkpoint 2026-03-10 - UI handoff y cierre de sesi?n

## Estado funcional confirmado
- La arquitectura objetivo no cambia:
  - backend-authoritative,
  - n8n-orchestrated,
  - frontend como superficie de producto.
- El PDF profesional est? centralizado en backend y lo reutilizan CRM y Telegram profesional.
- El frontend compila correctamente desde workspace local fuera de Google Drive:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` -> OK

## Lo que s? qued? hecho hoy
- Se valid? que el c?digo fuente del frontend en `C:\Temp\Fisio_IA_Agent_workspace` ya no arrastra mojibake grave en:
  - `frontend/src/pages/index.astro`
  - `frontend/src/layouts/Layout.astro`
- Se confirm? que el bug que sigue abierto no es de deploy-source:
  - la versi?n desplegada ya incluye la UI nueva,
  - el problema real pendiente es de layout responsive/viewport del rail derecho.

## Bug abierto real
- En producci?n, el rail del agente puede cortar la parte inferior del compositor.
- El problema aparece especialmente:
  - en port?til,
  - al mover la ventana entre monitor del port?til y pantalla externa,
  - cuando cambia el viewport efectivo por escala/DPI/altura ?til.
- Impacto:
  - el bot?n inferior puede quedar fuera de la zona visible,
  - la experiencia del agente no es robusta para cualquier tama?o de pantalla.

## Diagn?stico t?cnico ya hecho
- El rail actual en `frontend/src/pages/index.astro` sigue apoy?ndose en una rejilla que reparte demasiado alto:
  - shortcuts,
  - panel de revisi?n,
  - chat,
  - compositor.
- El siguiente fix correcto ya est? identificado:
  1. separar el rail en `assistant-scroll-body` + compositor fijo,
  2. endurecer `syncViewportHeight()` usando la altura efectiva m?nima disponible,
  3. re-sincronizar viewport en `resize`, `focus`, `pageshow`, `visibilitychange` y `visualViewport.scroll`,
  4. compactar alturas del review panel y del textarea en viewports bajos,
  5. revisar overrides globales del rail para que no vuelvan a romper la rejilla.

## Estado de Git al cierre
- Hay cambios locales preparados en:
  - `frontend/src/layouts/Layout.astro`
  - `frontend/src/pages/index.astro`
  - `README.md`
  - `CHANGELOG.md`
- Antes de redeploy ma?ana:
  1. terminar el parche responsive del rail,
  2. volver a ejecutar `frontend-local-build.ps1`,
  3. solo entonces hacer commit/push y redeploy de frontend.

## Siguiente paso exacto para ma?ana
1. Reabrir `frontend/src/pages/index.astro`.
2. Aplicar el refactor del rail a `scroll body + composer fijo`.
3. Validar build local.
4. Hacer redeploy de frontend.
5. Probar en port?til y monitor externo el rail del agente y el reescalado.
