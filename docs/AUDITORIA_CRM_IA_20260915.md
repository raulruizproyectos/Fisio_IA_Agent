# Auditoria tecnica y clinica — Fisio IA Agent (CRM + Agente IA)

- Fecha de auditoria: 2026-09-15
- Alcance: repositorio completo (frontend Astro, backend Express, SQL Supabase, workflows n8n, scripts, CI, docs) y estado de ramas/workspaces locales
- Metodo: revision estatica del codigo, comparacion entre ramas con `git`, inventario automatizado de endpoints, escaneo de secretos, validaciones ejecutadas en local y parseo de workflows n8n

## 0. Aviso de alcance: hay tres estados distintos del repositorio

Esta auditoria se reviso dos veces porque la primera version se hizo sobre la copia **obsoleta** del workspace. Estado real verificado:

| Estado | Ubicacion | Commit | Fecha | Contenido |
|---|---|---|---|---|
| A. Workspace de trabajo (el que estaba abierto) | `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent` | `8c208cf` (`main`) | 2026-05-27 | Version sin hardening. `origin/HEAD` sigue apuntando aqui |
| B. Otra copia local con cambios sin commitear | `C:\Visual Code\PROYECTOS_IA\Fisio_IA_Agent` | `fe2071b` (`main`, 4 commits por detras) | 2026-05-27 | Intento de auth distinto (`middleware/auth.js`, `routes/auth.js`) sin commitear, del 2026-05-25 |
| C. Estado mas reciente del codigo | `origin/production-hardening` | `f4c04d4` | **2026-09-03** | Hardening de produccion completo: JWT + RLS + rate limit + aprobacion clinica + tests + CI |

`origin/production-hardening` es **superset estricto** de `main` (base comun `8c208cf`, 20 commits adelante, 75 ficheros, +11.709/-3.525 lineas), pero **no esta mergeado en `main`**.

> **Riesgo operativo numero uno**: el `README.md` declara que la rama productiva es `main` y `origin/HEAD -> origin/main`. Si EasyPanel despliega `main`, **produccion sigue ejecutando la version sin autenticacion**. La auditoria de la seccion 4 esta hecha sobre el estado C (el correcto); la seccion 5 resume que se corrige al pasar de A a C.

## 1. Veredicto ejecutivo

Hay dos lecturas legitimas del mismo proyecto:

- **Version `main` (estado A/B)**: producto funcionalmente avanzado pero **no desplegable con datos de salud**. API de 68 endpoints sin autenticacion, `service_role` accesible desde peticiones anonimas, sin RLS en tablas CRM, sin auditoria y sin pruebas.
- **Version `production-hardening` (estado C)**: el hardening esta **bien resuelto y es el camino correcto**. Autenticacion por Supabase Auth con verificacion de JWT, autorizacion por perfil, cliente Supabase por peticion (sin fallback privilegiado), RLS con aislamiento por profesional, rate limiting, webhooks firmados, aprobacion clinica obligatoria antes de PDF/Telegram, idempotencia, tests y CI reproducible.

**Lo que falta para produccion real** no es seguridad de base (ya esta), sino: mergear y desplegar el hardening, aplicar la migracion en la base, escribir la auditoria de accesos, cerrar el ciclo RGPD (supresion/retencion) y cubrir con pruebas el aislamiento entre profesionales.

### Semaforo (estado C, `production-hardening`)

| Dominio | Estado | Comentario |
|---|---|---|
| Autenticacion / autorizacion | BUENO | JWT Supabase + perfil `crm_perfiles` + 401/403 + `/api/me` |
| Aislamiento de datos (multi-tenant) | BUENO (sin probar) | RLS + `can_access_crm_patient`; falta prueba real de aislamiento |
| Servicios internos (cron, n8n, Telegram) | BUENO | Secretos distintos, comparacion timing-safe, header auth en n8n |
| Auditoria y trazabilidad | DEBIL | `crm_audit_log` existe y esta protegida, pero **nadie escribe en ella** |
| RGPD (supresion / retencion) | INCOMPLETO | Documentado como pendiente, sin procedimiento implementado |
| Seguridad clinica (IA) | MEJORABLE | Aprobacion humana ya obligatoria; sigue habiendo mezcla de cuidados/dosis al reasignar ejercicios |
| Testing | MINIMO | 3 ficheros (`node --test`), sin pruebas de integracion ni de RLS |
| Arquitectura / deuda | PENDIENTE | `index.astro` 8.651 lineas; CSS 2.122 lineas con `!important` |
| Operacion / despliegue | RIESGO | Hardening fuera de `main`; migracion SQL pendiente de aplicar |
| Documentacion | BUENO | `PRODUCTION_READINESS.md` + auditorias 2.0/2.1, con checklist de smoke real |

