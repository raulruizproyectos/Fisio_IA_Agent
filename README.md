# Fisio_IA_Agent

CRM + agentes para centros de fisioterapia: gestion de pacientes, citas y recomendaciones de ejercicios desde Telegram y CRM web, orquestado con n8n y Supabase.

## Alcance activo (pivot)
- CRM web para operacion clinica y administrativa.
- Agente de citas: Telegram + n8n + Google Calendar + Supabase.
- Bot de pacientes: solicitudes de cita por texto libre, comando `/cita` y nota de voz transcrita.
- Agente IA de ejercicios: Telegram + CRM + n8n/OpenAI + Supabase + Storage.
- Source of truth unico: Supabase del proyecto `Fisio_IA_Agent`.

## En pausa
- Generacion de video: desactivada en backend y eliminada del frontend y de los workflows n8n activos.

## Checkpoint actual (2026-04-28)
- Estado local: nueva fase premium practica en curso, con cambios pendientes de commit y primer panel operativo de Finanzas implementado.
- Checkpoint operativo recomendado: `docs/checkpoint_20260427_premium_platform_handoff.md`
- Auditoria premium: `docs/premium_platform_audit_20260427.md`
- Estado real del producto en este punto:
  - ficha de paciente reforzada como centro operativo del caso,
  - `Historial` reposicionado como `Seguimiento del caso` para auditoria, Telegram y planes domiciliarios,
  - `Documentos` definido como vista global; documentos de caso concreto desde ficha,
  - navegacion cotidiana orientada a abrir ficha desde busqueda, agenda, pacientes, intakes y biblioteca,
  - sistema propio de toast/confirmacion implementado para sustituir `alert()`, `confirm()` y `prompt()` nativos en flujos operativos,
  - sidebar usa `Finanzas` como entrada semantica unica y resuelve internamente a la portada financiera actual,
  - Finanzas incorpora panel operativo con prioridad, resumen de caja y acciones directas para registrar cobro, emitir factura, crear bono o revisar gestoria.
- Validacion local:
  - `npm run check` en `frontend`: OK, 0 errores, 0 warnings, 0 hints tras el panel operativo de Finanzas.
  - `npm run build` en `frontend`: OK tras el panel operativo de Finanzas.
- Siguiente paso exacto:
  - smoke visual local en `http://127.0.0.1:4321`,
  - continuar Fase 1 premium limpiando estilos inline visibles y haciendo que Facturas/Bonos/Gestoria compartan la misma superficie de Finanzas.

## Checkpoint actual (2026-04-23)
- Commit exacto para retomar: `8f568cf`
- Estado de GitHub: `origin/main` sincronizado con la simplificacion operativa de plataforma y ficha de paciente.
- Estado real del producto en este punto:
  - el Copilot queda estabilizado por el checkpoint clinico anterior,
  - el dashboard se simplifica como cockpit diario,
  - se eliminan accesos duplicados del hero,
  - se recuperan metricas, flujos clave, agenda inmediata, mensajes, sync y reserva online que habian quedado ocultos,
  - el dock movil prioriza `Mensajes` sobre `Pagos`,
  - el sidebar consolida `Pagos`, `Facturacion`, `Bonos` y `Gestoria` en una unica entrada `Finanzas` con pestanas internas,
  - la ficha de paciente compacta el rail derecho en una tarjeta `Continuidad del caso`, evitando columnas cortadas y texto redundante.
- Siguiente paso exacto:
  - redeploy de `fisio-frontend`,
  - smoke test de `Inicio`, `Finanzas` y ficha de paciente en desktop y movil,
  - confirmar que `Generar plan guiado`, `Mensajes`, `Finanzas` y las pestanas financieras abren el modulo correcto,
  - continuar con la revision de `Historial` vs ficha de paciente y `Biblioteca` vs `Documentos`.
- Validacion local:
  - `npm run check` en `frontend`: OK, solo avisos antiguos no bloqueantes (`mobileDock`, `total`),
  - `npm run build` en `frontend`: OK,
  - checks repetidos tras la consolidacion de finanzas y la ficha compacta: OK.
- Checkpoint operativo recomendado: `docs/checkpoint_20260423_session_closeout.md`
- Checkpoint de simplificacion de plataforma: `docs/checkpoint_20260422_platform_simplification.md`
- Checkpoint operativo anterior del Copilot: `docs/checkpoint_20260422_copilot_clinical_reset.md`

