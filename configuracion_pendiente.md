# Configuracion Pendiente - Fisio_IA_Agent

Estado actualizado para retomar sin perdida.

## Estado actual (2026-03-04, Sesion 51) - Build valido sin video, produccion aun legacy

### Completado esta sesion
- ✅ Normalizados archivos criticos a `UTF-8 sin BOM` para evitar roturas de parseo en scripts/JSON.
- ✅ Build frontend validado en entorno local no sincronizado (`scripts/frontend-local-build.ps1`).
- ✅ Verificado `dist/index.html` local:
  - no contiene seccion `Videos`.
  - no contiene textos `generar video`.
- ✅ Confirmado estado real de produccion:
  - `fisio-frontend` sigue sirviendo HTML legacy con modulo `Videos`.
  - `fisio-backend` sigue exponiendo contratos antiguos en endpoints clave.

### Pendiente inmediato para cerrar funcionamiento real
1. Publicar/redeploy backend y frontend en EasyPanel para alinear con el codigo local actual.
2. Revalidar E2E tras deploy:
   - dashboard sin modulo video,
   - chat CRM/Telegram devolviendo informe de ejercicios con imagenes.

## Estado actual (2026-03-04, Sesion 50) - Video eliminado y flujo centrado en informe de ejercicios

### Completado esta sesion
- ✅ Frontend sin módulo de video:
  - eliminadas sección/página de videos.
  - agente CRM orientado a informe clínico con procedimiento + imagen.
- ✅ Backend adaptado:
  - `agent.js` sin copy/intents de video.
  - `exercises.js` devuelve `informe_clinico` + campos de pauta (`series/repeticiones/duracion`) + `imagen_url`.
  - `telegram.js` genera respuesta desde `/api/exercises/recommend` (sin pipeline de video).
  - endpoints `video-jobs*` bloqueados por defecto (`410`) salvo `ENABLE_VIDEO_WORKFLOWS=true`.
- ✅ n8n limpio de video:
  - repo: eliminados `orquestador-intake-video` + `subflujo-crear-render-video` + `subflujo-revision-video`.
  - remoto: workflows de video borrados por API.
  - verificación remota: `0` workflows con “video” en nombre.
- ✅ Validación:
  - `node --check` backend OK.
  - JSON de workflows (`production` + `vnext`) OK.
- ✅ Base de datos nutrida desde PROET:
  - script nuevo `scripts/proet-sync-supabase.mjs`.
  - ejecución real completada: `72` dolencias insertadas y `179` ejercicios `PROET-*` upsertados en `crm_ejercicios_catalogo`.
  - imágenes PROET registradas en `metadata.proet_image_url` para consumo del agente.
- ✅ Robustez obligatoria formalizada:
  - `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`.
  - fallback operativo en `POST /api/exercises/recommend` cuando falla el motor IA externo.

### Pendiente inmediato para cerrar funcionamiento real
1. Validar build frontend en entorno con red estable (`npm install` en esta sesión expira por timeout).
2. Configurar secreto `OPENAI_API_KEY` en Supabase Edge Function `exercise-recommend`.
3. Redeploy backend/frontend y validar E2E que Telegram + chat CRM devuelven informe con imágenes usando el catálogo PROET nutrido.

## Estado actual (2026-03-04, Sesion 49) - W2/W3 activos con bloqueos de produccion detectados

### Completado esta sesion
- ✅ W2/W3 recreados en n8n con `POST` y activos.
- ✅ Ajustados workflows para evitar `$env` en expresiones (bloqueadas por la instancia n8n).
- ✅ Corregido body JSON de nodos HTTP en W2/W3 (error previo de parseo).

### Bloqueos confirmados
1. Frontend productivo sin redeploy:
   - sigue sirviendo build antiguo (aun aparece `<script lang="ts">` en HTML remoto).
2. Backend productivo sin redeploy:
   - `POST /api/exercises/recommend` devuelve `404`.
   - CORS sigue en `Access-Control-Allow-Origin: http://localhost:4321`.
3. Supabase Edge Function `exercise-recommend`:
   - error `OPENAI_API_KEY not configured`.

### Pendiente inmediato para cerrar funcionamiento real
1. Redeploy manual o por API de `fisio-frontend` y `fisio-backend` en EasyPanel.
2. Configurar secreto `OPENAI_API_KEY` en Supabase para la función `exercise-recommend`.
3. Mover en UI de n8n W2/W3 a carpeta/tag `Fisio_IA_Agent` y revalidar inventario.

## Estado actual (2026-03-04, Sesion 48) - Norma obligatoria n8n carpeta/tag

