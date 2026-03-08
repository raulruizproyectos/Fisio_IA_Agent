# Checkpoint 2026-03-08 - Copilot rail y CRM operativo local

## Estado confirmado
- Rama activa: `main`.
- Punto base antes de este tramo: `8bd41ff` (`fix(frontend): stabilize dashboard metrics and document checkpoint`).
- Frontend validado con `scripts/frontend-local-build.ps1` en `C:\Temp\Fisio_IA_Agent_frontend_local`.
- Este checkpoint deja el CRM en un estado visual y funcional claramente superior al de la sesion 59.

## Funcional ya en CRM
- Alta de pacientes desde modal en el listado CRM.
- Buscador superior operativo por nombre y email de paciente.
- Registro de notas de seguimiento desde historial.
- Creacion de citas desde el propio CRM.
- Copilot/Asistente clinico movido a rail lateral persistente:
  - visible en todas las paginas del CRM,
  - accesible desde sidebar, topbar y CTA del dashboard,
  - con contexto del paciente activo,
  - shortcuts de prompt,
  - textarea mas grande y legible,
  - acciones separadas para plan, chat y PDF.
- El textarea del asistente ya no se vacia al pulsar `Generar plan` o enviar el chat.

## Problema principal ya atacado
El problema reportado era doble:
1. Mala ergonomia visual del asistente.
2. Sensacion de que el agente no hacia nada porque el prompt desaparecia demasiado pronto.

El punto 1 queda resuelto en frontend con el nuevo rail persistente.
El punto 2 queda resuelto al mantener el texto visible y mejorar el feedback del composer.

## Riesgo conocido que sigue abierto
- Si el motor de ejercicios tarda demasiado, el frontend ahora se entiende mucho mejor, pero el flujo sigue dependiendo de una respuesta sincrona de `POST /api/exercises/recommend`.
- La siguiente mejora de mas impacto tecnico es pasar a polling/asynchrony o mejorar el handling del timeout del motor.

## Siguiente paso exacto recomendado
1. Desplegar este commit o levantar preview para validacion visual real.
2. Probar manualmente tres casos en navegador:
   - generar plan de ejercicios con paciente seleccionado,
   - exportar PDF,
   - enviar consulta general por chat.
3. Si el motor sigue tardando demasiado, implementar respuesta asincrona/polling para el flujo de ejercicios.
4. Despues, pulir detalles finos de copy y microestados si hace falta.