## Checkpoint anterior (2026-04-16)
- Base funcional exacta antes del cierre documental: `34ea207`
- Estado de GitHub: `origin/main` sincronizado con el tramo de pulido producto-pro y varias iteraciones del Copilot.
- Estado real del producto en este punto:
  - el CRM general queda bastante mas ordenado y vendible que al inicio del tramo,
  - el Copilot mejora respecto al estado roto inicial, pero aun no alcanza nivel premium final,
  - el principal problema restante ya no es funcional sino de UX/estructura visual del rail del agente IA.
- Siguiente paso exacto:
  - retomar exclusivamente el Copilot,
  - simplificar estructura del rail,
  - dejar un solo scroll en el chat,
  - mover el contexto clinico a una capa secundaria plegable,
  - rehacer el layout del agente como producto premium real.
- Checkpoint operativo recomendado: `docs/checkpoint_20260416_copilot_premium_handoff.md`

## Checkpoint actual (2026-04-07)
- Commit exacto para retomar: `f67d339`
- Estado de GitHub: `origin/main` sincronizado con los fixes de Telegram, Calendar y limpieza CRM de esta sesion.
- Estado real del producto en este punto:
  - Telegram ya crea, cambia y cancela citas sobre el backend sin caer al flujo de alta nueva.
  - el backend limpia `motivo` antes de devolver citas al CRM, para no mostrar `Appointment ID` ni descripciones tecnicas en dashboard.
  - la reserva online publica queda aplazada como superficie final hasta la futura web publica del centro, pero seguira conectando contra este CRM.
- Siguiente paso exacto:
  - redeploy del backend.
  - refrescar CRM y verificar que la tarjeta de proxima sesion muestra solo nombre, fecha/hora y motivo limpio.
  - despues continuar la mejora de agenda CRM, priorizando bloqueos reales de Google Calendar en la parrilla semanal.
- Checkpoint operativo recomendado: `docs/checkpoint_20260407_session115_crm_appointments_cleanup.md`
## Checkpoint actual (2026-03-26)
- Estado de GitHub: `origin/main` sincronizado con el cierre de robustez y continuidad documental de esta sesion.
- Estado real del producto en este punto:
  - backend endurecido para `bonos`, `facturas`, `pagos`, `notas-clinicas` y `pacientes/:id/ficha` cuando faltan tablas CRM en Supabase.
  - nuevo endpoint `GET /api/health/readiness` para detectar migraciones pendientes antes de romper en produccion.
  - frontend alineado con degradacion segura: avisos visibles, acciones bloqueadas y ficha del paciente en modo parcial cuando faltan modulos.
  - validacion local cerrada fuera de `G:` usando `scripts/frontend-local-build.ps1` y `scripts/backend-local-validate.ps1`.
- Riesgo operativo que sigue vivo:
  - faltan migraciones por aplicar en produccion, empezando por `database/migrations/011_crm_bonos.sql`.
  - si readiness marca pendientes `007`, `008`, `009` o `schema_vnext`, la UI seguira estable pero algunos modulos quedaran como no disponibles.
- Siguiente paso exacto:
  - desplegar backend actualizado.
  - ejecutar migraciones pendientes reales en Supabase.
  - verificar en produccion `GET /api/health/readiness`, `GET /api/bonos`, `GET /api/facturas`, `GET /api/pagos` y `GET /api/pacientes/:id/ficha`.
- Checkpoint operativo recomendado: `docs/checkpoint_20260326_full_validation_cleanup.md`
## Checkpoint actual (Sesion 108 - 2026-03-19)
- Commit exacto para retomar: pendiente de commit local (repo con mejoras de agenda y docs)
- Estado de GitHub: este tramo sigue local; W5 remoto ya esta actualizado en n8n
- Estado real del producto en este tramo:
  - frontend validado fuera de `G:` con `scripts/frontend-local-build.ps1` y `npm run check` OK en `C:\Temp\Fisio_IA_Agent_frontend_local`
  - W5 Calendar Reader remoto ya devuelve `busy_events` ademas de `events`
  - backend local distingue citas gestionadas vs bloques ocupados de Google Calendar
  - nuevo endpoint local `POST /api/profesional/appointments/check-availability` para dry-run seguro