### Completado esta sesion
- ✅ Norma formal y obligatoria creada:
  - `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- ✅ Enlaces añadidos en documentación principal:
  - `README.md`
  - `n8n/README.md`
- ✅ Regla operativa fijada:
  - cualquier workflow creado/modificado debe quedar dentro de carpeta/tag `Fisio_IA_Agent` antes de cerrar sesión.

### Pendiente para proxima sesion
1. Mover manualmente en UI los workflows que aparezcan fuera de carpeta cuando falle API de tags.
2. Revalidar inventario visual en n8n tras cada alta/edicion de workflow.

## Estado actual (2026-03-04, Sesion 47) - UI modo oscuro aplicada

### Completado esta sesion
- ✅ Rediseño a modo oscuro en CRM frontend:
  - `frontend/src/layouts/Layout.astro`: variables globales dark theme.
  - `frontend/src/pages/index.astro`: sidebar, topbar, cards, tablas, inputs y selectores ajustados al nuevo esquema.
- ✅ Se mantiene compatibilidad responsive (desktop y movil) sin cambiar la estructura funcional.
- ✅ n8n remoto:
  - creados `Fisio_IA_Agent / W2 Exercise Agent` y `Fisio_IA_Agent / W3 CRM Trigger` (inactivos).
  - eliminados duplicados temporales de W3 de pruebas API.

### Pendiente para proxima sesion
1. Redeploy de `fisio-frontend` para publicar el tema oscuro en produccion.
2. Validacion visual final en navegador (contraste, legibilidad, hover/focus states).

## Estado actual (2026-03-04, Sesion 46) - Fix frontend prod + CORS + W2/W3

### Completado esta sesion
- ✅ Diagnostico de produccion:
  - frontend entregaba TypeScript sin transpilar en HTML (`<script lang="ts">` con tipos `as HTML...`).
  - backend devolvia CORS restringido a `http://localhost:4321`.
- ✅ Correcciones aplicadas:
  - `frontend/src/pages/index.astro`: `<script>` procesable por Astro.
  - `backend/src/index.js`: CORS con allowlist robusta (localhost + dominio frontend prod + env `FRONTEND_URLS/FRONTEND_URL`).
- ✅ vNext n8n completado en repo con nuevos workflows:
  - `n8n/Fisio_IA_Agent/vnext/w2-exercise-agent.json`
  - `n8n/Fisio_IA_Agent/vnext/w3-crm-trigger.json`
- ✅ Documentacion sincronizada:
  - `README.md`
  - `n8n/README.md`
  - `CHANGELOG.md`
  - este archivo

### Pendiente para proxima sesion
1. Redeploy de `fisio-frontend` y `fisio-backend` en EasyPanel para publicar fixes de script y CORS.
2. Importar/activar en n8n remoto los workflows vNext W2/W3.
3. Ejecutar test E2E real desde CRM (boton ejercicios) y Telegram.

## Estado actual (2026-03-04, Sesion 45) - Orden n8n por entorno (production/vnext)

### Completado esta sesion
- ✅ Sincronizacion remota de workflows activos n8n a repo:
  - `n8n/Fisio_IA_Agent/production/` con los `6` flujos activos actuales.
- ✅ Reordenacion de flujos canonicos en desarrollo:
  - `n8n/Fisio_IA_Agent/vnext/` con `telegram-chat`, `fisio-agent-core`, `w1-appointment-agent`, `sw-fisio-pending-intakes`.
- ✅ Verificacion tecnica:
  - `telegram-chat.json` en `vnext` mantiene `Telegram Trigger` nativo.
  - CI ajustada para validar JSON recursivo en `n8n/Fisio_IA_Agent/**`.
- ✅ Documentacion sincronizada:
  - `CHANGELOG.md`
  - `n8n/README.md`
  - `docs/n8n/workflow_audit_20260304.md`
  - `docs/data/n8n/workflows_summary_20260304.json`

### Pendiente para proxima sesion
1. Migrar gradualmente de `production/` (video legacy) a `vnext/` (W0/W1/W2/W3) en n8n remoto.
2. Resolver error servidor n8n en `POST/PUT /api/v1/workflows*` para habilitar despliegue por API.
3. Ejecutar E2E Telegram con trigger nativo + backend y validar logs de trazabilidad (`request_id`, `channel`, `status`).

## Estado actual (2026-03-04, Sesion 44) - Plantillas + clonado implementado

### Completado esta sesion
- ✅ Backend:
  - `GET /api/profesional/program-templates` (agregacion de plantillas desde `planes/items_plan`)
  - `POST /api/profesional/program-templates/clone` (clonado real de plan + items al paciente destino)
- ✅ Frontend:
  - nueva sección SPA `Plantillas`
  - selector de paciente destino
  - acción `Clonar` conectada a backend
  - estilos responsive para controles de plantillas
- ✅ Documentacion:
  - `README.md` con endpoints nuevos
  - `CHANGELOG.md` y este archivo actualizados

### Estado de validacion
- `node --check backend/src/routes/professional.js` OK
- `npm run build` frontend pendiente en este entorno:
  - error local: `astro` no disponible en PATH/dependencias

### Pendiente para proxima sesion
1. Ejecutar build frontend en entorno con dependencias instaladas y validar UI de Plantillas.
2. Redeploy backend en EasyPanel para publicar cambios (incluye W1 appointments y nuevas rutas de plantillas).
3. Validar E2E de clonado: plantilla -> paciente destino -> visibilidad en historial/plan.

## Estado actual (2026-03-04, Sesion 43) - Analisis completo PROET (frontend + backend)

### Completado esta sesion
- ✅ Analisis de secciones del frontend profesional (sidebar):
  - Inici
  - Crear programa
  - Meus programes
  - Plantilles
  - Meus exercicis
  - Pacients
  - Contacte
  - Meu calendari
  - Meu perfil
- ✅ Inventario API backend PROET por escaneo de bundles:
  - `148` endpoints unicos detectados.
  - mayor volumen en: `programs (29)`, `exercises (23)`, `authentication (11)`, `users (11)`, `clients (10)`.
- ✅ Documentacion de analisis versionada:
  - `docs/proet/platform_analysis_20260304.md`
  - `docs/proet/sections_endpoints_20260304.json`
  - `docs/proet/api_groups_20260304.json`

