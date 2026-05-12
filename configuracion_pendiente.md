# Configuracion pendiente

## Estado vivo - 2026-05-12
- GitHub: correccion visual premium calmada lista para publicar en `main`.
- Frontend:
  - Creado `frontend/src/styles/assistant-rail.css` para sacar el override del copiloto fuera del runtime JS.
  - Creado `frontend/src/styles/global-shell.css` para sacar la recuperacion global de sidebar/topbar/workspace fuera del monolito.
  - Rehecho el markup visible de Dashboard y Pacientes con estructura `ops-*`, sin las clases heredadas que generaban cajas.
  - Rehecho `frontend/src/styles/premium-clinic-ui.css`: dashboard y pacientes pasan a workspace abierto con divisores finos.
  - `Layout.astro` ya no carga `Newsreader`; el sistema visual queda unificado en `Manrope`.
  - Eliminado `ensureAssistantCompactRuntimeStyles` de `frontend/src/pages/index.astro`.
  - Se mantiene el copiloto chat-first: chat-log 55vh, textarea 3.5rem, fuente 0.92rem.
  - Auditoria premium completada con capturas de produccion.
  - Plan de 5 fases documentado en `docs/SESSION_CURRENT.md` y `docs/PREMIUM_PLATFORM_AUDIT_20260511.md`.
- Backend: sin cambios en esta sesion.
- Produccion: pendiente redeploy de `fisio-frontend` para activar bundle `8Xqq_Vbu.js`.

## Validado localmente
- `npm.cmd run check` en `frontend`: 0 errores.
- `npm.cmd run build` en `frontend`: OK, bundle `8Xqq_Vbu.js` (236.10 KB / 62.77 KB gzip).
- `git push origin main`: listo tras commit de Fase 2.

## Pendiente operativo
1. Redeploy de `fisio-frontend` en EasyPanel con el redisenio real `ops-*`.
2. Smoke test visual tras deploy (shell, dashboard, pacientes, agenda, finanzas, documentos y copiloto IA).
3. Ajustar fino segun captura real de EasyPanel: densidad, contrastes, altura del copiloto y exceso de cajas restantes.

## Directrices de producto (nuevas)
- **Premium clinico**: el producto debe sentirse como el mejor CRM de fisioterapia del mercado.
- **Agente IA premium**: el copiloto IA es el diferenciador. Debe tener diseño y usabilidad de referencia.
- **Principios de diseño**:
  - Densidad calmada.
  - Micro-animaciones que hagan la interfaz sentirse viva.
  - Chat-first: la conversacion IA ocupa la mayor parte del rail.
  - Accesibilidad WCAG AA.
  - Performance < 300 KB JS comprimido por ruta.
- **Direccion tecnica**:
  - Eliminar deuda CSS (100+ `!important`).
  - Modularizar JS por dominio (shell, assistant, patients, etc).
  - Reducir `index.astro` de 27K a ~8K lineas.

## Roadmap premium aprobacion pendiente
| Fase | Descripcion | Impacto |
|------|-------------|---------|
| 1 | CSS premium polish | Visual inmediato |
| 2 | Estabilizacion CSS global | Mantenibilidad |
| 3 | Modularizacion JS | Arquitectura |
| 4 | Experiencia clinica premium | Valor clinico |
| 5 | IA clinica diferencial | Diferenciador |

## Variables y servicios utiles
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Backend: `https://fisio-backend.b5xbaf.easypanel.host`
- n8n: ver `.env.local` local para URL/API key.
- Supabase: ver `.env.local` local para proyecto y claves.