## 2. Inventario del sistema

### Componentes
- `frontend`: Astro 5 + Nanostores + Tailwind utilities + CSS modular. 4 paginas en el estado C: `index.astro`, `login.astro`, `reset-password.astro`, `reserva.astro`.
- `backend`: Express 4 + Supabase + Google Calendar + Telegram + PDFKit + helmet + express-rate-limit. 11 routers, **70 endpoints** en el estado C (68 en `main`; el estado C añade `PATCH /recommendations/:id/draft` y `POST /recommendations/:id/review`).
- `database`: `schema.sql` (legacy), `schema_vnext.sql` (CRM), migraciones hasta `20260901_production_security_hardening.sql` (453 lineas), `seed.sql`.
- `n8n`: `production/` (W1, W5, W6, nucleo, puente-error) y `vnext/` (W1, W2, W3, core, telegram-chat, telegram-fisio-reports) con Header Auth.
- `scripts`: 17 utilidades de validacion, sincronizacion, smokes y doctor de workspace.

### Metricas (estado C, medidas sobre el worktree de `f4c04d4`)
| Archivo | Lineas | Nota |
|---|---:|---|
| `frontend/src/pages/index.astro` | 8.651 | Monolito; la propia auditoria 2.1 propone extraerlo |
| `backend/src/routes/professional.js` | 2.869 | Agenda, reserva publica, Calendar, programas |
| `backend/src/routes/telegram.js` | 2.704 | Adaptador Telegram + parser + casos de uso |
| `backend/src/routes/exercises.js` | 1.993 | Recomendacion, jobs async, aprobacion, informes |
| `backend/src/middleware/security.js` | 96 | `authorizeRequest`, `secureEqual`, `requestIdentity` |
| `backend/src/lib/supabase.js` | 36 | Cliente por peticion + Proxy sin fallback privilegiado |
| `frontend/src/styles/premium-clinic-ui.css` | 4.204 | 2.122 lineas con `!important` (~50 %) |
| `backend/test/*.test.js` | 147 (3 ficheros) | `node --test`, 11 pruebas |
| `frontend/src/pages/login.astro` / `reset-password.astro` | 128 / 69 | Pantallas de acceso y recuperacion |

### Flujo clinico implementado (estado C)
1. El fisioterapeuta introduce diagnostico/sintomas en el copiloto.
2. El backend consulta catalogo, filtra candidatos y llama a n8n/Edge Function con el prompt versionado (`EXERCISE_AGENT_PROMPT_VERSION`).
3. La recomendacion nace en `requiere_revision` y se persiste con `prompt_version`, `model_name` e `idempotency_key`.
4. `PATCH /api/exercises/recommendations/:id/draft` (editor guiado) y `POST /api/exercises/recommendations/:id/review` permiten revisar y aprobar/rechazar.
5. PDF (`/reports/pdf`) y Telegram (`/api/telegram/patient-report/send`) permanecen **bloqueados** hasta la aprobacion.
6. El seguimiento se registra con `POST /api/exercises/recommendations/:id/follow-up` (nota, adherencia, escala de dolor) y notas clinicas con `dolor_eva`.

## 3. Que resuelve el estado C (verificado en codigo)

### Autenticacion y autorizacion
`backend/src/middleware/security.js`: `authorizeRequest` deja publicos solo salud y reserva publica; valida `x-internal-api-key` (cron y llamadas internas) con `secureEqual` (timing-safe); valida `X-Telegram-Bot-Api-Secret-Token` en `/api/telegram/incoming` (401 si no coincide, 503 si no hay secreto configurado); para el resto exige `Bearer`, verifica con `supabase.auth.getUser(token)`, carga el perfil activo en `crm_perfiles` y devuelve 403 si no existe. Expone `/api/me`.

### Cliente Supabase por peticion (clave del diseno)
`backend/src/lib/supabase.js`: `createUserSupabase(token)` crea un cliente con la `anon key` + JWT del usuario; `runWithRequestContext` guarda el cliente en `AsyncLocalStorage`; el export `supabase` es un **Proxy que lanza excepcion si no hay contexto** ("there is deliberately no privileged fallback"). Resultado: las rutas operan con RLS aplicado, y `serviceSupabase` queda confinado a `security.js` para public booking, cron, Telegram y validacion de token.

