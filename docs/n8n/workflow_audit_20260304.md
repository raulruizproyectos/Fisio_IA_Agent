# Auditoria n8n - 2026-03-04

## Alcance
- Auditoria completa de workflows en instancia n8n remota.
- Objetivo: consolidar uso operativo en `Fisio_IA_Agent / ...`, eliminar duplicados y dejar backup seguro.

## Dataset de auditoria
- Snapshot completo: `docs/data/n8n/workflows_snapshot_20260304_raw.json` (local, no versionado)
- Resumen estructurado: `docs/data/n8n/workflows_summary_20260304.json`

## Resultado cuantitativo
- Antes:
  - workflows totales: `54`
  - activos: `14`
  - duplicados por nombre detectados: `Fisio_IA_Agent / Nucleo Agente` (3x)
- Despues:
  - workflows totales: `52`
  - activos: `6`
  - activos bajo `Fisio_IA_Agent / ...`: `6` (100%)

## Cambios aplicados
1. Desactivados workflows activos fuera de `Fisio_IA_Agent / ...` (con backup previo):
   - `24Âº Escenario / Agentes IA Conversacional Agendar visitas Nodos Propios`
   - `2Âº Escenario / Trigger Formulario + Respuesta Gmail`
   - `Sub_Agente_Citas`
   - `Agente_IA_Carla_Final_V2`
   - `Sub_Agente_Calificador`
   - `Manejador_Errores_Global`
   - `create_booking`
   - `search_booking`
2. Eliminado duplicado exacto inactivo:
   - `Fisio_IA_Agent / Nucleo Agente` (id `Mo9tinzZI6TpOxxx`)
3. Eliminado previamente otro duplicado inactivo de `Nucleo Agente` (id `bmpDsTXnMyWytjrW`).

## Workflows activos finales (produccion actual)
- `Fisio_IA_Agent / Nucleo Agente`
- `Fisio_IA_Agent / Orquestador Intake-Video`
- `Fisio_IA_Agent / Puente Error Backend`
- `Fisio_IA_Agent / Subflujo Crear y Render Video`
- `Fisio_IA_Agent / Subflujo Pendientes`
- `Fisio_IA_Agent / Subflujo Revision Video`

## Backups de seguridad
- Carpeta: `docs/data/n8n/backup_before_deactivate_20260304/` (local, no versionado)
- Contiene JSON exportados de cada workflow desactivado para restauracion puntual.

## Patrones reutilizables identificados
- `Sub_Agente_Calificador`:
  - uso de `outputParserStructured` para salida validable.
  - buena base para W0 Router con decisiones trazables.
- `Sub_Agente_Citas` + `create_booking` + `search_booking`:
  - composicion por subflujos (`executeWorkflowTrigger`) y herramientas de calendar.
  - base reutilizable para W1 con idempotencia por `request_id`.
- `Manejador_Errores_Global`:
  - estrategia centralizada de `errorTrigger` + notificacion.
  - recomendable migrar a version canonica dentro de W0/W1/W2/W3.

## Hallazgo tecnico de API (bloqueante)
- Endpoints que devolvieron `500` en esta instancia:
  - `POST /api/v1/workflows`
  - `PUT /api/v1/workflows/{id}`
  - `PUT /api/v1/workflows/{id}/tags`
- Endpoints funcionales:
  - lectura (`GET`) de workflows
  - `activate/deactivate`
  - `DELETE`


## Sincronizacion de repositorio (2026-03-04)
- Estructura local ordenada para evitar mezcla de estados:
  - `n8n/Fisio_IA_Agent/production/`: export exacto de los `6` workflows activos en n8n.
  - `n8n/Fisio_IA_Agent/vnext/`: flujos canonicos de migracion (`W0/W1/...`) no activos aun en remoto.
- Resultado: todos los flujos del proyecto quedan dentro de la carpeta `Fisio_IA_Agent`, sin duplicados de archivo a nivel raiz.

## Recomendacion siguiente fase
1. Corregir en servidor n8n la causa de `500` para `create/update/tags`.
2. Construir y publicar vNext canonico:
   - W0 Router Telegram
   - W1 Agente Citas
   - W2 Agente Ejercicios
   - W3 Trigger Web CRM
3. Reintegrar patrones utiles de flujos desactivados con control de errores estandar:
   - retries con backoff
   - payloads estructurados
   - logging por `request_id` y `patient_id`.

## Actualizacion posterior (2026-03-04, noche)
- API n8n `POST /api/v1/workflows` vuelve a responder correctamente (`200`).
- Workflows vNext creados en remoto (inactivos):
  - `Fisio_IA_Agent / W2 Exercise Agent`
  - `Fisio_IA_Agent / W3 CRM Trigger`
- Se eliminaron duplicados de prueba de W3 creados durante verificaciones de API.
- Limitacion vigente:
  - `PUT /api/v1/workflows/{id}/tags` sigue en `500` (etiquetado manual recomendado en UI).
