# Changelog

Historial operativo compacto. Para detalle completo, usar `git log` y diffs.

## 2026-05-25 - Saneamiento del Copiloto IA y limpieza de cascada
- Publicado en `main`: `14790592fed128fd38e4eef4c252c8cb25c4870b`.
- Reescrito `frontend/src/styles/assistant-rail.css` como fuente canonica del drawer del Copiloto IA.
- El Copiloto pasa a drawer derecho de 420px en desktop, con backdrop solo en tablet/movil y scroll interno estable.
- Eliminados los enforcers JS de layout que usaban `style.setProperty(..., 'important')` en `index.astro` y `AssistantRail.astro`.
- Retirados bloques globales redundantes `assistant-*` de `index.astro` para evitar que el monolito vuelva a pisar el CSS canonico.
- Eliminadas reglas del `#assistantRail` de `global-shell.css` y `premium-clinic-ui.css`.
- Consolidado `premium-clinic-ui.css` a un unico bloque `:root` con tokens slate/teal/rose/indigo.
- Limpiadas constantes DOM sin uso detectadas por `astro check`.
- Validado frontend: `npm.cmd run check` OK y `npm.cmd run build` OK.

## 2026-05-20 - Migración y desacoplamiento de Modales a Nanostores + Hotfix de Despliegue
- Creado `ConfirmDialog.astro` como componente desacoplado del monolito `index.astro`.
- Migrado el estado de visibilidad de `ConfirmDialog` a Nanostores (`modalState`).
- Creado flujo de comunicación asíncrona reactiva con CustomEvents (`fisio:open-confirm` y `fisio:close-confirm`) para mantener compatibilidad con las llamadas imperativas existentes.
- Migrado `PatientModal` en `PatientsView.astro` al flujo reactivo de Nanostores (`modalState.patientForm`), desacoplándolo completamente de `index.astro`.
- Eliminadas todas las manipulaciones directas de DOM y `classList` sobre visibilidad de modales de `index.astro`.
- **HOTFIX CRÍTICO**: Solucionado `ReferenceError: confirmDialog is not defined` que rompía el hilo de ejecución JavaScript bloqueando la carga de pacientes y agenda.
- **HOTFIX VISUAL**: Cambiado el bloque `<style>` principal de `index.astro` a `<style is:global>` para permitir que los estilos del dashboard y las vistas se apliquen correctamente a los componentes separados e importados, eliminando por completo la rotura de alineación de modales desajustados.
- Resueltos problemas de imports y rutas relativas (`../../store`) en vistas anidadas.
- Verificado y compilado exitosamente (`npm run build` OK).
- Subidos todos los cambios a GitHub en la rama `main` (commit `8e2ba1a`), desplegando y corrigiendo la producción en Easypanel de forma inmediata.

## 2026-05-19 - Cierre alineado GitHub + n8n
- Prompt del agente de ejercicios versionado en backend como `fisio_exercise_premium_v2_2026-05-18`.
- Backend envia `system_prompt` y `prompt_version` al workflow W2 de n8n.
- Workflow vivo de n8n `Fisio IA | Ejercicios` actualizado y verificado: reenvia `system_prompt` al motor de ejercicios.
- Renombrados en n8n produccion los 11 workflows del proyecto a nombres breves `Fisio IA | ...`.
- Renombrados nodos principales para lectura rapida: `Entrada`, `Normalizar`, `Validar`, `Generar plan`, `Responder`, etc.
- JSON versionados de `n8n/Fisio_IA_Agent/production/` y `n8n/Fisio_IA_Agent/vnext/` alineados con produccion.
- Verificado remoto: los 11 workflows de `Fisio IA | ...` quedan activos.
- Validado repo n8n: JSON parse OK y conexiones sin nodos faltantes.
- Ultimo commit publicado antes de este cierre docs: `bfb88dc` (`chore(n8n): simplify workflow and node names`).
- Pendiente operativo: redeploy en EasyPanel de frontend/backend desde `main`; n8n ya fue actualizado via API.

## 2026-05-18 - Redisenio premium CRM
- Reforzada la direccion SaaS clinico premium en shell, sidebar, topbar, tablas, formularios y estados.
- Copiloto IA redisenado como estudio clinico: contexto de paciente, flujo seguro, atajos y compositor compacto.
- Documentos elimina estilos inline visibles y adopta tabla/summary coherente con el sistema `ops-*`.
- Validado frontend: `npm.cmd run check` OK y `npm.cmd run build` OK.
- Validado backend: `npm.cmd run lint` OK.

## 2026-05-18 - Copiloto clinico conversacional
- Rehecho el modulo IA desde cero con layout conversacional, input fijo y scroll independiente.
- Movido el contexto clinico a rail lateral compacto para no invadir la conversacion.
- Acciones rapidas conectadas a prompts existentes: plan lumbar, ajuste, proxima visita, evolucion y reescritura para paciente.
- Retirados hotfixes de layout que ocultaban contexto, reordenaban nodos y provocaban scroll/cortes.
- Validado frontend: `npm.cmd run check` OK y `npm.cmd run build` OK.
- Validado backend: `npm.cmd run lint` OK.

## 2026-05-12 - Cierre de sesion
- Publicado en `main` el redisenio funcional `f589384` (`feat: redesign crm workspace without cards`).
- Dashboard y Pacientes pasan a markup `ops-*`, evitando las clases heredadas que generaban cajas (`card`, `signal-card`, `metric-card`, etc.).
- Se conservaron IDs y `data-*` para mantener funcionalidad JS.
- CSS final en `premium-clinic-ui.css` con workspace abierto, divisores finos y acciones compactas.
- `Newsreader` retirada; sistema visual unificado en `Manrope`.
- CSS modular activo: `global-shell.css`, `assistant-rail.css`, `premium-clinic-ui.css`.
- Validado frontend: `npm.cmd run check` OK y `npm.cmd run build` OK.
- Pendiente: redeploy `fisio-frontend` en EasyPanel y smoke test visual.

## Referencias utiles
- Estado vivo: `docs/SESSION_CURRENT.md`.
- Checkpoint: `docs/SESSION_CHECKPOINT.md`.
- Checklist operativo: `configuracion_pendiente.md`.
- Auditoria visual compacta: `docs/PREMIUM_PLATFORM_AUDIT_20260511.md`.