### Aislamiento por profesional en base de datos
`database/migrations/20260901_production_security_hardening.sql`: activa RLS sobre todas las tablas listadas; crea `private.get_my_profile_id()`, `private.get_my_profesional_id()`, `private.is_crm_admin()` y `private.can_access_crm_patient()` (acceso si es admin, si creo al paciente o si tiene asignacion activa); politicas `for all to authenticated using/with check` por paciente; catalogos y media en solo lectura; `revoke all ... from anon, authenticated` y `grant ... to service_role`; `vault_read_secret` restringido a `service_role`; `search_path` fijado en funciones; tabla `crm_recordatorio_envios` para recordatorios idempotentes.

### Endurecimiento HTTP
`backend/src/index.js` (estado C): `app.set('trust proxy', 1)`, `disable('x-powered-by')`, `helmet`, `express.json({ limit: '512kb', strict: true })`, rate limit global (`API_RATE_LIMIT`, 300/15 min), 20/h en reserva publica y 180/min en Telegram; error handler que en `NODE_ENV=production` devuelve mensaje generico + `request_id`, con logs estructurados y `X-Webhook-Secret` en el notificador de errores.

### Cadena de suministro y CI
`backend/package-lock.json` versionado (se elimino la linea del `.gitignore`), `backend/Dockerfile`, `npm ci` en CI, `npm run lint` + `npm test` + `node --check` sobre todo `src`, `npm audit --omit=dev --audit-level=high` en backend y frontend, `astro check` y build del frontend, y validacion de JSON de n8n que **falla si un workflow `vnext` contiene endpoints productivos fijos**.

### Seguridad clinica (parcial)
- Todo informe nace `requiere_revision`; estados permitidos `requiere_revision | aprobada | rechazada | enviada | error` (`exercises.js:1154`).
- Se filtran los ejercicios que no existen en el catalogo `catalogById` y se devuelve **422 `no_compatible_exercises`** si no queda ninguno valido.
- Si falla el insert de items, se elimina la recomendacion creada (sin huerfanos).
- Idempotencia por `requestId` y `Idempotency-Key`.

## 4. Hallazgos vigentes en el estado C (`production-hardening`)

### R-1 (P0 operativo). El hardening no esta en `main` y la migracion no esta aplicada
**Evidencia**: `git merge-base main origin/production-hardening` = `8c208cf`; `git branch -r --contains main` incluye `origin/main` y `origin/production-hardening` (superset), pero `main` no contiene ninguno de los 20 commits de hardening. `README.md` y `PROJECT_CONTEXT.md` declaran `main` como rama productiva; `origin/HEAD -> origin/main`. La migracion `database/migrations/20260901_production_security_hardening.sql` esta sin aplicar hasta ejecutar los pasos 2-3 de `docs/PRODUCTION_READINESS.md`.
**Impacto**: si el despliegue actual sigue `main`, la API publica sigue abierta y sin RLS. Todo el trabajo de seguridad es inefectivo hasta el merge + migracion + redeploy.
**Recomendacion**: merge (fast-forward posible) a `main`, aplicar la migracion en staging y luego en produccion en ventana sin escrituras, redeploy backend/frontend y ejecutar las 13 pruebas de humo del documento de readiness.

### R-2 (P0 privacidad). No existe auditoria de accesos ni de cambios clinicos
**Evidencia**: `git grep -in 'audit' origin/production-hardening -- backend/src` -> 0 resultados. La tabla `crm_audit_log` se crea/endurece (`database/migrations/20260901_production_security_hardening.sql:65-84`, con `revoke ... from anon, authenticated` y `grant ... to service_role` en `:405-409`) pero **ningun flujo de la aplicacion escribe en ella**; tampoco hay triggers de auditoria en la migracion.
**Impacto**: con datos de salud (art. 9 RGPD) no se puede responder "quien consulto o modifico esta historia" (arts. 5.2, 30 y 32 RGPD), ni detectar accesos indebidos. El propio proyecto exige trazabilidad (`docs/NORMA_ROBUSTEZ_Y_ERRORES.md`).
**Recomendacion**: helper `recordAudit()` en backend que escriba en `crm_audit_log` (actor desde `req.auth`, `request_id`, `entity_type`, `before/after`) en toda escritura clinica y en las lecturas de ficha/informes; o triggers equivalentes en PostgreSQL.

