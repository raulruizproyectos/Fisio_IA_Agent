# Fisio_IA_Agent

CRM clinico para fisioterapia: pacientes, agenda, finanzas, documentos y copiloto IA de ejercicios. Stack: Astro frontend, Node/Express backend, Supabase, n8n, Telegram y Google Calendar.

## Estado actual
- Rama: `main`.
- Ultimo commit publicado antes de este cierre docs: `bfb88dc` - `chore(n8n): simplify workflow and node names`.
- Frontend productivo: `https://fisio-frontend.b5xbaf.easypanel.host/`.
- Backend productivo: `https://fisio-backend.b5xbaf.easypanel.host`.
- Pendiente inmediato: redeploy manual de `fisio-frontend` y `fisio-backend` en EasyPanel desde `main`, y smoke test visual/funcional.

## Contexto clave
- Dashboard y Pacientes fueron rehechos con markup `ops-*` para escapar del layout heredado lleno de cajas.
- Se mantienen IDs/eventos JS para no romper datos, filtros, agenda, triage, reservas ni acciones.
- CSS activo: `frontend/src/styles/global-shell.css`, `assistant-rail.css`, `premium-clinic-ui.css`.
- Fuente visual unificada: `Manrope`.
- Copiloto IA: experiencia chat-first amplia, input fijo, panel clinico compacto y scroll independiente.
- Prompt premium de ejercicios: versionado en backend y enviado a n8n como `system_prompt`.
- n8n produccion: workflows del proyecto renombrados a formato breve `Fisio IA | ...` y activos.

## Validacion reciente
```powershell
cd frontend
npm.cmd run check
npm.cmd run build

cd ..\backend
npm.cmd run lint
```

Resultado 2026-05-18/19: OK.

## Retomar
1. Redeploy `fisio-frontend` y `fisio-backend` en EasyPanel desde `main`.
2. Hard refresh en produccion.
3. Revisar `Inicio`, `Pacientes`, `Copiloto IA`, `Agenda`, `Finanzas`, `Documentos`.
4. Probar generacion de plan IA, PDF e historial del paciente.
5. Si se ve UI antigua, revisar cache/commit desplegado antes de tocar codigo.
6. Si se ve UI nueva, hacer ajuste fino visual con capturas reales.

## Archivos de seguimiento minimos
- `docs/SESSION_CURRENT.md`: estado vivo para retomar.
- `configuracion_pendiente.md`: checklist operativo.
- `CHANGELOG.md`: resumen corto del cierre.
- `docs/SESSION_CHECKPOINT.md`: checkpoint compacto.

El historial detallado antiguo queda en Git.
