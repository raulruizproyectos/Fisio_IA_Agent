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

Actualizar CHANGELOG.md y configuracion_pendiente.md SOLO cuando el usuario lo indique explicitamente al final de la sesion. No actualizar documentacion durante el desarrollo para ahorrar tokens.

## 4) Seguridad

- Nunca commitear secretos.
- Service role key solo en backend/n8n, nunca en frontend.
- En Storage: bucket `ejercicios` privado, signed URLs JIT.

## 5) Orquestacion

- n8n es el orquestador principal de automatizaciones.
- OpenAI se usa dentro de n8n para clasificacion/seleccion.
- Todo flujo relevante debe emitir `request_id` y registrar estado final.

## 6) Frontend responsive obligatorio (PC + Movil)

- Todo cambio de frontend debe ser compatible con escritorio (1280px+) y movil (375px+).
- Usar enfoque mobile-first: diseñar para movil, ampliar para desktop con media queries.
- Sidebar colapsable en movil, tablas con scroll horizontal o layout tarjetas, targets tactiles minimo 44x44px.
- Verificar visualmente en ambos breakpoints antes de dar por terminado cualquier cambio de UI.

## 7) Reutilizacion obligatoria de workflows n8n

- Antes de crear cualquier workflow o nodo nuevo en n8n, revisar TODOS los workflows existentes en la instancia.
- Priorizar copiar/adaptar nodos ya funcionales (credenciales, Gmail, errores, webhooks, subworkflows).
- Si un workflow existente cubre parcial o totalmente la necesidad, mejorarlo en lugar de crear uno nuevo.
- Registrar en cada sesion del changelog que se reviso y que se reutilizo.