### R-3 (P1 RGPD). Supresion y retencion sin implementar
**Evidencia**: `router.delete('/:id')` en `backend/src/routes/patients.js:353-365` sigue borrando de la tabla legacy `pacientes` (`supabase.from('pacientes').delete()`), no de `crm_pacientes`. No hay borrado ni anonimizacion de `crm_pacientes`, `crm_notas_clinicas`, `crm_recomendaciones`, `crm_documentos`, informes archivados ni objetos de Storage. `docs/PRODUCTION_READINESS.md` lo deja como tarea manual ("Definir plazos de conservacion... derechos de acceso/supresion").
**Impacto**: una solicitud de supresion (art. 17) no puede cumplirse de forma verificable; ademas el endpoint puede dejar huerfanos los datos CRM.
**Recomendacion**: procedimiento de supresion y anonimizacion que cubra todas las tablas y Storage, con traza en `crm_audit_log`, y soft delete (`activo=false`) para el flujo normal de UI.

### R-4 (P1 clinico). La reasignacion por cobertura de imagen sigue mezclando contenido clinico
**Evidencia**: `backend/src/routes/exercises.js:1615` (`improveSelectionImageCoverage`) se sigue aplicando **despues** de la seleccion del modelo (`:329`). Al sustituir un ejercicio conserva los cuidados y la dosis del ejercicio original:
```
cautions: Array.isArray(current?.cautions) && current.cautions.length ? current.cautions : ...
series: current?.series ?? replacement.metadata?.series_defecto ?? 3,
repeticiones: current?.repeticiones ?? replacement.metadata?.repeticiones_defecto ?? 10,
```
y recalcula `confidence: Math.max(...)` con minimo 0.6.
**Impacto**: el paciente puede recibir **contraindicaciones de un ejercicio distinto** al pautado y una dosificacion que no corresponde al procedimiento mostrado. Defecto de seguridad clinica real, mitigado porque el plan requiere aprobacion humana.
**Recomendacion**: al sustituir, tomar siempre `cautions` y dosis del ejercicio de reemplazo, o mejor no sustituir: marcar "sin apoyo visual" y dejar que el fisioterapeuta lo ajuste.
### R-5 (P1 calidad). Cobertura de pruebas minima en lo critico
**Evidencia**: `backend/test/` contiene 3 ficheros (147 lineas: `security.test.js` 74, `readiness.test.js` 37, `exercises.test.js` 36) ejecutados con `node --test`. **Ejecutados en esta auditoria: 11/11 pasan**, cubriendo `secureEqual` (secretos vacios rechazados), salud publica, **cron rechazando clave interna incorrecta**, **webhook Telegram rechazando secreto incorrecto**, contexto privilegiado con clave valida, trazabilidad de `requestIdentity`, contrato del motor de ejercicios y readiness sin filtracion de claves. La propia auditoria 2.1 reconoce la laguna: "faltan pruebas reales de aislamiento y restauracion | P0 antes de produccion".
**Impacto**: sin pruebas de integracion no hay garantia automatica de que un profesional no pueda leer pacientes de otro, ni de que un plan no aprobado no se pueda exportar.
**Recomendacion**: pruebas de integracion con dos usuarios (A/B) y un admin sobre pacientes, citas, notas, informes, PDF y Telegram; y un test de que la migracion deja RLS activa en todas las tablas `crm_*`.

### R-6 (P2 coste/abuso). Limite de generacion IA no especifico
**Evidencia**: `backend/src/index.js` (estado C) aplica limites especificos a reserva publica (20/h) y Telegram (180/min), pero `POST /api/exercises/recommend` y `/recommend/async` solo quedan bajo el limite global (`API_RATE_LIMIT`, 300/15 min).
**Impacto**: un usuario autenticado, o una sesion comprometida, puede consumir cuota de modelo a ritmo alto (coste OpenAI y Edge Function).
**Recomendacion**: cuota por usuario/hora para generacion de informes y registro del consumo junto al job.

### R-7 (P2 integridad). Duplicidad de fuentes de verdad y migracion "al vuelo"
**Evidencia**: coexisten `pacientes`/`profesionales` (legacy) y `crm_pacientes`/`crm_perfiles`; `resolveCrmPatientId`/`resolveCrmProfessionalId` siguen creando filas CRM durante peticiones y adivinando `nombre`/`apellidos` con `splitFullName` (`backend/src/routes/exercises.js`).
**Impacto**: duplicados, asignaciones ausentes y datos sucios; un paciente legacy sin `created_by_profile_id` ni asignacion activa queda fuera del alcance de `can_access_crm_patient`, por lo que puede resultar inaccesible o mal atribuido tras activar RLS.
**Recomendacion**: migracion batch unica y verificable, prohibir altas implicitas y asegurar asignacion activa para los pacientes legacy.

