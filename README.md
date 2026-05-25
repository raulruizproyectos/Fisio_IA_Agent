# Fisio_IA_Agent

CRM clinico para fisioterapia: pacientes, agenda, finanzas, documentos y copiloto IA de ejercicios. Stack: Astro frontend, Node/Express backend, Supabase, n8n, Telegram y Google Calendar.

## Estado actual
- Rama: `main`.
- Estado local 2026-05-25: saneado el Copiloto IA para que vuelva a ser drawer lateral y no overlay de pantalla completa.
- Commit publicado en GitHub: `14790592fed128fd38e4eef4c252c8cb25c4870b`.
- Frontend productivo: `https://fisio-frontend.b5xbaf.easypanel.host/`.
- Backend productivo: `https://fisio-backend.b5xbaf.easypanel.host`.
- Pendiente inmediato: redeploy manual de `fisio-frontend` en EasyPanel desde `main`, hard refresh y smoke test visual/funcional.

## Contexto clave
- Dashboard y Pacientes fueron rehechos con markup `ops-*` para escapar del layout heredado lleno de cajas.
- Se mantienen IDs/eventos JS para no romper datos, filtros, agenda, triage, reservas ni acciones.
- CSS activo: `frontend/src/styles/global-shell.css`, `assistant-rail.css`, `premium-clinic-ui.css`.
- Regla vigente: el layout del Copiloto IA vive solo en `assistant-rail.css`. No anadir nuevos `<style id="assistant-*">` en `index.astro`.
- Fuente visual unificada: `Manrope`.
- Copiloto IA: drawer lateral derecho de 420px en desktop, backdrop solo en tablet/movil, input fijo y scroll interno.
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

Resultado 2026-05-25 frontend: `npm.cmd run check` OK, `npm.cmd run build` OK.

## Retomar
1. Redeploy `fisio-frontend` en EasyPanel desde `main`.
2. Hard refresh en produccion.
3. Revisar `Inicio`, `Pacientes`, `Copiloto IA`, `Agenda`, `Finanzas`, `Documentos`.
4. Probar apertura/cierre del Copiloto IA en desktop, tablet y movil.
5. Probar generacion de plan IA, PDF e historial del paciente.
6. Si se ve UI antigua, revisar cache/commit desplegado antes de tocar codigo.

## Archivos de seguimiento minimos
- `docs/SESSION_CURRENT.md`: estado vivo para retomar.
- `configuracion_pendiente.md`: checklist operativo.
- `CHANGELOG.md`: resumen corto del cierre.
- `docs/SESSION_CHECKPOINT.md`: checkpoint compacto.

El historial detallado antiguo queda en Git.
