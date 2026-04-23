# Checkpoint 2026-04-23 - Cierre de sesion y continuidad

## Estado de cierre
- Rama: `main`.
- Ultimo commit funcional publicado: `8f568cf` - `refactor: compact patient continuity rail`.
- GitHub: `origin/main` sincronizado al cierre.
- Working tree esperado al cerrar: limpio.

## Cambios principales del tramo
- `Inicio` deja de funcionar como escaparate redundante y pasa a cockpit diario:
  - CTA principal para el agente,
  - flujos clave claros,
  - metricas, agenda inmediata, mensajes, sync y reserva visibles.
- Navegacion financiera simplificada:
  - sidebar con una sola entrada `Finanzas`,
  - `Pagos`, `Facturas`, `Bonos` y `Gestoria` como pestanas internas,
  - sin cambios en backend, endpoints ni base de datos.
- Ficha de paciente compactada:
  - rail derecho unificado como `Continuidad del caso`,
  - accion recomendada, canales y checklist en una sola tarjeta,
  - checklist reducida a progreso y pendientes prioritarios.
- Copilot clinico queda estabilizado por el checkpoint anterior:
  - fuente visual principal: `assistant-clinical-layout-reset-20260422`,
  - marcador de despliegue: `data-copilot-build="clinical-reset-20260422"`.

## Validaciones realizadas
- `npm run check` en `frontend`: OK.
- `npm run build` en `frontend`: OK.
- `git diff --check`: OK antes de commits funcionales y cierre documental.
- Avisos conocidos no bloqueantes:
  - `mobileDock` declarado pero no leido,
  - `total` declarado pero no leido.

## Pendiente operativo inmediato
1. Redeploy de `fisio-frontend` en EasyPanel.
2. Verificar que la UI productiva ya no muestra:
   - sidebar financiero antiguo con `Pagos`, `Gestoria`, `Facturacion`, `Bonos` por separado,
   - rail de ficha con tres tarjetas estrechas.
3. Smoke test desktop y movil:
   - `Inicio`,
   - `Finanzas`,
   - ficha de paciente,
   - Copilot,
   - dock movil `Mensajes`.

## Punto exacto para retomar
1. Confirmar primero si EasyPanel esta sirviendo el commit `8f568cf` o superior.
2. Si se ve UI antigua, no tocar codigo: hacer redeploy/cache refresh.
3. Si la UI nueva se ve correctamente, continuar con simplificacion de:
   - `Historial` vs ficha de paciente,
   - `Biblioteca` vs `Documentos`.
4. Mantener el criterio de producto:
   - cada bloque visible debe ayudar a una decision diaria,
   - evitar columnas estrechas con texto largo,
   - no ocultar funcionalidad real con overrides CSS globales.