### Oportunidades priorizadas para Fisio_IA_Agent (derivadas de PROET)
1. **Plantillas + clonacion** de programas terapeuticos con metrica de uso.
2. **Onboarding pacientes** por invitacion y trazabilidad de estado.
3. **Calendario terapeutico** con estados de cumplimiento.
4. **Prescripcion exportable** (PDF y envio por canal).
5. **Taxonomia avanzada de ejercicios** (zona/material/objetivo/tipo) para mejorar W2.

### Pendiente para proxima sesion
1. Implementar en Fisio_IA_Agent el bloque de mayor ROI: `Plantillas + clonacion`.
2. Diseñar el flujo `Invitacion paciente` en CRM (UI + backend + eventos).
3. Mantener pendiente infra: redeploy backend EasyPanel para publicar rutas W1 (`/api/profesional/appointments` en prod sigue `404`).

## Estado actual (2026-03-04, Sesion 42) - Ingesta PROET para W2

### Completado esta sesion
- ✅ Nuevo script `scripts/proet-export.mjs` para extraer catalogo desde PROET.
  - Endpoints usados: auth + programas usuario + detalle programas + ejercicios por programa + templates mas usados.
  - Salida normalizada: perfil origen, templates, programas y ejercicios unicos.
- ✅ Snapshot real generado y versionado:
  - `docs/data/proet_snapshot_20260304.json`
  - Volumen actual:
    - `20` programas de usuario
    - `59` templates top
    - `309` registros programa-ejercicio
    - `179` ejercicios unicos
- ✅ `README.md` actualizado con comando de exportacion:
  - `node scripts/proet-export.mjs --email=<tu_email> --locale=val`

### Estado de produccion verificado
- Backend health: `200` (`/api/health`)
- Backend citas W1 en produccion: `404` (`/api/profesional/appointments`)

### Pendiente para proxima sesion
1. **EasyPanel backend**: redeploy forzado de `fisio-backend` para publicar rutas W1 de citas.
2. **W2 catalogo real**: conectar snapshot PROET con carga a `crm_ejercicios_catalogo` y `crm_ejercicio_media`.
3. **E2E**: repetir prueba Telegram + CRM tras redeploy backend y confirmar flujo cita/recomendacion.

## Estado actual (2026-03-04, Sesion 41) - W1 Telegram en progreso

### Completado esta sesion
- ✅ `backend/src/routes/telegram.js`: W1 de citas ya no queda en mensaje placeholder.
  - Si W0 clasifica `appointment` con confianza >= 0.6, backend dispara `N8N_APPOINTMENT_WEBHOOK_URL`.
  - Se envía payload con `request_id`, `patient_id`, `professional_id`, `chat_id`, `message_text`, `timestamp`.
  - Se mantiene fallback seguro para paciente si n8n no responde.
- ✅ Trazabilidad W1: log técnico en `crm_comunicaciones` (si tabla disponible).
- ✅ `backend/src/routes/exercises.js`: fix de runtime (`crypto` import).
- ✅ `.github/workflows/ci.yml`: añadida validación sintáctica para `src/routes/exercises.js`.
- ✅ `.github/workflows/ci.yml`: añadido job `n8n_json_validate` para validar workflows JSON de `n8n/Fisio_IA_Agent/`.
  - incluye limpieza de BOM UTF-8 para evitar fallos de parseo en archivos heredados.
- ✅ `.env.example`: añadida variable `N8N_APPOINTMENT_WEBHOOK_URL`.
  - con ejemplo local preconfigurado: `http://localhost:5678/webhook/fisio/w1/appointment`.
- ✅ `backend/src/routes/professional.js`: API de citas W1 implementada.
  - `GET /api/profesional/appointments`
  - `POST /api/profesional/appointments`
  - `PATCH /api/profesional/appointments/:appointmentId`
  - con validaciones de estado/canal/fechas, control de conflictos y mapeo de IDs legacy -> CRM.
- ✅ `n8n/Fisio_IA_Agent/w1-appointment-agent.json`: workflow W1 versionado para intake de citas desde Telegram.
- ✅ `backend/src/routes/telegram.js`: comando `/cita <inicio_iso> <fin_iso> [nota]` añadido para solicitud directa de cita.
- ✅ `frontend/src/pages/index.astro`: nueva sección SPA `Citas` conectada a API W1 (`GET/PATCH /api/profesional/appointments`).
- ✅ Docs actualizadas (`README.md`, `n8n/README.md`, `n8n/telegram-bot.md`) con rutas/workflow W1 y comando `/cita`.

### Pendiente para próxima sesión
1. **Config producción**: definir `N8N_APPOINTMENT_WEBHOOK_URL` en EasyPanel/backend.
2. **W1 n8n**: conectar credenciales Google Calendar y completar confirmación automática.
3. **E2E**: test Telegram de intención cita y validación en `crm_comunicaciones`.

## Estado actual (2026-03-04, Sesion 39) - PIVOTE CRM + AGENTES IA

### Completado esta sesion
- ✅ 12 tablas CRM creadas en Supabase (27 total) con RLS + triggers + policies service_role
- ✅ 16 ejercicios migrados a `crm_ejercicios_catalogo` con metadata
- ✅ Bucket privado `ejercicios` en Storage (10MB, JPEG/PNG/GIF/WebP/MP4)
- ✅ W2: `exercises.js` (4 endpoints) + Edge Function `exercise-recommend` (gpt-4o-mini)
- ✅ W0: Edge Function `intent-router` + integracion Telegram auto-routing
- ✅ W3: Boton CRM 🏋️ en frontend → `/api/exercises/recommend`
- ✅ `OPENAI_API_KEY` almacenada en Supabase Vault + función `vault_read_secret`
- ✅ Fix security advisory: search_path en `crm_set_updated_at`

