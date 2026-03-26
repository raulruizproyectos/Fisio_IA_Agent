## Checkpoint: fix critico bonos por tabla ausente en Supabase

**Fecha:** 2026-03-26
**Rama:** `main`
**Contexto del incidente:** alerta CRITICAL en `GET /api/bonos?estado=activo`

### Error recibido
- Servicio: `fisio-ia-agent-api`
- Ruta: `/api/bonos?estado=activo`
- Metodo: `GET`
- Mensaje: `Could not find the table 'public.crm_bonos' in the schema cache`
- Timestamp: `2026-03-26T07:26:53.266Z`

### Causa raiz
- El backend asumia que la tabla `public.crm_bonos` existia en Supabase.
- En el repo si existe la migracion correspondiente: `database/migrations/011_crm_bonos.sql`.
- Produccion no tiene esa tabla disponible en caché de esquema, asi que la lectura de `/api/bonos` estaba escalando a error y generando alerta CRITICAL.

### Fix aplicado en codigo
- `backend/src/routes/bonos.js`
  - deteccion explicita de tabla ausente (`PGRST205` / schema cache / table not found)
  - `GET /api/bonos` ahora degrada con seguridad a `200` + `{ data: [], unavailable: true, error, missing_table }`
  - operaciones de escritura (`POST`, `PATCH`, `DELETE`, `POST /:id/usar`) responden `503` con mensaje claro en vez de error generico
- `frontend/src/pages/index.astro`
  - el loader de bonos ahora distingue `payload.unavailable`
  - si falta la tabla, muestra estado de modulo no disponible en vez de `Sin bonos`

### Validado hoy
- `node --check backend/src/routes/bonos.js` OK
- Se localizaron los puntos exactos del fix en backend y frontend.
- El contrato degradado es compatible con el frontend actual porque ya consume `payload.data || []`.

### Siguiente paso operativo real
1. Desplegar el backend con este fix para cortar la alerta CRITICAL en lectura.
2. Ejecutar en Supabase la migracion `database/migrations/011_crm_bonos.sql`.
3. Verificar de nuevo:
   - `GET /api/bonos?estado=activo`
   - alta de bono
   - uso de bono
   - borrado de bono

### Nota de entorno local
- La reinstalacion de dependencias locales sigue pendiente; `npm install` no quedo resuelto en esta sesion.
- Sigue pendiente una pasada separada de limpieza de mojibake en `frontend/src/pages/index.astro`.
