# Contributing Guide

## Objetivo
Mantener Fisio_IA_Agent estable, trazable y ordenado entre backend, n8n y Supabase.

## Reglas operativas
- Todo flujo nuevo de Fisio en n8n debe ir en carpeta/tag `Fisio_IA_Agent`.
- Cada sesion debe actualizar `CHANGELOG.md` con cambios y riesgos.
- Si cambia estado operativo, actualizar `configuracion_pendiente.md`.
- No subir secretos (tokens, keys, passwords, `.env`).

## Flujo de trabajo sugerido
1. Crear rama desde `main`.
2. Implementar cambios minimos necesarios.
3. Validar backend/frontend/n8n afectados.
4. Actualizar documentacion operativa.
5. Abrir PR usando la plantilla.

## Commits
Usar mensajes claros y accionables, por ejemplo:
- `feat: add telegram intake command parsing`
- `fix: handle empty n8n json response in agent route`
- `chore: update changelog and pending config`
