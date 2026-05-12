# Fisio_IA_Agent

CRM clinico para fisioterapia: pacientes, agenda, finanzas, documentos y copiloto IA de ejercicios. Stack: Astro frontend, Node/Express backend, Supabase, n8n, Telegram y Google Calendar.

## Estado actual
- Rama: `main`.
- Ultimo commit funcional publicado antes del cierre docs: `f589384` - `feat: redesign crm workspace without cards`.
- Frontend productivo: `https://fisio-frontend.b5xbaf.easypanel.host/`.
- Backend productivo: `https://fisio-backend.b5xbaf.easypanel.host`.
- Pendiente inmediato: redeploy manual de `fisio-frontend` en EasyPanel y smoke test visual.

## Contexto clave
- Dashboard y Pacientes fueron rehechos con markup `ops-*` para escapar del layout heredado lleno de cajas.
- Se mantienen IDs/eventos JS para no romper datos, filtros, agenda, triage, reservas ni acciones.
- CSS activo: `frontend/src/styles/global-shell.css`, `assistant-rail.css`, `premium-clinic-ui.css`.
- Fuente visual unificada: `Manrope`; `Newsreader` fue retirada.
- Copiloto IA: experiencia chat-first amplia, 94dvh aprox. y lectura clinica comoda.

## Validacion reciente
```powershell
cd frontend
npm.cmd run check
npm.cmd run build
```
Resultado 2026-05-12: OK.

## Retomar manana
1. Redeploy `fisio-frontend` en EasyPanel.
2. Hard refresh en produccion.
3. Revisar `Inicio`, `Pacientes`, `Copiloto IA`, `Agenda`, `Finanzas`, `Documentos`.
4. Si se ve UI antigua, revisar cache/commit desplegado antes de tocar codigo.
5. Si se ve `ops-*`, hacer ajuste fino visual con capturas reales.

## Archivos de seguimiento minimos
- `docs/SESSION_CURRENT.md`: estado vivo para retomar.
- `configuracion_pendiente.md`: checklist operativo.
- `CHANGELOG.md`: resumen corto del cierre.
- `docs/SESSION_CHECKPOINT.md`: checkpoint compacto.

El historial detallado antiguo queda en Git.