### Pendiente para proxima sesion
1. **W1**: Citas + Google Calendar (requiere OAuth config manual)
2. **E2E**: Prueba completa multicanal Telegram + CRM + Supabase
3. **Deploy backend**: Push codigo actualizado a EasyPanel (nuevas rutas: exercises.js, telegram.js W0)
4. **Deploy frontend**: Push index.astro con boton ejercicios (W3)
5. **Seguridad**: Rotar `OPENAI_API_KEY` (expuesta en chat) → actualizar Vault
6. **RLS policies**: Granulares para auth de usuarios (actual: solo service_role)

### URLs produccion
- Backend: `https://fisio-backend.b5xbaf.easypanel.host/api/health`
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Supabase: `https://uewhbaejcouenoufuwlq.supabase.co`
- Edge Functions:
  - `intent-router` v2 (ACTIVE)
  - `exercise-recommend` v2 (ACTIVE)

## Estado actual (2026-03-03, Sesion 33)
- Frontend redisenado con look&feel mas profesional/moderno (tipografia, paleta, jerarquia visual, microinteracciones).
- Inspiracion funcional tomada de referencia publica `fisiomap-ia`:
  - prevencion
  - continuidad asistencial
  - interoperabilidad
  - gobernanza de datos
- Prompt de Agente IA de Ejercicios ajustado con triage de 4 preguntas para Telegram.
- Nota tecnica local:
  - `npm run build` falla por `astro` no disponible en PATH del host local actual.
  - Requiere revisar entorno de build/dependencias antes de validar compilacion local.

## Estado actual (2026-03-04, Sesion 34)
- Hardening aplicado para despliegue frontend:
  - `index.astro` usa `<script lang="ts">` (coherencia con tipado usado en el script cliente).
  - `package.json` frontend: `build` pasa a `astro build` y `astro check` queda como script separado.
- Se lanzan redeploys por endpoint API de EasyPanel para recuperar `fisio-frontend`.

## Estado actual (2026-03-04, Sesion 35)
- Validacion local fuerte del frontend completada:
  - `scripts/frontend-local-build.ps1` -> build correcto en copia limpia (`astro build` OK).
- Infraestructura remota:
  - `fisio-backend` sigue en `200`.
  - `fisio-frontend` sigue en `502` despues de redeploys por API.
- Diagnostico:
  - El bloqueo actual es de servicio EasyPanel (runtime/config/task), no de compilacion frontend.
- Necesidad para cierre definitivo:
  - acceso a logs/error de servicio en EasyPanel (UI o API autenticada) para aplicar fix exacto y dejar `200`.

## Estado actual (2026-03-04, Sesion 36)
- API token de EasyPanel validado y operativo para TRPC.
- `inspectProject` confirma:
  - backend OK
  - frontend en despliegue correcto pero sin tarea viva (`actual=0`, `desired=1`).
- Mitigacion aplicada en codigo:
  - eliminado `HEALTHCHECK` del contenedor frontend para evitar posibles reinicios por chequeo runtime.

## Estado actual (2026-03-04, Sesion 37) - CIERRE OPERATIVO OK
- Frontend recuperado y estable en EasyPanel:
  - `https://fisio-frontend.b5xbaf.easypanel.host/health` -> 200
  - `https://fisio-frontend.b5xbaf.easypanel.host/` -> 200
- Backend sigue correcto:
  - `https://fisio-backend.b5xbaf.easypanel.host/api/health` -> 200
- Monitor infraestructura:
  - `fisio-ia-agent_fisio-frontend` -> `actual=1`, `desired=1`
- Causa probable confirmada por mitigacion efectiva:
  - inestabilidad runtime asociada al `HEALTHCHECK` previo del contenedor frontend.

## Estado actual (2026-03-03, Sesion 25)
- Migracion SQL productiva aplicada y validada en Supabase.
- Workflows Fisio activos y alineados en n8n.
- Backend productivo desplegado en EasyPanel:
  - Servicio: `fisio-backend` (proyecto `n8n`)
  - URL: `https://fisio-backend.b5xbaf.easypanel.host`
  - Health: `GET /api/health` -> 200
- Backend productivo ampliado con rutas:
  - `/api/profesional/*`
  - `/api/telegram/*`
  - `/api/agent/message`
- Validaciones realizadas:
  - Telegram incoming (custom payload) -> OK + ingesta creada
  - Agent message -> OK (`source: n8n_agent`)
  - Ciclo video crear/review -> OK, estado final `enviado`
- Validacion adicional (2026-03-02):
  - `POST /api/agent/message` en produccion devuelve `data` vacio cuando n8n responde body vacio.
  - Se implemento fallback en backend (`fallback_used`) para no devolver respuesta funcional vacia al cliente.
  - Se detecto tambien error `fetch failed` cuando el webhook n8n no responde.
  - Se amplio fallback con control de disponibilidad n8n: `n8n_unreachable` + `fallback_reason`.
  - Cobertura adicional: si n8n responde `4xx/5xx`, backend tambien devuelve fallback con `fallback_reason = n8n_http_error` y `n8n_status`.
  - Correccion de plataforma aplicada:
    - `fisio-backend` migrado a fuente Git (`main`, `/backend`) en EasyPanel.
    - Build actualizado a `nixpacks`.
    - Redeploy forzado ejecutado por API.
  - Integracion agente validada en produccion:
    - `/api/agent/message` devuelve respuesta funcional con `fallback_used = false`.

