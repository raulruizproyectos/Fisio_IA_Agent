# Checkpoint 2026-04-22 - Simplificacion operativa de plataforma

## Objetivo
- Reducir redundancias visibles en la plataforma sin eliminar funciones.
- Priorizar la operativa real de una clinica: agenda, pacientes, mensajes, plan IA y cobros.
- Corregir el estado en el que el dashboard habia quedado demasiado vacio por overrides CSS finales.

## Auditoria rapida de UX
- `Inicio` tenia tres capas de accesos repitiendo casi las mismas acciones:
  - botones principales,
  - banda de accesos del hero,
  - parrilla de flujos.
- El bloque final `Dashboard: menos ruido, mas contraste` ocultaba demasiado:
  - metricas,
  - flujos clave,
  - agenda inmediata,
  - mensajes de pacientes,
  - tarjetas de sync/reserva.
- El dock movil priorizaba `Pagos`, pero para el dia a dia clinico es mas util tener `Mensajes` junto a inicio, pacientes, copiloto y agenda.
- Finanzas esta repartido entre `Pagos`, `Gestoria`, `Facturacion` y `Bonos`. No se ha fusionado aun para evitar riesgo funcional, pero queda identificado como proxima simplificacion.
- `Documentos`, `Biblioteca`, `Historial` y `Reserva online` siguen disponibles, pero no deben competir como acciones primarias del dashboard.

## Cambios aplicados
- `frontend/src/pages/index.astro`
  - titulo del dashboard cambiado a `Hoy en la clinica`.
  - eliminada la banda redundante `clinical-hero-band`.
  - eliminado el card lateral duplicado de `Planes y seguimiento`.
  - el hero conserva un unico CTA principal: `Generar plan guiado`.
  - `Flujos clave` queda como menu operativo compacto:
    - alta de paciente,
    - semana clinica,
    - mensajes y triage,
    - plan de ejercicios,
    - pagos y bonos.
  - restaurada la visibilidad de metricas, flujos, agenda inmediata, mensajes, sync y reserva online.
  - el dock movil cambia `Pagos` por `Mensajes`.

## Criterio de producto adoptado
- `Inicio` = cockpit diario, no escaparate de todas las funciones.
- Acciones primarias visibles:
  - atender agenda,
  - revisar mensajes,
  - abrir paciente,
  - generar plan,
  - revisar cobros.
- Acciones secundarias siguen existiendo en navegacion lateral o dentro de su modulo:
  - documentos,
  - biblioteca,
  - historial,
  - reserva online,
  - facturacion,
  - gestoria,
  - bonos.

## Pendiente recomendado para fase 2
1. Consolidar `Pagos`, `Facturacion`, `Bonos` y `Gestoria` en una unica seccion `Finanzas`, con pestanas internas.
2. Revisar `Historial` vs ficha de paciente para que el seguimiento viva preferentemente en la ficha y el historial global sea solo busqueda/auditoria.
3. Revisar `Biblioteca` y `Documentos` para separar claramente recursos terapeuticos de documentos administrativos.
4. Hacer una pasada visual por cada seccion tras el redeploy, una por una, con capturas desktop y movil.

## Verificacion realizada
- `npm run check` en frontend: OK, solo avisos antiguos no bloqueantes (`mobileDock`, `total`).
- `npm run build` en frontend: OK.

## Verificacion pendiente en produccion
- Redeploy de `fisio-frontend`.
- Smoke test en EasyPanel:
  - Inicio muestra tarjetas utiles y no queda vacio.
  - Dock movil abre `Mensajes`.
  - Copiloto sigue abriendo desde `Generar plan guiado`.
  - Pagos sigue accesible desde sidebar y desde `Pagos y bonos`.