### R-8 (P2 mantenibilidad). Monolito de frontend y CSS con `!important`
**Evidencia**: `frontend/src/pages/index.astro` = 8.651 lineas; `premium-clinic-ui.css` = 4.204 lineas, de las que 2.122 contienen `!important` (~50 %). En el estado A (Astro 5) el script de la pagina se empaquetaba en un unico bundle de ~239 kB, sin division por vista.
**Recomendacion**: ejecutar el plan de la auditoria 2.1 (`controllers/*.ts`, `services/api.ts`) con pruebas de contrato sobre IDs y `data-*`; reducir `!important` por capas en lugar de anadir overrides.

### R-9 (P2 divergencia). Trabajo local sin commitear y dos implementaciones de auth
**Evidencia**: en `C:\Visual Code\PROYECTOS_IA\Fisio_IA_Agent` hay cambios sin commitear del 2026-05-25/27: `backend/src/middleware/auth.js` (auth "opcional" con `STRICT_AUTH` y **fallback a cliente admin**), `backend/src/routes/auth.js`, `backend/src/lib/supabase.js` y modificaciones en 13 routers. Es un enfoque distinto y anterior al de la rama (`middleware/security.js`, sin fallback privilegiado). Esa copia esta 4 commits por detras de `main`.
**Impacto**: riesgo de merge accidental que reintroduzca el modo sin autenticacion (el fallback a cliente admin es justo lo que la version buena prohibe).
**Recomendacion**: descartar o archivar ese trabajo en una rama (`archive/local-auth-may26`) y fijar `production-hardening` como unica linea de seguridad.

### R-10 (nit). CORS sigue permitiendo peticiones sin `Origin`
**Evidencia**: el callback de CORS de `backend/src/index.js` (estado C) mantiene `if (!origin) return callback(null, true)`.
**Impacto**: bajo, porque la autenticacion ahora es obligatoria; conviene aun asi documentar los casos sin `Origin` (salud, webhooks, cron) y restringir el resto.
**Recomendacion**: allowlist explicita por ruta para trafico server-to-server.

### R-11 (P2 entorno, no codigo). La politica de Control de Aplicaciones bloquea el binario nativo de Astro 7
**Evidencia** (reproducido y corregido tras investigar): al validar en un worktree temporal en `C:\temp\fisio-audit-ph`, `npm run check` fallaba con el mensaje generico de npm sobre optional dependencies. El stack real (capturado con `npm run check > check.log 2>&1`) muestra la causa verdadera:
```
Caused by:
  An Application Control policy has blocked this file.
  \\?\C:\temp\fisio-audit-ph\frontend\node_modules\@astrojs\compiler-binding-win32-x64-msvc\astro.win32-x64-msvc.node
    at Module._load (node:internal/modules/cjs/loader:1300:12)
```
El mismo proyecto y el mismo `node_modules` compilan sin problema en `C:\Visual Code\...`.
**Impacto**: no es un defecto del repositorio. La politica bloquea el binario nativo de Astro 7 (`@astrojs/compiler-binding` 0.4.0) en **cualquier** ruta: se reprodujo igual en `C:\temp\...` y en `C:\Visual Code\fisio-audit-ph`. La razon de que el estado A si validara es tecnica: `main` usa **Astro 5.18.1** con `@astrojs/compiler` (sin binario nativo bloqueado), mientras que `production-hardening` usa **Astro 7.2.10** con `@astrojs/compiler-binding` nativo. Riesgo real: diagnosticar mal el fallo como problema de dependencias o tocar el `package-lock` sin necesidad.
**Recomendacion**: validar el frontend de la rama en CI (ubuntu, sin esa politica) o anadir una excepcion de Control de Aplicaciones para ese paquete en la maquina de desarrollo. Ante un "Cannot find native binding", redirigir la salida a fichero y leer el stack completo: distingue politica de seguridad de un problema de dependencias. Nota: el `package-lock.json` del frontend no lista entradas `@rollup/*`; con Astro 7 esto es esperado, por lo que **no** se considera defecto del lock.

## 5. Contraste: hallazgos de la version `main` y su estado en el estado C