## Workflows Fisio (estado)
- `Fisio_IA_Agent / Nucleo Agente` -> ACTIVO (`ZOarR2hpUUOgm3KC`)
- `Fisio_IA_Agent / Orquestador Intake-Video` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Pendientes` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Crear y Render Video` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Revision Video` -> ACTIVO
- `Fisio_IA_Agent / Puente Error Backend` -> ACTIVO

## Supabase (estado)
Tablas necesarias confirmadas:
- `profesionales`
- `pacientes`
- `dolencias`
- `ejercicios`
- `planes`
- `items_plan`
- `sesiones`
- `vinculos_telegram_pacientes`
- `mensajes_ingesta_paciente`
- `notas_seguimiento_paciente`
- `trabajos_video_ejercicio`
- `eventos_visualizacion_video`

## Pendiente inmediato (actual)
1. Ejecutar E2E Telegram completo con comandos reales:
- `/start CODIGO`
- `/plan`
- `/dolor <0-10> [nota]`
2. Rotar credenciales usadas/compartidas en sesiones tecnicas:
- API key n8n
- token EasyPanel
- secretos sensibles de entorno

## Riesgos abiertos
- Riesgo operativo reducido: backend y Nucleo Agente ya estan alineados en produccion.
- Si no se rotan credenciales, hay riesgo de seguridad.

## Como retomar rapido
1. Verificar backend `fisio-backend` en EasyPanel y health (`/api/health`).
2. Probar agente web y confirmar `data.reply_text` no vacio.
3. Revisar flags de diagnostico:
- `fallback_used`
- `n8n_unreachable`
- `fallback_reason`
4. Confirmar estado esperado:
- `fallback_used = false`
- `n8n_unreachable = false`
5. Ejecutar prueba real Telegram y revisar escritura en `mensajes_ingesta_paciente`.
6. Mantener prueba de regresion de video (`crear` + `review`).

## Repositorio GitHub (2026-02-27)
- URL: `https://github.com/raulruizproyectos/Fisio_IA_Agent`
- Rama principal: `main`
- CI base: configurada en `.github/workflows/ci.yml`
- Plantillas y gobernanza: ISSUE/PR templates, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`

## Punto de Situación (Checkpoint - Fin Sesión 40)

### ✅ Lo que ya está funcionando / Terminado
1. **Frontend Responsive**: Interfaz adaptada a móvil/tablet/desktop con sidebar colapsable, métricas en grid fluido y diseño mobile-first.
2. **Seguridad (RLS)**: Bases de datos protegidas. Las 27 tablas en Supabase tienen políticas RLS granulares habilitadas. Service Role backend intacto. Advisor de seguridad en 0 alertas.
3. **Backend APIs y Subflujos n8n**: Backend en EasyPanel (`fisio-backend`) respondiendo a n8n. Flujo de video E2E probado vía API interna.
4. **Reglas de Agente**: Añadidas reglas estrictas sobre el Frontend Responsive obligatorio y la Reutilización de Workflows en n8n.

### ⏳ Lo que falta hacer (Siguiente sesión)

#### Bloque 1: Despliegues y Validaciones Inmediatas
- [ ] **[MANUAL] Redeploy en EasyPanel**: Entrar al panel y hacer deploy de `fisio-frontend` y `fisio-backend` para que los cambios responsive y de código subido a GitHub se reflejen en la URL pública.
- [ ] **Test E2E Completo Multicanal**: Probar flujo desde mensaje de Telegram -> webhook backend -> n8n -> Supabase -> Respuesta en CRM Frontend.

#### Bloque 2: Nuevas Funcionalidades (Roadmap original)
- [ ] **W1: Citas y Calendario (Google Calendar)**: Configuración manual OAuth requerida para conectar el agente con la creación de citas reales.
- [ ] **W3: Botón Trigger CRM**: Añadir en el frontend el botón para disparar recomendaciones de ejercicios manualmente desde la interfaz web.

#### Bloque 3: Auditoría Final y Seguridad
- [ ] Rotar `OPENAI_API_KEY` (actualmente en código/clear text en algunos puntos históricos).
- [ ] Pruebas exhaustivas de concurrencia.

## Nota de terminologia
- Se reemplazo la expresion `expresion anterior (deprecated)` por `centraliza la introduccion de sintomas` en la descripcion principal del proyecto.


## Cierre de verificacion global (2026-02-27)
- GitHub sincronizado y operativo: `main` al dia.
- n8n/EasyPanel/backend verificados y en estado funcional.
- Webhook Telegram en produccion confirmado.
- Nota tecnica: build frontend pendiente de validar en entorno con `astro` disponible.

## Arranque recomendado para la proxima sesion
1. Ejecutar E2E Telegram de extremo a extremo y revisar resultado clinico en ingestas.
2. Ajustar contenido de respuesta del agente n8n en `/api/agent/message`.
3. Activar branch protection en GitHub.
4. Rotar credenciales sensibles.
5. Iniciar rediseno frontend con `Google Stitch` y trasladar propuesta a Astro.

## Bloqueo local detectado (frontend)
- `npm install` en `frontend/` queda colgado en este host y rompe instalacion de `astro` (`invalid`).
- El resto de plataformas productivas (n8n, EasyPanel, backend, Telegram, GitHub) queda operativo.

### Paso 1 al retomar
- Liberar proceso npm colgado (o reiniciar equipo) y repetir instalacion limpia de frontend.

## Actualizacion de cierre (2026-03-02)
- Se reintento la recuperacion local de frontend y el bloqueo persiste:
  - `npm ping` OK
  - procesos `npm install` colgados detectados y finalizados
  - nuevas instalaciones vuelven a colgarse en este host
- Decision UX/UI ya registrada:
  - usar `Google Stitch` para ideacion/prototipo frontend
- Decision adicional para video IA:
  - plataforma candidata `Google Labs Flow` (usuario Pro Gemini)
  - URL: `https://labs.google/fx/es/tools/flow`
