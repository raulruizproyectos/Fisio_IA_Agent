# Session Checkpoint - 2026-05-19

## Retoma rapida
- Proyecto: `Fisio_IA_Agent`.
- Rama: `main`.
- Commit publicado antes de este cierre docs: `bfb88dc`.
- Estado: GitHub alineado, n8n produccion actualizado, pendiente redeploy frontend/backend en EasyPanel.

## Cambios relevantes
- CRM y copiloto IA redisenados hacia SaaS clinico premium.
- Copiloto IA estabilizado con chat legible, input fijo y panel clinico compacto.
- Prompt premium del agente de ejercicios versionado y enviado como `system_prompt`.
- n8n produccion actualizado: workflows renombrados a `Fisio IA | ...` y nodos simplificados.
- Workflow `Fisio IA | Ejercicios` verificado con `system_prompt` y `prompt_version`.

## Validacion
- `cd frontend && npm.cmd run check`: OK.
- `cd frontend && npm.cmd run build`: OK.
- `cd backend && npm.cmd run lint`: OK.
- n8n remoto: 11 workflows `Fisio IA | ...` activos.
- n8n local: JSON parse OK y conexiones sin nodos faltantes.

## Siguiente sesion
1. Redeploy EasyPanel de `fisio-frontend` y `fisio-backend` desde `main`.
2. Hard refresh.
3. Probar generacion de plan IA, PDF e historial.
4. Si no aparece el redisenio, revisar cache/commit desplegado.
5. Si aparece, ajuste fino visual con capturas.

Detalles antiguos: usar Git.
