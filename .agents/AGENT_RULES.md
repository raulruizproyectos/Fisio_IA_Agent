# AGENT_RULES

Reglas de operacion para agentes en este repositorio.

## 1) Descubrimiento obligatorio de skills (siempre primero)

Antes de planificar, editar o ejecutar cambios:

1. Revisar raiz del repo.
2. Revisar `.agents/skills`.
3. Si faltan skills en repo, revisar skills globales montadas del workspace.
4. Reutilizar skills relevantes (n8n, prompts, changelog, storage, sql) antes de inventar procesos nuevos.

## 2) Principio de no ruptura

- Priorizar cambios aditivos sobre refactors agresivos.
- No borrar historial tecnico sin orden explicita.
- Mantener trazabilidad de decisiones en `CHANGELOG.md`.

## 3) Documentacion viva

Cada sesion debe actualizar:

- `CHANGELOG.md` (avance y decisiones).
- `configuracion_pendiente.md` (estado real para retomar rapido).

## 4) Seguridad

- Nunca commitear secretos.
- Service role key solo en backend/n8n, nunca en frontend.
- En Storage: bucket `ejercicios` privado, signed URLs JIT.

## 5) Orquestacion

- n8n es el orquestador principal de automatizaciones.
- OpenAI se usa dentro de n8n para clasificacion/seleccion.
- Todo flujo relevante debe emitir `request_id` y registrar estado final.