- Decision de IA conversacional en n8n:
  - implementar normalmente con nodo `OpenAI` (o agente con modelo OpenAI)

## Punto de situacion para continuar rapido
1. Ejecutar `frontend/npm install` en entorno alternativo y validar `npm run build`.
2. Si falla otra vez, capturar log con `--verbose` y revisar ultimo paquete antes del cuelgue.
3. Empezar rediseno de `frontend/src/pages/index.astro` con base Stitch.
4. Preparar evaluacion de integracion de Flow para generacion de video en pipeline n8n/backend.

## Punto de situacion actualizado (2026-03-02, cierre rapido)
- Diagnostico confirmado:
  - `npm install` se bloquea en la ruta sincronizada del proyecto (`G:\Mi unidad\...`).
  - El mismo install en `C:\Temp` completa correctamente.
- Frontend:
  - aplicado fix TypeScript en `frontend/src/pages/index.astro` para errores de null/typing en script cliente.
- Validacion tecnica:
  - en `C:\Temp\Fisio_IA_Agent_frontend_local`, `npm run build` -> OK
  - `astro check` sin errores (0)
- Decision operativa temporal:
  - ejecutar install/build del frontend en ruta local no sincronizada hasta cerrar bloqueo del host actual.

## Siguiente sesion (pasos exactos)
1. Copiar `frontend/` a `C:\Temp\Fisio_IA_Agent_frontend_local`.
2. Ejecutar:
   - `npm install --no-audit --no-fund`
   - `npm run build`
3. Si build OK, continuar el rediseno con Google Stitch y aplicar cambios en repo principal.

## Cierre de hoy (2026-03-02)
- Estado frontend:
  - bloqueo de `npm install` persiste solo en ruta sincronizada (`G:\Mi unidad\...`).
  - solucion operativa validada en esta sesion: build por ruta local no sincronizada.
- Script disponible y probado:
  - `scripts/frontend-local-build.ps1`
  - comando: `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1`
  - resultado validado: `astro check` OK + `astro build` OK.
- Ajuste de limpieza:
  - `.gitignore` incluye `frontend/node_modules_stuck*/`.
- Regla aplicada a partir de ahora:
  - usar skills disponibles en `.agents` cuando aplique, con constancia breve en seguimiento.

## Arranque minimo recomendado (siguiente sesion)
1. **[Infra Manual]**: Crear App `fisio-frontend` en EasyPanel desde GitHub repo, usando `Dockerfile` y path `/frontend`.
2. **[Infra Manual]**: Asegurar branch protection de `main` en configuración web de GitHub.
3. Ejecutar testing funcional manual en Telegram (`/start`, `/plan`, `/dolor`) desde un móvil real.
4. Validar llegada a base de datos en Supabase.
5. Continuar desarrollo de lógicas del Agente IA y vídeos de seguimiento.

## Decision UX/UI registrada (2026-03-03)
- Frontend rediseñado completamente en sesion 24.
- Dashboard profesional dark mode con sidebar, metricas, tabla de intakes, chat del agente IA.
- Proyecto Stitch de referencia: ID 8185935624241829024.
- Paleta: #0f1419 / #1a2332 / #0d9488 (teal).
- Tipografia: Inter + Material Symbols Rounded.

## Docker frontend hardening (2026-03-03, Sesion 25)
- `Dockerfile`: HEALTHCHECK con `wget` contra `/health` cada 30s.
- `nginx.conf`: bloque `location /health` retorna 200 sin access_log.
- Build local validado: 0 errores, 0 warnings.

## Guia despliegue frontend (EasyPanel)
1. EasyPanel → Proyecto `n8n` → **+ Create Service** → **App**.
2. Nombre: `fisio-frontend`.
3. Source: GitHub → `https://github.com/raulruizproyectos/Fisio_IA_Agent.git` → `main` → Root: `/frontend`.
4. Build: Dockerfile.
5. Domains: asignar dominio (ej. `fisio-frontend.b5xbaf.easypanel.host`).
6. Puerto: `80`.
7. Deploy.

## Arranque minimo (siguiente paso)
1. Push a GitHub y crear App en EasyPanel (7 pasos arriba).
2. Verificar `https://fisio-frontend.b5xbaf.easypanel.host/health` → 200.
3. Probar dashboard y chat agente IA desde el frontend desplegado.
4. Ejecutar E2E Telegram (`/start`, `/plan`, `/dolor`).
5. Configurar branch protection en `main`.
6. Rotar credenciales sensibles.

## Actualizacion (2026-03-03, Sesion 27)
- Pendiente de sesion 26 "Frontend Backend Hooks" completado en codigo:
  - Backend:
    - Nuevo endpoint `GET /api/profesional/video-jobs` en `backend/src/routes/professional.js`.
  - Frontend:
    - `frontend/src/pages/index.astro` ya no usa `alert()` para acciones principales.
    - Botones activos:
      - Dashboard/Intakes: `Revisar` -> abre Historial del paciente.
      - Pacientes: `Ver` -> abre Historial del paciente.
      - Videos: `Historial` -> abre Historial del paciente.
    - Sección Videos conectada a datos reales de backend.
    - Sección Historial conectada a:
      - `GET /api/pacientes/:id`
      - `GET /api/profesional/patients/:patientId/history`