- Siguiente paso exacto de la proxima sesion:
  - publicar/redeploy del backend con el nuevo bloqueo por Google Calendar
  - validar `409` real con `POST /api/profesional/appointments/check-availability`
  - llevar el estado de bloqueo/no disponibilidad a la UI de agenda si queremos hacerlo visible
- Checkpoint operativo actual: documentado en `CHANGELOG.md` + `configuracion_pendiente.md`

## Checkpoint actual (Sesion 107 - 2026-03-19)
- Commit exacto para retomar: pendiente de commit local (working tree con cambios en agenda)
- Estado de GitHub: sin publicar aun este tramo local
- Estado real del producto en este tramo:
  - el backend de agenda devuelve metadata de reconciliacion por cita: `crm_only`, `linked`, `backfilled`, `calendar_only`
  - la UI de agenda muestra columna `Espejo` para verificar Calendar <-> CRM y facts del sincronizador (fuente, ultimo ciclo, proximo ciclo, ultimo error)
  - backend validado: `node --check backend/src/routes/professional.js` OK
  - validacion frontend bloqueada en este host: falta `frontend/node_modules/.bin/astro` y `npm install` queda colgado por timeout
- Siguiente paso exacto de la proxima sesion:
  - reparar dependencias del frontend en copia local aislada o ruta no sincronizada
  - ejecutar `npm run check` y `npm run build` del frontend
  - validar en UI casos reales `Solo Calendar`, `Backfill` y `CRM + Calendar`
  - seguir con bloqueos / no disponibilidad desde Google Calendar
- Checkpoint operativo actual: documentado en `CHANGELOG.md` + `configuracion_pendiente.md`

## Checkpoint actual (Sesion 106 - 2026-03-19)
- Commit exacto para retomar: `7a86b7f`
- Estado de GitHub: `origin/main` sincronizado con este checkpoint.
- Estado real del producto a cierre de sesion:
  - Calendar sync DESBLOQUEADO: `enabled: true, mode: "w5"` verificado en produccion
  - el backend usa W5 (n8n OAuth2) como fuente de Calendar, sin necesitar Service Account
  - la agenda del CRM muestra observabilidad del sincronizador W6
  - sync manual verificado E2E: `source: w5_reader`, `appointments_considered: 4`
  - `GOOGLE_CALENDAR_ID=raul.ruiz.diaz.bcn@gmail.com` publicada en EasyPanel
  - redeploy de `fisio-backend` exitoso
- Siguiente paso exacto de la proxima sesion:
  - verificar reconciliacion real de citas Calendar <-> CRM en la UI del frontend
  - implementar bloqueos / no disponibilidad desde Google Calendar
  - envio real por Telegram desde el copilot
  - observabilidad ampliada de agenda (ultimo sync, proximo ciclo, errores recientes)
- Checkpoint operativo actual: `docs/checkpoint_20260319_calendar_sync_unblocked.md`

## Checkpoint actual (Sesion 92 - 2026-03-11)
- La arquitectura vigente queda fijada como hibrida:
  - backend autoritativo para contratos, seguridad, persistencia, jobs, PDF y entrega,
  - `n8n` para orquestacion conversacional y clinica,
  - frontend como superficie de producto.
- El PDF profesional sigue unificado en backend y sirve tanto al CRM como al Telegram profesional.
- El core n8n ya resuelve `triage_needed` para sintomas demasiado vagos y el smoke test remoto Telegram queda en `6/6 OK`.
- `crm_perfiles` ya permite resolver el chat del bot fisio en produccion y `POST /api/telegram/physio-report/send` queda validado con `target_source=crm_perfiles`.
- El CRM ya expone la invitacion Telegram del paciente desde historial con `GET /api/telegram/link-code/:patientId`.
- El Copilot lateral se rehace tomando como referencia `frontend/stitch.zip`: composicion mas limpia, acciones abajo y tono visual blanco/slate/teal.
- El bot de pacientes queda conceptualmente separado del bot profesional: `@FisioIA_Agent_bot` es solo del fisioterapeuta y el bot de agenda de pacientes sera nuevo.
- El workflow canonico de agenda pasa a `n8n/Fisio_IA_Agent/vnext/w1-appointment-agent.json`, con disponibilidad Calendar + alta backend + cleanup compensatorio.
- La API publica de n8n no permite ubicar por token el workflow nuevo dentro de la carpeta `Fisio_IA_Agent`; para publicarlo ahi hace falta placeholder o movimiento manual en UI.
- El bot de pacientes ya crea citas reales en crm_citas desde Telegram por texto y por voice_transcript.
- Bloqueos reales ya confirmados en produccion:
  - falta OPENAI_API_KEY en fisio-backend para cerrar la rama nativa de nota de voz,
  - Google Calendar sigue desactivado en runtime backend (calendar_sync.enabled=false).