| Hallazgo en `main` (8c208cf) | Estado en `production-hardening` (f4c04d4) |
|---|---|
| 68 endpoints sin autenticacion; `service_role` accesible | **RESUELTO**: JWT Supabase + perfil + cliente por peticion sin fallback privilegiado |
| `PROF_ID` hardcodeado en el frontend | **RESUELTO**: `authContext.profileId` desde `/api/me`; hay `/login` y `/reset-password` |
| Sin RLS en tablas `crm_*` | **RESUELTO**: RLS + politicas por paciente + funciones `private.*` con `security definer` |
| Endpoints de cron y webhooks sin secreto | **RESUELTO**: `INTERNAL_API_KEY`, `TELEGRAM_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET`, Header Auth en n8n |
| Sin auditoria de accesos | **PENDIENTE**: tabla protegida pero sin escrituras de aplicacion (R-2) |
| Borrado de paciente sobre tabla legacy / sin supresion RGPD | **PENDIENTE** (R-3) |
| Plan de IA sin validacion humana, indistinguible de un fallback | **RESUELTO**: todo nace `requiere_revision`; PDF/Telegram bloqueados hasta aprobacion |
| Ejercicios inventados por el modelo persistidos | **RESUELTO parcialmente**: filtrado contra catalogo + 422; falta validar el resto de campos clinicos |
| Sin validacion de esquema de entrada | **PENDIENTE**: validacion sigue ad-hoc (sin zod/joi/ajv) |
| Sin rate limiting ni cabeceras de seguridad | **RESUELTO**: helmet + 3 niveles de rate limit + limite de payload |
| Fuga de `err.message` al cliente | **RESUELTO**: mensaje generico en produccion + `request_id` |
| 0 tests; CI solo `node --check` | **MEJORADO**: `node --test` (3 ficheros), `npm ci`, lint, `astro check`, `npm audit`, guard de endpoints en n8n |
| Sin lockfile en backend; Dockerfile con `npm install` | **RESUELTO**: `package-lock.json` versionado, `npm ci`, `backend/Dockerfile` |
| Deteccion de red flags por regex; mezcla de cuidados/dosis por imagen | **PENDIENTE** (R-4) |
## 6. Validaciones ejecutadas en esta auditoria

Sobre el estado A (workspace `main`) para comprobar que la base tecnica esta sana:

| Comprobacion | Comando | Resultado |
|---|---|---|
| Lint backend | `npx eslint src/` | 0 errores (exit 0) |
| Sintaxis backend | `node --check` sobre 13 ficheros (index + 11 routers + 2 libs) | 0 errores |
| Tipos/build frontend | `npm run check` y `npx astro build` | 0 errores, 0 warnings; build de 2 paginas OK |
| Secretos versionados | `git ls-files` + scan de `sk-*`, `eyJ*`, `AIza*`, `PRIVATE KEY` y tokens | Sin secretos en el repo; solo `backend/.env.example` |
| Workflows n8n | parseo JSON de `production/` y `vnext/` + inspeccion de nodos webhook | Validos; en estado A sin `authentication` |
| Inventario API | conteo automatizado de `router.(get|post|put|patch|delete)` | 68 endpoints en 11 routers |
| Estado de ramas | `git log`, `merge-base`, `branch -r --contains`, `worktree list` | Hardening fuera de `main`; 3 estados distintos del repo |

Comprobaciones pendientes que **no** se pueden hacer sin el entorno real (y que la propia rama reconoce): aislamiento RLS entre dos profesionales, restauracion desde backup de Supabase, credenciales OAuth de Gmail/Calendar en n8n y presupuestos de rendimiento en staging (LCP/CLS/INP).

### Sobre el estado C (`origin/production-hardening`, worktree temporal de `f4c04d4`)

| Comprobacion | Comando | Resultado |
|---|---|---|
| Instalacion backend | `npm ci` (lockfile de la rama) | 294 paquetes, sin errores |
| Lint backend (incluye `test/`) | `npx eslint src/ test/` | **0 errores (exit 0)** |
| Tests backend | `npm test` (`node --test`) | **11/11 pasan** (687 ms) |
| Tests de seguridad ejecutados | incluidos arriba | cron rechaza clave incorrecta; webhook Telegram rechaza secreto incorrecto; clave interna valida abre contexto privilegiado; `secureEqual` rechaza vacios; salud publica; `requestIdentity` acota el id |
| Instalacion frontend | `npm ci` (lockfile de la rama) | 297 paquetes instalados sin errores |
| Check/build frontend | `npm run check` | **No validable en esta maquina**: la politica de Control de Aplicaciones bloquea `@astrojs/compiler-binding-win32-x64-msvc/astro.win32-x64-msvc.node` (Astro 7). Reproducido en `C:\temp` y en `C:\Visual Code`. Debe validarse en CI (ubuntu) o con excepcion de politica (ver R-11) |

> Nota: el backend de la rama si queda **completamente validado en local** (lint + 11/11 tests). Para el frontend, la evidencia disponible es la del estado A (Astro 5, `npm run check` y `astro build` OK), que confirma que el codigo del CRM compila; el cambio de compilador a binario nativo es lo que impide repetirlo aqui.