## Pendiente inmediato actualizado
1. **[Manual EasyPanel]** crear/desplegar `fisio-frontend` desde `/frontend` y validar `/health`.
2. **[Manual E2E Telegram]** ejecutar flujo real `/start`, `/plan`, `/dolor`.
3. **[Manual GitHub]** activar branch protection en `main`.
4. **[Seguridad]** rotar credenciales sensibles (n8n, EasyPanel, secretos entorno).

## Actualizacion (2026-03-03, Sesion 28)
- Infraestructura reorganizada en EasyPanel:
  - Proyecto `openclaw` eliminado.
  - Proyecto nuevo `fisio-ia-agent` creado.
  - Servicios movidos de `n8n` -> `fisio-ia-agent`:
    - `fisio-backend`
    - `fisio-frontend`
- Backend confirmado operativo:
  - `https://fisio-backend.b5xbaf.easypanel.host/api/health` -> 200.
- Frontend:
  - Dominio corregido a `fisio-frontend.b5xbaf.easypanel.host`.
  - Build configurado en EasyPanel como `dockerfile` (`file: Dockerfile`).
  - Deploy actualizado al commit `c3a8aae`.
  - Estado actual: sigue en `502`.
  - Señales técnicas:
    - `monitor.getDockerTaskStats`: `fisio-ia-agent_fisio-frontend` -> `actual=0`, `desired=1`.
    - `projects.getDockerContainers`: sin contenedor corriendo para frontend.
    - `services.common.getServiceError`: `null` (sin detalle).

## Pendiente inmediato (nuevo)
1. **[Manual EasyPanel UI]** abrir logs/historial de deploy de `fisio-frontend` para capturar causa exacta del task fail.
2. **[Manual Host/Docker Swarm]** revisar reason del servicio `fisio-ia-agent_fisio-frontend` (si hay acceso a consola del nodo).
3. **Aplicar fix de runtime/build** según log y redeploy.
4. Confirmar estado final:
   - `https://fisio-frontend.b5xbaf.easypanel.host/` -> 200
   - `monitor.getDockerTaskStats` frontend -> `actual=1`, `desired=1`.
5. Mantener pendientes ya abiertos:
   - E2E Telegram real.
   - branch protection en `main`.
   - rotación de credenciales.

## Corte tecnico actualizado (2026-03-03, antes de nueva arquitectura)
- Infra:
  - Proyecto de trabajo consolidado: `fisio-ia-agent`.
  - `openclaw` eliminado.
  - `fisio-backend` y `fisio-frontend` ya migrados al nuevo proyecto.
- Estado operativo:
  - Backend: OK (200 en `/api/health`).
  - Frontend: KO (502 en dominio principal).
- Repositorio:
  - `main` sincronizada con commits de fix y documentación.
  - Últimos commits clave:
    - `cd47cba` (documentación de migración y estado actual)
    - `c3a8aae` (fix Dockerfile frontend sin lockfile obligatorio)
- Bloqueo activo para retomar:
  - frontend no llega a levantar task/contendor en runtime de EasyPanel.

## Prioridad de arranque tras nuevo prompt
1. Revisar y decidir nueva arquitectura objetivo (componentes, contratos y despliegue).
2. Definir plan de migración por fases sin romper backend actual operativo.
3. Replantear frontend dentro de la nueva arquitectura y resolver bloqueo 502 durante la transición.

## Actualizacion (2026-03-03, Sesion 30)
- Limpieza aplicada para nueva arquitectura:
  - removidos workflows legacy de video del repo.
  - removido archivo temporal `create.lazy.tmp.js`.
  - removida carpeta residual `frontend/node_modules_stuck_20260302_202222`.
- Estado operativo:
  - backend sigue estable.
  - foco de desarrollo pasa a CRM + citas + ejercicios.
- Artefactos clave nuevos:
  - `ARCHITECTURE.md`
  - `.agents/AGENT_RULES.md`
  - `.agents/skills/*`
  - `database/schema_vnext.sql`

## Proximo paso recomendado inmediato
1. Definir contratos JSON finales W0/W1/W2/W3 en n8n.
2. Crear bucket privado `ejercicios` (si no existe) y validar object_keys.
3. Cablear trigger web CRM para recomendaciones de ejercicios.
4. Implementar logging completo por `request_id` en DB.

## Cierre diario definitivo (2026-03-03)
### Estado operativo real al cierre
- Backend: OK (`200`).
- Frontend: KO (`502`) en dominio productivo.
- Arquitectura objetivo ya fijada y documentada (CRM + Citas + Ejercicios).

### Lo que SI esta listo
- Repositorio limpio para nueva etapa.
- Reglas y skills de agente creadas en `.agents/`.
- Prompt maestro de ejercicios listo para nodo OpenAI n8n.
- Propuesta SQL aditiva disponible en `database/schema_vnext.sql`.

### Lo que queda para primera hora de manana
1. EasyPanel: extraer causa exacta de `fisio-frontend` (task fail) y dejarlo en 200.
2. Supabase Storage: validar bucket `ejercicios` en privado.
3. n8n: definir contratos y montar W0/W1/W2/W3.
4. CRM trigger: conectar boton de ejercicios a W3.
5. Logging: asegurar trazabilidad por `request_id` y `patient_id`.

