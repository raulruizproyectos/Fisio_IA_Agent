# Sesion actual - Cierre 2026-05-19

## Objetivo
Fisio IA Agent debe sentirse como CRM clinico premium para fisioterapia, con el copiloto IA como diferenciador principal.

## Estado final
- Rama: `main`.
- Ultimo commit publicado antes de este cierre docs: `bfb88dc` (`chore(n8n): simplify workflow and node names`).
- GitHub: `main` limpio y alineado con `origin/main`.
- Frontend validado durante la sesion: `npm.cmd run check` OK, `npm.cmd run build` OK.
- Backend validado durante la sesion: `npm.cmd run lint` OK.
- n8n produccion: actualizado directamente por API y verificado activo.
- Produccion app: pendiente redeploy `fisio-frontend` y `fisio-backend` en EasyPanel desde `main`.

## Hecho hoy
- Copiloto IA estabilizado visualmente: chat legible, input inferior fijo, panel derecho simplificado.
- Prompt premium de ejercicios versionado en `backend/src/lib/exercise-agent-prompt.js`.
- Backend envia `system_prompt` y `prompt_version` al workflow de ejercicios.
- Workflow n8n `Fisio IA | Ejercicios` actualizado en produccion y verificado.
- Renombrados 11 workflows de n8n produccion a formato breve `Fisio IA | ...`.
- Renombrados nodos n8n para lectura rapida: `Entrada`, `Normalizar`, `Validar`, `Generar plan`, `Responder`.
- JSON locales de n8n `production/` y `vnext/` alineados con produccion.
- Script de mantenimiento creado: `scripts/rename-n8n-fisio.mjs`.

## Decisiones clave
- No seguir parcheando solo CSS sobre clases heredadas.
- Usar `ops-*` como base nueva visual para las pantallas principales.
- Mantener funcionalidad antes que refactor profundo.
- No cambiar rutas webhook de n8n al renombrar workflows/nodos.
- Tratar prompts como codigo versionado.
- Si produccion muestra UI antigua, revisar cache/deploy antes de tocar codigo.

## Proximo arranque
1. Confirmar en EasyPanel que frontend y backend estan desplegados desde `main` con commit igual o posterior a `bfb88dc`.
2. Hard refresh en produccion.
3. Probar Copiloto IA: escribir caso, generar plan, comprobar historial y PDF.
4. Revisar Inicio, Pacientes, Agenda, Finanzas, Documentos y Copiloto IA con capturas.
5. Ajustar fino solo despues de confirmar que el commit desplegado es el correcto.

## Siguientes fases
- Fase 2: estabilizar CSS y reducir `!important` legacy.
- Fase 3: modularizar JS de `index.astro` por dominio.
- Fase 4: ficha paciente como case command center.
- Fase 5: IA clinica diferencial con trazabilidad, red flags y entrega PDF/Telegram.