## 7. Plan de accion priorizado

### Bloque 1 — Poner en produccion lo que ya esta hecho (72 h)
1. Merge de `production-hardening` a `main` (fast-forward posible) y push, para que `origin/HEAD` deje de apuntar a la version sin auth.
2. Aplicar `database/migrations/20260901_production_security_hardening.sql` en staging; validar que RLS queda activa en todas las tablas `crm_*` y que cada usuario Auth tiene fila activa en `crm_perfiles`.
3. Configurar secretos (`INTERNAL_API_KEY` >= 32 bytes, `TELEGRAM_WEBHOOK_SECRET` distinto del token del bot, `N8N_WEBHOOK_SECRET`) en backend y en la credencial Header Auth de n8n.
4. Ejecutar las 13 pruebas de humo de `docs/PRODUCTION_READINESS.md` (incluye "otro usuario no puede leer el paciente creado" e "invocar cron y webhooks sin secreto: 401").
5. Repetir en produccion en ventana sin escrituras y con backup previo.
6. Archivar el trabajo local divergente (`archive/local-auth-may26`) y dejar una sola linea de seguridad.
7. Validar el frontend de la rama en CI o en una maquina sin la politica de Control de Aplicaciones (R-11): `npm ci`, `npm run check`, `npm run build`. En local no es posible con Astro 7.

### Bloque 2 — Cerrar riesgos RGPD y de trazabilidad (2 semanas)
7. Implementar `recordAudit()` y cubrir escrituras clinicas + lecturas de ficha e informes (R-2).
8. Procedimiento de supresion/anonimizacion completo: tablas + Storage + traza (R-3).
9. Documentar plazos de conservacion, DPA/encargado del tratamiento y procedimiento de brechas.
10. Cuota de generacion IA por usuario y registro de coste (R-6).

### Bloque 3 — Seguridad clinica y pruebas (3-4 semanas)
11. Corregir la reasignacion por imagen: no heredar `cautions` ni dosis de otro ejercicio (R-4) y registrar en el informe cuando un ejercicio se haya ajustado.
12. Ampliar la deteccion de red flags (catalogo gestionado en BD) y exigir nota clinica con alerta roja antes de aprobar.
13. Pruebas de integracion de aislamiento (A/B/admin) y de bloqueo de PDF/Telegram sin aprobacion (R-5).
14. Validacion declarativa de payloads por endpoint (zod/joi/ajv).

### Bloque 4 — Deuda estructural (continuo)
15. Extraer controladores de `index.astro` y reducir `!important` (R-8).
16. Migracion batch legacy -> CRM y fin de las altas implicitas (R-7).
17. Restringir CORS sin `Origin` (R-10) y revision mensual de dependencias, n8n y Node.
## 8. Anexo A — Inventario de endpoints (70 en estado C / 68 en `main`)

| Router | Endpoints |
|---|---|
| `agent.js` | `POST /message` |
| `bonos.js` | `GET /`, `POST /`, `GET /:id`, `POST /:id/usar`, `PATCH /:id`, `DELETE /:id` |
| `clinical-notes.js` | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `documents.js` | `GET /`, `POST /`, `POST /:id/firmar`, `GET /:id/pdf`, `DELETE /:id` |
| `exercises.js` | `GET /catalog`, `POST /recommend`, `POST /recommend/async`, `GET /recommend/jobs/:jobId`, `GET /:id/media`, `GET /recommendations/:patientId`, `POST /recommendations/:id/follow-up`, `POST /reports/pdf`, `POST /reports/archive`. En estado C ademas: `PATCH /recommendations/:id/draft`, `POST /recommendations/:id/review` |
| `invoices.js` | `GET /`, `POST /`, `GET /:id/pdf` |
| `patients.js` | `GET /`, `GET /:id`, `GET /:id/ficha`, `POST /`, `PATCH /:id`, `PUT /:id`, `DELETE /:id` |
| `payments.js` | `GET /`, `GET /resumen`, `GET /gestoria`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `professional.js` | `GET /intakes/pending`, `GET /appointments`, `GET /appointments/sync-calendar/status`, `GET|POST /public-booking/*` (config, slots, appointments), `POST /appointments`, `POST /appointments/sync-calendar`, `POST /appointments/check-availability`, `PATCH /appointments/:appointmentId`, `GET /program-templates`, `GET /program-library`, `POST /program-templates/clone`, `GET /patients/:patientId/history`, `POST /notes`, `GET|POST /video-jobs` y `POST /video-jobs/:jobId/{review,render,send}` (desactivados con `ENABLE_VIDEO_WORKFLOWS=false`) |
| `reminders.js` | `POST /` (cron), `GET /preview` |
| `telegram.js` | `POST /physio-report/send`, `POST /patient-report/send`, `GET|POST /link-code/:patientId`, `POST /incoming` |