- El repo ya corrige la reutilizacion del paciente CRM cuando el flujo parte de un paciente legacy vinculado por Telegram.
- Pendiente inmediato: publicar credenciales reales de voz y Google Calendar en fisio-backend y repetir E2E con nota de voz real.

## Arquitectura actual
- Frontend CRM: Astro
- Backend API: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Storage: Supabase Storage bucket `ejercicios` (private)
- AutomatizaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: n8n
- IA de selecciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: OpenAI vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a n8n
- Agenda: Google Calendar (n8n + fallback backend opcional)
- Canales conversacionales: CRM web + Telegram

## Principio operativo recomendado
- El backend es la frontera autoritativa del producto: valida entradas, protege contratos, persiste, coordina jobs y entrega el PDF profesional.
- `n8n` orquesta la logica conversacional, la automatizacion y el razonamiento clinico.
- El `frontend` no toma decisiones clinicas ni expone detalles internos de implementacion.
- Este reparto evita duplicar logica, facilita despliegue en VPS/EasyPanel y mantiene el sistema independiente del ordenador local.

## Estado actual verificado
- Frontend:
  - `astro build` OK en copia local aislada
  - `astro check` OK en copia local aislada
  - saneado de texto/encoding aplicado en `index.astro` y `Layout.astro`
- Backend:
  - `node --check` OK en rutas principales
  - `npm run lint` OK en copia local aislada con dependencias completas
- ProducciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n:
  - `POST /api/exercises/recommend` y `/async` validados con imÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡genes
  - `POST /api/agent/message` validado en CRM
  - `POST /api/telegram/incoming?dry_run=true` validado con 6 casos reales de routing
  - entrega real del triage Telegram validada en chat vinculado
  - GET /api/telegram/link-code/:patientId validado en backend publico
  - alta real de citas Telegram validada en crm_citas
  - voz nativa pendiente de OPENAI_API_KEY
  - sync a Google Calendar ACTIVO via W5/n8n OAuth2 (`enabled: true, mode: "w5"`)

## Endpoints backend principales
- `POST /api/telegram/incoming`
- `POST /api/telegram/link-code/:patientId`
- `POST /api/agent/message`
- `POST /api/exercises/recommend`
- `POST /api/exercises/recommend/async`
- `GET /api/exercises/recommend/jobs/:jobId`
- `GET /api/profesional/intakes/pending`
- `GET /api/profesional/appointments`
- `POST /api/profesional/appointments`
- `PATCH /api/profesional/appointments/:appointmentId`
- `GET /api/profesional/program-templates`
- `POST /api/profesional/program-templates/clone`
- `GET /api/profesional/patients/:patientId/history`
- `POST /api/profesional/notes`
- `GET /api/profesional/appointments/sync-calendar/status`
- `POST /api/profesional/appointments/sync-calendar`

## W2 asÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ncrono (polling CRM)
- El CRM puede lanzar el informe de ejercicios en segundo plano con `POST /api/exercises/recommend/async`.
- El estado se consulta con `GET /api/exercises/recommend/jobs/:jobId`.
- Si existe la tabla `crm_async_jobs`, el polling sobrevive a reinicios y despliegues del backend.
- Si la migraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºn no estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ aplicada, el backend cae temporalmente a memoria sin romper el flujo.

## Observabilidad W2 (timeouts y reintentos)
- `POST /api/exercises/recommend` devuelve `engine_observability` con:
  - `attempts`, `retries_used`, `fallback_used`, `fallback_reason`, `total_duration_ms`
  - `catalog_total`, `candidate_count`, `candidate_limit` para medir cuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡nto contexto se envÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a al motor
