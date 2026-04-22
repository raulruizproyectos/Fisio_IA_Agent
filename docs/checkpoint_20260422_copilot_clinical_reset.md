# Checkpoint 2026-04-22 - Copilot clinico, historial y entrega Telegram

## Estado al cerrar
- Rama: `main`.
- Ultimo commit funcional publicado antes de este checkpoint: `45be475` - `refactor: simplify assistant rail architecture`.
- GitHub queda sincronizado con el refactor del Copilot y los fixes previos de historial/Telegram.
- Queda un archivo local no relacionado sin versionar:
  - `backend/package-lock.json`
  - No se ha incluido en commits porque no forma parte de este tramo.

## Problema que se estaba atacando
- El Copilot del CRM no era usable:
  - habia doble scroll y ventanas internas solapadas,
  - la ficha estructurada quedaba cortada,
  - el area de respuestas aparecia como una caja blanca gigante aunque estuviera vacia,
  - el layout acumulaba overrides CSS contradictorios,
  - el flujo `Vincular Telegram` no llevaba de forma clara a la ficha/historial,
  - al generar un plan no quedaba claro si habia sido guardado en historial.

## Decisiones tomadas
- No seguir parcheando estilos encima de otros estilos.
- Convertir el Copilot en una superficie con una sola fuente de verdad:
  - reset final: `assistant-clinical-layout-reset-20260422`,
  - marcador de build del rail: `data-copilot-build="clinical-reset-20260422"`.
- Eliminar bloques historicos que competian entre si:
  - `assistant-diagnostic-field-fix-v1`,
  - `assistant-copilot-premium-final-v4`,
  - `assistant-copilot-premium-v3`,
  - `assistant-rail-ultrapremium-fix-v2`,
  - `premium-final-polish-v1`,
  - `assistant-single-scroll-usability-v1`.
- Quitar estilos inline de JS que forzaban alturas del chat y grid de botones.
- Mantener el estado clinico estructurado como formulario principal, no como texto suelto.

## Cambios funcionales relevantes
- `frontend/src/pages/index.astro`
  - Copilot reorganizado:
    - escritorio: ficha estructurada a la izquierda, texto/botones/respuestas a la derecha,
    - movil/tablet: todo apilado en una columna,
    - sin respuestas: no se pinta caja vacia.
  - La caja de respuestas deja de tener altura minima forzada por JS.
  - `assistant-dialog-scroll` deja de comportarse como segunda ventana visual.
  - La seleccion de paciente se recuerda en `localStorage`.
  - Al generar un plan con `recommendation_id`, el Copilot informa que se guardo en historial.
  - Si el usuario esta en `Historial`, la seccion de recomendaciones se recarga tras generar plan.
  - El boton de Telegram:
    - si falta vinculacion, cierra el Copilot y enfoca el bloque de Telegram en historial/ficha,
    - si ya hay vinculacion, envia el informe y registra seguimiento breve.
- `backend/src/routes/exercises.js`
  - `GET /api/exercises/recommendations/:patientId` ya no cae por completo si falla el enriquecimiento desde `crm_comunicaciones`.
  - En caso de error en comunicaciones, devuelve las recomendaciones base y deja warning en backend.

## Commits funcionales de este tramo
- `df98bc3` - `fix: clean copilot rail layout`
- `185c56e` - `fix: improve copilot form order`
- `e6db61f` - `fix: restore copilot delivery actions`
- `90a929b` - `fix: clarify copilot clinical objective input`
- `b82dadc` - `fix: repair assistant telegram delivery flow`
- `9e7007b` - `fix: improve assistant history usability`
- `e63c54b` - `fix: reset assistant clinical layout`
- `45be475` - `refactor: simplify assistant rail architecture`

## Validaciones realizadas
- Frontend:
  - `npm run check` desde `frontend`: OK.
  - `npm run build` desde `frontend`: OK.
  - `git diff --check -- frontend/src/pages/index.astro`: OK.
- Backend:
  - En el tramo del cambio backend: `npm run lint` desde `backend`: OK con 1 warning antiguo no relacionado en `backend/src/routes/professional.js`.
- Avisos vivos no bloqueantes:
  - `frontend/src/pages/index.astro`: `mobileDock` sin uso.
  - `frontend/src/pages/index.astro`: `total` sin uso.
  - `backend/src/routes/professional.js`: `appointmentId` sin uso.

## Pendiente de despliegue
1. Redeploy de `fisio-frontend` en EasyPanel.
2. Redeploy de `fisio-backend` en EasyPanel si todavia no se desplego el commit `9e7007b`.
3. Validar que el HTML productivo contiene:
   - `data-copilot-build="clinical-reset-20260422"`
   - `assistant-clinical-layout-reset-20260422`

## Smoke test recomendado tras redeploy
1. Abrir CRM en desktop.
2. Abrir Copilot.
3. Seleccionar un paciente.
4. Confirmar:
   - no hay doble scroll interno visible,
   - no aparece caja blanca gigante si no hay respuestas,
   - la ficha estructurada se ve completa,
   - la caja de texto y botones quedan a la derecha en desktop,
   - en movil se apila sin solaparse.
5. Generar plan con paciente real.
6. Ir a `Historial` y confirmar:
   - aparece en `Informes y recomendaciones`,
   - si alguna parte falla, historial carga en modo parcial y no queda pantalla rota.
7. Probar `Vincular Telegram`:
   - sin vinculacion: debe llevar a bloque de Telegram del paciente,
   - con vinculacion: debe enviar informe y registrar seguimiento breve.

## Riesgos / cosas a vigilar
- `frontend/src/pages/index.astro` sigue siendo un archivo demasiado grande.
- Aunque el Copilot ya tiene una fuente de verdad para su layout, sigue viviendo dentro de un monolito de estilos globales.
- Si EasyPanel sigue mostrando el layout viejo, el problema no estara en Git sino en cache/redeploy.
- No se hizo captura automatizada local porque el proyecto no tiene Playwright/Puppeteer instalado.

## Punto exacto para la proxima sesion
1. Leer este archivo primero.
2. Verificar `git status --short` y confirmar que solo aparece, si acaso, `?? backend/package-lock.json`.
3. Confirmar ultimo commit remoto:
   - esperado: `45be475` o posterior si se commitea esta documentacion.
4. Si el usuario reporta que sigue igual:
   - verificar EasyPanel/redeploy antes de tocar codigo,
   - buscar en HTML productivo `clinical-reset-20260422`,
   - si no aparece, redeploy/cache,
   - si aparece y aun falla, revisar captura concreta y ajustar solo `assistant-clinical-layout-reset-20260422`.