En el estado C todos los endpoints salvo salud (3), reserva publica (3) y los protegidos por secreto compartido (cron, Telegram, internos) exigen `Bearer` valido y perfil profesional activo.

## 9. Anexo B — Comandos de verificacion usados

```powershell
# Estado de ramas y divergencia
git merge-base main origin/production-hardening
git branch -r --contains main
git --no-pager diff --stat main origin/production-hardening

# Lectura de ficheros de la rama sin checkout
git show origin/production-hardening:backend/src/middleware/security.js
git show origin/production-hardening:database/migrations/20260901_production_security_hardening.sql

# Inventario de endpoints
Select-String -Path backend/src/routes/*.js -Pattern 'router\.(get|post|put|patch|delete)\(' -AllMatches

# Validaciones (estado A)
cd backend; npx --no-install eslint src/
cd ..\frontend; npm run check; npx astro build
```

## 10. Conclusion

El proyecto no tiene un problema de concepto: el flujo "diagnostico -> propuesta IA -> validacion profesional -> informe -> seguimiento" esta bien pensado, la seguridad de la version `production-hardening` es solida y el CI ya es reproducible. El problema es de **gobierno del codigo**: la version desplegable no es la que esta en la rama productiva declarada, y las dos piezas que faltan para poder tratar datos de salud reales con tranquilidad son la **auditoria de accesos** y el **ciclo de vida del dato (retencion/supresion)**. Resolver R-1 a R-4 y ejecutar las pruebas de humo del readiness doc convierte este CRM en apto para produccion; el resto es deuda planificable.

## 11. Como retomar esta auditoria en una sesion nueva

### Que persiste al reiniciar
| Elemento | Ubicacion | Persiste | Nota |
|---|---|---|---|
| Este informe | `docs/AUDITORIA_CRM_IA_20260915.md` | Si | **Sin commitear** en `main`; sobrevive a reinicios y cambios de rama, pero no a `git clean -fd` ni a un clon nuevo |
| Refs de la rama auditada | `.git/refs/remotes/origin/production-hardening` | Si | Ya descargada (`f4c04d4`); no hace falta volver a clonar |
| Worktree temporal de validacion | `C:\temp\fisio-audit-ph`, `C:\Visual Code\fisio-audit-ph` | No | Eliminados al cerrar la auditoria (se recrean con un comando) |
| `node_modules` de frontend y backend del workspace | `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent\{frontend,backend}` | Si | Instalados durante la validacion; ignorados por git |
| Trabajo local divergente | `C:\Visual Code\PROYECTOS_IA\Fisio_IA_Agent` (13 routers + `middleware/auth.js`) | Si | Sigue sin commitear; no se toco |
| Hilo de conversacion | — | **No** | El historial del chat no se conserva: el contexto se reconstruye leyendo este informe |

### Primer mensaje recomendado en la sesion nueva

```text
Lee docs/AUDITORIA_CRM_IA_20260915.md y continua desde la seccion 7, Bloque 1:
mergear origin/production-hardening en main y aplicar la migracion
20260901_production_security_hardening.sql en staging.
```

### Reconstruir el entorno de validacion (5 minutos)

```powershell
cd 'C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent'
git fetch --all --prune
git worktree add --detach 'C:\Visual Code\fisio-audit-ph' origin/production-hardening

# Backend de la rama: lint + tests (validado: 0 errores, 11/11)
cd 'C:\Visual Code\fisio-audit-ph\backend'; npm ci; npm run lint; npm test

# Frontend de la rama: NO validable en esta maquina (politica de Control de
# Aplicaciones bloquea el binario nativo de Astro 7; ver R-11). Validar en CI.

# Cerrar el entorno temporal
cd 'C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent'
git worktree remove 'C:\Visual Code\fisio-audit-ph' --force; git worktree prune
```

### Para no perder el informe

```powershell
cd 'C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent'
git checkout -b docs/auditoria-20260915
git add docs/AUDITORIA_CRM_IA_20260915.md
git commit -m "docs: auditoria tecnica y clinica 2026-09-15 (seguridad, RGPD, IA y plan de accion)"
git push -u origin docs/auditoria-20260915
```

> Nota: se recomienda **no** commitearlo directamente en `main` mientras siga siendo la rama productiva declarada; usar una rama de documentacion y mergearla cuando se haga el merge del hardening.