### Regla de continuidad
- Cualquier avance de manana debe registrarse primero en `CHANGELOG.md` y luego en este archivo.

## Ajuste ultimo minuto (Sesion 32)
- Prompt del Agente IA de Ejercicios ya adaptado a canal Telegram (igual que agente de citas en n8n).
- Mantiene estrategia de imagenes desde Supabase Storage por `object_key` + signed URL JIT en n8n.
- Modo actual: 1 ejercicio maximo por respuesta.

## Actualizacion (2026-03-04, Sesion 33)
- Limpieza local aplicada para evitar duplicados/basura:
  - eliminada carpeta vacia `n8n/workflows/`.
  - eliminado duplicado legacy `docs/architecture.md`.
- Canonico del proyecto:
  - Arquitectura: `ARCHITECTURE.md`.
  - Workflows versionados: `n8n/Fisio_IA_Agent/*.json`.

## Pendiente inmediato (orden en instancia n8n)
1. Listar workflows en n8n remoto y detectar duplicados por nombre + contenido.
2. Renombrar con convención W0/W1/W2/W3 donde aplique.
3. Mover/etiquetar todos los workflows del proyecto bajo carpeta/tag `Fisio_IA_Agent`.
4. Desactivar/eliminar duplicados remotos no canonicos tras backup JSON.
5. Exportar snapshot final de n8n y versionarlo en `n8n/Fisio_IA_Agent/`.

## Actualizacion (2026-03-04, Sesion 34)
- Auditoria remota ejecutada sobre todos los workflows de n8n.
- Snapshot y resumen guardados en:
  - `docs/data/n8n/workflows_snapshot_20260304_raw.json` (local, no versionado)
  - `docs/data/n8n/workflows_summary_20260304.json`
- Limpieza aplicada en instancia:
  - desactivados 8 workflows activos fuera de `Fisio_IA_Agent / ...`.
  - eliminado 1 duplicado exacto de `Fisio_IA_Agent / Nucleo Agente`.
- Estado remoto tras consolidacion:
  - total workflows: 52
  - activos: 6
  - activos dentro de `Fisio_IA_Agent / ...`: 6 (100%)
- Backups de seguridad de flujos desactivados:
  - `docs/data/n8n/backup_before_deactivate_20260304/` (local, no versionado)

## Pendiente inmediato actualizado
1. Revisar manualmente en UI n8n los 8 flujos desactivados y decidir si alguno debe migrarse a version canonica W0/W1/W2/W3.
2. Resolver con logs de servidor n8n el error `500` en API para `create/update/tags` (ahora solo operan activate/deactivate/delete).
3. Versionar workflows canonicos vNext (W0/W1/W2/W3) dentro de `n8n/Fisio_IA_Agent/` con control de errores estandar.
4. Re-activar solo workflows vNext despues de validacion E2E Telegram + backend.

## Verificacion final (2026-03-04, Sesion 35)
- Comprobacion post-orden manual en n8n completada:
  - `total=52`, `active=6`, `active_outside_fisio=0`.
  - sin colisiones de `webhook path` entre activos.
  - `POST /webhook/agent/core` probado en vivo con `200`.

## Siguiente bloque de desarrollo (inmediato)
1. Implementar version canonica robusta de W1 (citas) reutilizando patrones de `Sub_Agente_Citas` + `create_booking` + `search_booking`.
2. Implementar control de errores transversal (retry/backoff + notificacion) en W0/W1/W2/W3.
3. Conectar y validar trazabilidad de `request_id` end-to-end (Telegram -> n8n -> backend -> DB).

## Actualizacion (2026-03-04, Sesion 36)
- Hardening aplicado a workflow versionado W1:
  - `n8n/Fisio_IA_Agent/w1-appointment-agent.json`
- Mejoras principales:
  - parseo/validacion robusta de slots (`slot_start`, `slot_end`, ventana valida).
  - request backend con `channel` dinamico + `timeout` 15000ms.
  - control de errores backend con salida estructurada (`status`, `backend_error`).
  - mensajes de respuesta normalizados sin caracteres corruptos.

## Pendiente inmediato actualizado
1. Publicar en instancia n8n la version endurecida de `W1` (siempre desde JSON canonico del repo).
2. Ejecutar prueba E2E de cita:
   - payload valido -> `status=confirmed`.
   - payload incompleto -> `status=needs_slot_data`.
   - error backend simulado -> `status=error`.
3. Avanzar hardening equivalente en W0/W2/W3 con mismo patron de observabilidad y manejo de fallos.

## Actualizacion (2026-03-04, Sesion 37)
- Hardening aplicado en repo:
  - `n8n/Fisio_IA_Agent/telegram-chat.json` (W0 entrada Telegram robusta).
  - `n8n/Fisio_IA_Agent/fisio-agent-core.json` (router core con rutas estructuradas y `request_id`).
- Nota de operacion n8n:
  - En UI de carpeta/tag `Fisio_IA_Agent` siguen visibles 5 porque `Nucleo Agente` esta activo pero sin tag.
  - La API `PUT /workflows/{id}/tags` devuelve `500`, por eso el ajuste de tag debe hacerse manual en UI.

## Pendiente inmediato (operativo)
1. En UI n8n: anadir tag `Fisio_IA_Agent` a `Fisio_IA_Agent / Nucleo Agente` para que aparezcan 6/6 en carpeta.
2. Importar/publicar desde repo los workflows endurecidos (`telegram-chat` y `fisio-agent-core`).
3. Validar E2E W0->backend->reply y en paralelo preparar hardening W2/W3.
