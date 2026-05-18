# Changelog

Historial operativo compacto. Para detalle completo, usar `git log` y diffs.

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
