## Checkpoint: sweep completo de limpieza + validacion local segura

**Fecha:** 2026-03-26
**Rama:** `main`

### Lo resuelto hoy
- Se corrigio el incidente critico de `/api/bonos` cuando falta la tabla `crm_bonos` en Supabase.
- Se alineo el frontend de bonos para mostrar `modulo no disponible` cuando el backend devuelve `unavailable: true`.
- Se endurecio la UX de bonos cuando el modulo no esta disponible:
  - aviso visible en pantalla,
  - acciones bloqueadas para crear, refrescar, filtrar o modificar bonos mientras falte la tabla.
- Se anadio un readiness operativo en backend: `GET /api/health/readiness`.
- La pantalla de configuracion del frontend ahora muestra el estado de readiness y las migraciones pendientes detectadas.
- Se endurecio el circuito financiero completo:
  - backend `facturas` degrada con seguridad cuando falta `crm_facturas`,
  - frontend de facturacion bloquea crear/refrescar/filtrar y muestra aviso visible si el modulo no esta disponible,
  - backend `pagos` degrada con seguridad cuando falta `crm_pagos`,
  - frontend de pagos bloquea crear/filtrar/editar/eliminar y muestra aviso visible si el modulo no esta disponible.
- Se endurecio tambien el modulo clinico:
  - backend `notas-clinicas` degrada con seguridad cuando falta `crm_notas_clinicas`,
  - `GET /api/pacientes/:id/ficha` expone `module_availability` para citas, pagos y notas cuando faltan tablas CRM,
  - la ficha del paciente muestra aviso visible de disponibilidad parcial,
  - las pestañas de citas/pagos/notas dejan de aparentar "sin datos" cuando en realidad el modulo esta caido,
  - el boton `Nueva nota` queda bloqueado si falta `crm_notas_clinicas`.
- Se completo y mantuvo el refinado visual de la ficha del paciente:
  - summaries de notas, citas, pagos y documentos,
  - tarjetas mas ricas para notas y documentos.
- Se limpio el mojibake de `frontend/src/pages/index.astro`.
- Se eliminaron hints y warnings tecnicos residuales en frontend/backend.

### Validacion cerrada hoy
#### Frontend
Validado fuera de `G:` en `C:\Temp\Fisio_IA_Agent_frontend_local` usando `scripts/frontend-local-build.ps1`.
- `astro build` -> OK
- `astro check` -> 0 errores, 0 warnings, 0 hints
- Revalidado despues del ultimo hardening visual/funcional de bonos -> OK
- Revalidado tras anadir readiness visible en configuracion -> OK
- Revalidado tras endurecer facturas -> OK
- Revalidado tras endurecer pagos -> OK
- Revalidado tras endurecer la ficha del paciente con disponibilidad parcial -> OK

#### Backend
Validado fuera de `G:` en `C:\Temp\Fisio_IA_Agent_backend_local` usando `scripts/backend-local-validate.ps1`.
- `npm run lint` -> OK
- `node --check` -> OK en los ficheros clave del backend
- Revalidado tras anadir `/api/health/readiness` -> OK
- Revalidado tras endurecer `facturas` -> OK
- Revalidado tras endurecer `pagos` -> OK
- Revalidado tras endurecer `notas-clinicas` y `pacientes/:id/ficha` -> OK

### Riesgo operativo que sigue vivo
- El fix de bonos ya evita la caida del endpoint, pero para restaurar funcionalidad completa de bonos en produccion sigue pendiente ejecutar:
  - `database/migrations/011_crm_bonos.sql`
- Si las migraciones `009_crm_facturas.sql` o `007_crm_pagos.sql` no estuvieran aplicadas, los modulos ya no romperan, pero quedaran marcados como no disponibles.
- Si faltan `database/migrations/008_ficha_paciente_enriquecida.sql` o el esquema de citas de `database/schema_vnext.sql`, la ficha del paciente seguira cargando pero en modo parcial.
- Hasta desplegar backend + migraciones pendientes, los modulos opcionales pueden responder como `unavailable` en lectura y `503` en escritura.

### Estado recomendado para la proxima accion
1. Desplegar el backend actualizado.
2. Ejecutar en Supabase las migraciones pendientes reales, empezando por:
   - `database/migrations/011_crm_bonos.sql`
   - `database/migrations/009_crm_facturas.sql` si readiness la marca como pendiente
   - `database/migrations/007_crm_pagos.sql` si readiness la marca como pendiente
3. Verificar en produccion:
   - `GET /api/bonos?estado=activo`
   - `GET /api/facturas?anio=2026`
   - `GET /api/pagos?anio=2026`
   - `GET /api/health/readiness`
   - `GET /api/pacientes/:id/ficha`
   - crear bono
   - usar bono
   - crear factura
   - descargar PDF de factura
   - crear/editar/borrar pago
4. Confirmar en frontend que, antes de migrar, las pantallas de bonos/facturas/pagos muestran aviso de indisponibilidad y dejan los controles bloqueados.
5. Confirmar en la ficha del paciente que, si faltan tablas CRM, aparece el aviso de disponibilidad parcial y no se permite crear notas clinicas.
6. Confirmar en configuracion que `Readiness DB` refleja el estado real de migraciones pendientes.

### Nota de entorno
- La validacion fiable de este proyecto debe seguir haciendose fuera de `G:\Mi unidad\...`.
- Scripts confirmados como via segura:
  - `scripts/frontend-local-build.ps1`
  - `scripts/backend-local-validate.ps1`

