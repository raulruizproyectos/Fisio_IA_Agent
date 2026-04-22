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
- Finanzas estaba repartido entre `Pagos`, `Gestoria`, `Facturacion` y `Bonos`, obligando a saltar entre cuatro entradas del menu lateral.
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
  - fase 2 inicial aplicada:
    - el sidebar pasa de cuatro entradas financieras a una sola entrada `Finanzas`,
    - `Pagos`, `Facturas`, `Bonos` y `Gestoria` quedan como pestanas internas,
    - la pestana activa se marca visualmente,
    - el sidebar mantiene `Finanzas` activo aunque se navegue a una subpagina financiera,
    - no se han tocado endpoints ni persistencia.

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
  - finanzas avanzadas.

## Pendiente recomendado tras fase 2
1. Revisar si merece la pena convertir `Finanzas` en una unica pagina real con pestanas internas cargadas sin cambiar de `data-page`.
2. Revisar `Historial` vs ficha de paciente para que el seguimiento viva preferentemente en la ficha y el historial global sea solo busqueda/auditoria.
3. Revisar `Biblioteca` y `Documentos` para separar claramente recursos terapeuticos de documentos administrativos.
4. Hacer una pasada visual por cada seccion tras el redeploy, una por una, con capturas desktop y movil.

## Verificacion realizada
- `npm run check` en frontend: OK, solo avisos antiguos no bloqueantes (`mobileDock`, `total`).
- `npm run build` en frontend: OK.
- Tras fase 2 financiera, se repiten `npm run check` y `npm run build`: OK.

## Verificacion pendiente en produccion
- Redeploy de `fisio-frontend`.
- Smoke test en EasyPanel:
  - Inicio muestra tarjetas utiles y no queda vacio.
  - Dock movil abre `Mensajes`.
  - Copiloto sigue abriendo desde `Generar plan guiado`.
  - `Finanzas` abre pagos.
  - Las pestanas `Pagos`, `Facturas`, `Bonos` y `Gestoria` navegan correctamente.
