# Configuracion pendiente

## Estado vivo - 2026-05-11
- GitHub: `main` actualizado en `0271806` con fix de textarea del copiloto.
- Frontend:
  - Fix textarea copiloto: max-height 12rem, auto-resize 220px, resize:none.
  - Chat-log expandido: min-height clamp(14rem, 46vh, 32rem).
  - Auditoria premium completada con capturas de produccion.
  - Plan de 5 fases documentado en `docs/SESSION_CURRENT.md` y `docs/PREMIUM_PLATFORM_AUDIT_20260511.md`.
- Backend: sin cambios en esta sesion.
- Produccion: pendiente redeploy para activar bundle `Bz3UFDZ0.js`.

## Validado localmente
- `npm.cmd run check` en `frontend`: 0 errores.
- `npm.cmd run build` en `frontend`: OK, bundle `Bz3UFDZ0.js`.
- `git push origin main`: OK.

## Pendiente operativo
1. Redeploy de `fisio-frontend` en EasyPanel.
2. Smoke test visual tras deploy (textarea expandido, chat-log mas alto).
3. Aprobacion del plan premium de 5 fases para iniciar ejecucion.

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