- Variables de entorno backend:
  - `EXERCISE_ENGINE_TIMEOUT_MS` (default `30000`)
  - `EXERCISE_ENGINE_MAX_ATTEMPTS` (default `2`)
  - `EXERCISE_ENGINE_CANDIDATE_LIMIT` (default `24`)
  - `EXERCISE_REQUIRE_PATIENT_ASSOCIATION` (default `true`)
- El frontend CRM muestra la mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©trica operativa `Timeouts/Reintentos IA` sin doble conteo cuando el backend devuelve `engine_observability`.

## Informe PDF (CRM y Telegram)
- En CRM (`Agente clinico n8n`):
  - genera recomendaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n desde el rail derecho
  - permite descargar el informe estructurado en PDF
  - el KPI `Informes IA archivados` solo incrementa cuando `/api/exercises/reports/archive` responde OK
- En Telegram fisio (`FisioIA_Agent_bot`):
  - comando: `/informe <paciente_id> | <sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ntomas>`
  - el backend genera la recomendaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n y envÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a el PDF en el chat

## Workflows n8n versionados en el repo
- ProducciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n actual: `n8n/Fisio_IA_Agent/production/`.
- CanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³nicos vNext: `n8n/Fisio_IA_Agent/vnext/`
  - `telegram-chat.json`
  - `telegram-fisio-reports.json`
  - `fisio-agent-core.json`
  - `w1-appointment-agent.json`
  - `w2-exercise-agent.json`
  - `w3-crm-trigger.json`
  - `sw-fisio-pending-intakes.json`

## MigraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de credenciales (test a definitivo)
El sistema estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ preparado para migrar cuentas sin tocar cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³digo: solo `.env` y credenciales n8n.

- Backend `.env`:
  - `TELEGRAM_PATIENT_BOT_TOKEN`
  - `TELEGRAM_PHYSIO_BOT_TOKEN`
  - `TELEGRAM_PATIENT_BOT_USERNAME`
  - `TELEGRAM_PHYSIO_BOT_USERNAME`
  - `TELEGRAM_EDGE_ROUTER_ENABLED`
  - `GOOGLE_CALENDAR_ID`
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
  - `GOOGLE_CALENDAR_TIMEZONE`
  - `GOOGLE_CALENDAR_REQUIRED`
- n8n:
  - workflow de pacientes con la credencial del bot de pacientes
  - workflow de fisio con la credencial del bot de informes
  - credencial Google Calendar del entorno definitivo

## Inicio rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡pido
```bash
# backend
cd backend
npm install
cp .env.example .env
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

## ValidaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n local segura del frontend
Si `npm install` del frontend se bloquea en la ruta sincronizada (`G:\Mi unidad\...`), usa el flujo seguro ya validado en una ruta local no sincronizada:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1
cd C:\Temp\Fisio_IA_Agent_frontend_local
npm run check
```

## Smoke test Telegram dry run
Para validar Telegram sin tocar chats reales ni crear datos productivos:

```powershell
node .\scripts\telegram-dry-run.mjs --baseUrl=https://fisio-backend.b5xbaf.easypanel.host
```

- Valida 7 casos: triage, ejercicio, cita libre, cita por voz transcrita, seguimiento, comando `/cita` y comando `/informe` del bot fisio.
- Espera `route` y `next_action` correctos sin crear pacientes, intakes, citas ni recomendaciones.
- Para ejecutar un caso concreto: `--only=exercise_free_text`.

## Smoke test rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡pido del flujo asÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ncrono W2
```powershell
node .\scripts\w2-smoke-async.mjs --baseUrl=http://localhost:3001 --patientId=<uuid> --professionalId=<uuid>
```

## Continuidad
- Estado detallado por sesion: `CHANGELOG.md`
- Checklist operativo para retomar: `configuracion_pendiente.md`
- Arquitectura objetivo: `ARCHITECTURE.md`
- Checkpoint operativo actual: `docs/checkpoint_20260326_full_validation_cleanup.md`
- Checkpoint operativo anterior: `docs/checkpoint_20260326_bonos_critical_fix.md`
- Checkpoint operativo base anterior: `docs/checkpoint_20260325_session_closeout.md`
- Analisis PROET: `docs/proet/platform_analysis_20260304.md`
- Norma n8n obligatoria: `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Playbook de importacion y smoke test n8n: `docs/n8n/PLAYBOOK_IMPORTACION_Y_SMOKE_TEST.md`
- Norma de robustez y errores: `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`







