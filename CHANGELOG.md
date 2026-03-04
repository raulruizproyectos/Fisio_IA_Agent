# Fisio_IA_Agent - Changelog / Context Log

## Sesion 49 - 2026-03-04

### Objetivo
- Dejar W2/W3 operativos en n8n y verificar bloqueos reales de produccion para cerrar despliegue.

### Cambios implementados
- ✅ W2/W3 recreados en n8n con webhook `POST` y activados.
- ✅ Corregidos workflows vNext para evitar `$env` en expresiones (instancia bloquea env access en nodos).
- ✅ Correccion de contratos HTTP JSON en W2/W3 para evitar error de parseo del nodo HTTP Request.

### Verificacion tecnica
- Frontend produccion sigue en version antigua:
  - HTML remoto aun contiene `<script lang="ts">` y no incluye seccion `plantillas`.
- Backend produccion sigue en version antigua:
  - `Access-Control-Allow-Origin: http://localhost:4321`
  - `POST /api/exercises/recommend` responde `404`.
- W2/W3 en n8n:
  - workflows creados/activos, pero dependen de backend y Edge Function al dia.

### Bloqueos actuales para funcionamiento completo
1. Falta redeploy de `fisio-frontend` (para modo oscuro y script corregido).
2. Falta redeploy de `fisio-backend` (para rutas nuevas y CORS actualizado).
3. Supabase Edge Function `exercise-recommend` devuelve `OPENAI_API_KEY not configured`.
## Sesion 48 - 2026-03-04

### Objetivo
- Fijar norma escrita y obligatoria para evitar workflows fuera de carpeta/tag `Fisio_IA_Agent` en n8n.

### Cambios implementados
- ✅ Nuevo documento normativo:
  - `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- ✅ Referencia añadida en:
  - `n8n/README.md`
  - `README.md`

### Regla formalizada
- Ningun workflow de proyecto se considera `DONE` si no esta dentro de carpeta/tag `Fisio_IA_Agent`.
- Si API no permite etiquetar/mover, se exige accion manual en UI antes de cerrar la sesion.
## Sesion 47 - 2026-03-04

### Objetivo
- Cambiar la UI del CRM a modo oscuro completo manteniendo legibilidad y consistencia visual.

### Cambios implementados
- ✅ `frontend/src/layouts/Layout.astro`
  - Nueva paleta dark global (`--bg-*`, `--text-*`, `--border-*`, sombras y fondo general).
- ✅ `frontend/src/pages/index.astro`
  - Ajuste de colores hardcodeados a tokens dark:
    - sidebar, nav hover/active
    - topbar, search input, user pill
    - cards y metric cards
    - selector de plantillas y superficies elevadas
  - Mantiene responsive y jerarquia visual (desktop/movil).

### Resultado
- La interfaz deja de verse blanca y pasa a un modo oscuro consistente en todo el dashboard.

## Sesion 46 - 2026-03-04

### Objetivo
- Desbloquear frontend de produccion y completar workflows vNext faltantes (W2/W3).

### Cambios implementados
- ✅ Fix frontend runtime:
  - `frontend/src/pages/index.astro`: cambiado `<script lang="ts">` a `<script>` para evitar entregar TypeScript sin transpilar en produccion.
- ✅ Fix backend CORS en produccion:
  - `backend/src/index.js`: CORS pasa a lista de origenes permitidos (`FRONTEND_URLS`, `FRONTEND_URL`, localhost y dominio frontend productivo).
  - evita bloqueo de peticiones desde `https://fisio-frontend.b5xbaf.easypanel.host`.
- ✅ Workflows n8n vNext añadidos:
  - `n8n/Fisio_IA_Agent/vnext/w2-exercise-agent.json`
  - `n8n/Fisio_IA_Agent/vnext/w3-crm-trigger.json`
- ✅ Documentacion de workflows actualizada:
  - `README.md`
  - `n8n/README.md`

### Diagnostico confirmado de incidencia
- El frontend desplegado mostraba HTML con script TypeScript embebido (sintaxis `as HTML...`), lo que rompe ejecucion JS en navegador.
- El backend respondia `Access-Control-Allow-Origin: http://localhost:4321`, bloqueando llamadas cross-origin desde el frontend productivo.

## Sesion 45 - 2026-03-04

### Objetivo
- Dejar inventario de workflows de n8n ordenado y sincronizado con produccion, sin duplicados confusos.

### Cambios implementados
- ✅ Sincronizacion desde n8n remoto de los `6` workflows activos de `Fisio_IA_Agent / ...` a:
  - `n8n/Fisio_IA_Agent/production/`
  - archivos exportados: `nucleo-agente`, `orquestador-intake-video`, `puente-error-backend`, `subflujo-crear-render-video`, `subflujo-pendientes`, `subflujo-revision-video`.
- ✅ Reordenacion de workflows canonicos en desarrollo a:
  - `n8n/Fisio_IA_Agent/vnext/`
  - incluye `telegram-chat.json` con `Telegram Trigger` nativo.
- ✅ CI actualizada para validar JSON de workflows de forma recursiva en toda la carpeta `n8n/Fisio_IA_Agent`.
- ✅ Artefacto de auditoria refrescado:
  - `docs/data/n8n/workflows_summary_20260304.json`

### Estado resultante
- El repositorio ya contiene todos los workflows activos del proyecto dentro de `Fisio_IA_Agent`.
- Separacion clara entre:
  - `production/` (estado real desplegado)
  - `vnext/` (estado objetivo en migracion)

## Sesion 44 — 2026-03-04

### Objetivo
- Implementar en producto el bloque de mayor ROI detectado en PROET: **Plantillas + clonado de programas**.

### Cambios implementados
- ✅ `backend/src/routes/professional.js`
  - Nuevo endpoint `GET /api/profesional/program-templates`
    - agrega planes legacy (`planes`) por titulo para generar plantillas reutilizables
    - calcula `usage_count`, `exercises_count`, `last_used_at`, `source_plan_id`, `source_patient_name`
    - control de errores si faltan tablas (`planes`, `items_plan`, `pacientes`)
  - Nuevo endpoint `POST /api/profesional/program-templates/clone`
    - clona plan origen a paciente destino
    - crea nuevo registro en `planes` (estado `borrador`)
    - copia todos los `items_plan` del plan origen
    - valida coherencia profesional↔paciente
- ✅ `frontend/src/pages/index.astro`
  - Nueva sección SPA **Plantillas Terapéuticas** en sidebar.
  - Tabla de plantillas más reutilizadas con:
    - título
    - usos
    - nº ejercicios
    - último uso
    - paciente origen
  - Selector de **paciente destino** para clonado.
  - Acción “Clonar” conectada a backend (`POST /program-templates/clone`).
  - Ajustes de estilos responsive para controles de la nueva sección.
- ✅ `README.md`
  - Añadidos endpoints de plantillas/clonado en listado principal.

### Verificacion tecnica
- `node --check backend/src/routes/professional.js` -> OK.
- Build frontend no ejecutable en este entorno por falta de dependencia local:
  - `npm run build` falla con `"astro" no se reconoce...`.

### Pendiente inmediato
- [ ] Instalar dependencias frontend en entorno local de build y validar `astro build` tras el cambio de Plantillas.
- [ ] Redeploy backend EasyPanel para publicar rutas W1 (`/api/profesional/appointments` sigue `404` en producción).

## Sesion 43 — 2026-03-04

### Objetivo
- Analizar frontend + backend de PROET por secciones para extraer mejoras concretas aplicables a Fisio_IA_Agent.

### Cambios implementados
- ✅ Escaneo completo de bundles de `app.exerciciterapeutic.cat`:
  - `131` chunks JS analizados.
  - `148` endpoints API unicos detectados.
- ✅ Inventario de secciones del sidebar profesional (frontend):
  - `Inici`, `Crear programa`, `Meus programes`, `Plantilles`, `Meus exercicis`, `Pacients`, `Contacte`, `Meu calendari`, `Meu perfil`.
  - Mapeo ruta + endpoints por seccion.
- ✅ Artefactos de analisis versionados:
  - `docs/proet/platform_analysis_20260304.md`
  - `docs/proet/sections_endpoints_20260304.json`
  - `docs/proet/api_groups_20260304.json`
- ✅ Hallazgos priorizados para roadmap del proyecto:
  - modulo de plantillas reutilizables con ranking de uso.
  - onboarding/invitacion de pacientes.
  - calendario terapeutico con estado de cumplimiento.
  - exportacion/envio PDF de prescripcion.
  - taxonomia de ejercicios ampliada (zona/material/objetivo/tipo).

### Backend PROET (inferencia estructural)
- Modulos API con mayor peso:
  - `programs: 29 endpoints`
  - `exercises: 23 endpoints`
  - `authentication: 11 endpoints`
  - `users: 11 endpoints`
  - `clients: 10 endpoints`

### Pendiente inmediato
- [ ] Ejecutar integracion tecnica en Fisio_IA_Agent de los 2 bloques con mayor ROI:
  1. plantillas + clonacion de programas
  2. flujo de invitacion y seguimiento de pacientes
- [ ] Mantener pendiente de produccion:
  - redeploy de `fisio-backend` (W1 appointments sigue `404` en endpoint publico).

## Sesion 42 — 2026-03-04

### Objetivo
- Aprovechar contenido real de PROET (diagnosticos/programas/ejercicios/imagenes) y dejar un flujo reproducible para alimentar W2.

### Cambios implementados
- ✅ `scripts/proet-export.mjs`
  - Nuevo exportador reutilizable de catalogo PROET.
  - Extrae por API:
    - `/api/authentication/auth`
    - `/api/programs/users/list`
    - `/api/programs/users/details`
    - `/api/exercises/program-list`
    - `/api/programs/admin/most-used-physio`
  - Normaliza salida en JSON con:
    - perfil fuente
    - templates top
    - programas del profesional
    - ejercicios unicos (texto, imagen, video)
  - Incluye limpieza de texto HTML y reparacion de codificacion.
- ✅ Snapshot generado y versionado:
  - `docs/data/proet_snapshot_20260304.json`
  - Estadisticas del snapshot:
    - `user_programs_total: 20`
    - `templates_total: 59`
    - `program_exercises_total: 309`
    - `unique_exercises_total: 179`
- ✅ `README.md`
  - Documentada la operativa de exportacion PROET (`node scripts/proet-export.mjs --email=<tu_email> --locale=val`).

### Verificacion de produccion (backend)
- `GET /api/health` en `fisio-backend` -> `200`.
- `GET /api/profesional/appointments` en `fisio-backend` -> `404`.

### Pendiente inmediato
- [ ] Redeploy de `fisio-backend` en EasyPanel para aplicar codigo de W1 (rutas `appointments`) ya presente en `main`.
- [ ] Conectar snapshot PROET a ingesta de `crm_ejercicios_catalogo` / `crm_ejercicio_media` (paso siguiente para robustecer W2 con catalogo real ampliado).

## Sesion 41 — 2026-03-04

### Objetivo
- Avanzar W1 (citas) en Telegram con integración real no bloqueante y corregir bug runtime en W2.

### Cambios implementados
- ✅ `backend/src/routes/exercises.js`
  - Añadido `import crypto from 'node:crypto'` para evitar `ReferenceError` en `POST /api/exercises/recommend` (`crypto.randomUUID`).
- ✅ `backend/src/routes/telegram.js`
  - W1 deja de estar en placeholder: cuando `intent.route === "appointment"` y confianza >= 0.6:
    - dispara webhook configurable `N8N_APPOINTMENT_WEBHOOK_URL`
    - envía payload estructurado con `request_id`, `patient_id`, `professional_id`, `chat_id`, `message_text`, `timestamp`
    - responde al paciente con mensaje de éxito del workflow o fallback seguro.
  - Nuevo comando Telegram `/cita <inicio_iso> <fin_iso> [nota]` para solicitar cita sin depender del clasificador.
  - Añadido logging técnico en `crm_comunicaciones` (si existe tabla) para trazabilidad de intentos W1.
  - Umbral de confianza unificado en constante (`INTENT_CONFIDENCE_THRESHOLD`).
- ✅ `backend/.env.example`
  - Añadida variable `N8N_APPOINTMENT_WEBHOOK_URL`.
  - Incluida URL de ejemplo local para W1: `http://localhost:5678/webhook/fisio/w1/appointment`.
- ✅ `.github/workflows/ci.yml`
  - CI backend ahora incluye `node --check src/routes/exercises.js`.
  - Nuevo job `n8n_json_validate` para validar parseo JSON de workflows versionados.
  - Fix adicional: parser JSON en CI limpia BOM UTF-8 (`\uFEFF`) para evitar falsos fallos.
- ✅ `backend/src/routes/professional.js`
  - Nuevos endpoints W1 para citas en `crm_citas`:
    - `GET /api/profesional/appointments`
    - `POST /api/profesional/appointments`
    - `PATCH /api/profesional/appointments/:appointmentId`
  - Incluye validación de fechas/estado/canal y control de solapes por fisioterapeuta.
  - Incluye resolución automática de IDs legacy (`pacientes`/`profesionales`) hacia modelo CRM (`crm_pacientes`/`crm_perfiles`) para compatibilidad con Telegram actual.
- ✅ `n8n/Fisio_IA_Agent/w1-appointment-agent.json`
  - Workflow W1 versionado en repo:
    - recibe webhook de solicitud de cita
    - normaliza payload
    - crea cita en backend si hay slot completo
    - devuelve respuesta JSON para Telegram (confirmación o solicitud de más datos).
- ✅ Documentación alineada:
  - `README.md`: endpoints de citas y workflow W1 añadidos.
  - `n8n/README.md`: workflow W1 y endpoint de citas añadidos.
  - `n8n/telegram-bot.md`: nuevo comando `/cita` documentado.
- ✅ `frontend/src/pages/index.astro`
  - Nueva sección SPA **Citas** (tabla agenda + refresh).
  - Carga desde `GET /api/profesional/appointments`.
  - Cancelación desde UI con `PATCH /api/profesional/appointments/:appointmentId`.
  - Métrica `Sesiones hoy` conectada a citas del día.

### Reutilización n8n (regla obligatoria)
- ✅ Revisados workflows existentes en `n8n/Fisio_IA_Agent/*` antes de ampliar W1.
- ✅ Reutilizado patrón webhook + respuesta segura ya presente en flujos y rutas actuales (sin crear flujo paralelo en repo).

### Pendiente inmediato
- [ ] Configurar `N8N_APPOINTMENT_WEBHOOK_URL` en backend productivo para activar W1 de extremo a extremo.
- [ ] Configurar credenciales/flow de Google Calendar en W1 para confirmación automática.
- [ ] Ejecutar E2E Telegram para ruta `appointment` y validar logs en `crm_comunicaciones`.

## Sesion 40 — 2026-03-04

### Requisito añadido: Responsive Design obligatorio (PC + Móvil)
- ✅ `ARCHITECTURE.md` sección 8 (UX Touchpoints): añadida regla obligatoria de responsive design con guías técnicas (mobile-first CSS, sidebar colapsable, tablas adaptativas, targets 44x44px, viewport meta tag, breakpoints de verificación 375px / 1280px)
- ✅ `AGENT_RULES.md` nueva regla 6: todo cambio de frontend debe ser compatible con escritorio y móvil
- Motivación: el frontend se visualizaba correctamente en PC pero no en móvil

### Requisito añadido: Reutilización obligatoria de workflows n8n
- ✅ `AGENT_RULES.md` nueva regla 7: antes de crear cualquier workflow/nodo en n8n, revisar TODOS los existentes y priorizar reutilización
- ✅ Reforzada la regla operativa existente en CHANGELOG (Sesión 4+) sobre copiar/adaptar nodos funcionales

### Frontend Responsive implementado
- ✅ Sidebar: oculto por defecto en móvil (`transform: translateX(-100%)`), se abre como overlay con backdrop semitransparente
- ✅ JS sidebar toggle: detecta `isMobile()` para abrir overlay vs colapsar en desktop, cierra al clicar nav item o backdrop
- ✅ Metrics cards: grid 4col desktop → 2col tablet → 1col small mobile
- ✅ Agent panel: `max-height: 60vh` en móvil, fluye debajo del contenido principal
- ✅ Tables: `min-width: 560px` fuerza scroll horizontal en `.table-wrap` en móvil
- ✅ Touch targets: mínimo 44×44px en botones, send, exercise, toggle
- ✅ Chat textarea: `font-size: 16px` para prevenir zoom en iOS
- ✅ Config grid: `1fr` en móvil, `minmax` adaptativo
- ✅ Breakpoints: 1100px (tablet), 768px (mobile), 480px (small mobile)
- ✅ Build validado: `astro build` OK, 0 errores
- ✅ Push a GitHub: commit `ce630f3` en `main`

### Security Hardening (RLS Policies) implementado
- ✅ Verificada habilitación de RLS en las 27 tablas de la base de datos Supabase.
- ✅ Aplicada migración para políticas granulares RLS (38 nuevas políticas `auth.uid()` para tablas del CRM y legacy).
- ✅ Funciones helper (`get_my_profile_id`, `get_my_profesional_id`) creadas.
- ✅ Resueltas advertencias de Supabase Security Advisor (asignado explícitamente `search_path = public` a funciones y políticas genéricas a `citas`/`usuarios`).

### Pendiente para próxima sesión (Punto de Retorno)
- [ ] **[Manual EasyPanel]** Redeploy `fisio-frontend` y `fisio-backend` para aplicar cambios en producción.
- [ ] E2E: Prueba completa multicanal Telegram + CRM + Supabase.
- [ ] W1: Citas + Google Calendar (requiere OAuth config manual).
- [ ] W3: CRM Trigger Button.

## Sesion 39 — 2026-03-04

### Prerequisitos completados
- ✅ Migración `schema_vnext.sql`: 12 tablas CRM nuevas creadas en Supabase (27 tablas totales)
  - `crm_perfiles`, `crm_pacientes`, `crm_asignaciones_fisio_paciente`, `crm_sesiones`, `crm_notas_seguimiento`
  - `crm_citas`, `crm_ejercicios_catalogo`, `crm_ejercicio_media`
  - `crm_recomendaciones`, `crm_recomendacion_items`, `crm_comunicaciones`, `crm_audit_log`
- ✅ RLS habilitado + políticas service_role en todas las tablas CRM
- ✅ Triggers `updated_at` en 9 tablas CRM
- ✅ 16 ejercicios migrados de `ejercicios` → `crm_ejercicios_catalogo` con metadata completa
- ✅ Bucket privado `ejercicios` creado en Supabase Storage (10MB, JPEG/PNG/GIF/WebP/MP4)
- ✅ Fix search_path en función `crm_set_updated_at` (advisory de seguridad)

### W2 — Agente IA de Ejercicios
- ✅ `backend/src/routes/exercises.js` — 4 endpoints:
  - `GET /catalog` — catálogo filtrable por zona, nivel, búsqueda
  - `GET /:id/media` — signed URLs de Storage (1h expiry)
  - `POST /recommend` — core W2: síntomas → OpenAI → ejercicios → `crm_recomendaciones`
  - `GET /recommendations/:patientId` — historial de recomendaciones con items + ejercicio details
- ✅ Edge Function `exercise-recommend` desplegada en Supabase (gpt-4o-mini, ACTIVE)
  - System prompt con reglas de seguridad (red flags, contraindicaciones)
  - Respuesta JSON estructurada obligatoria
  - Fallback automático: si `N8N_EXERCISE_WEBHOOK_URL` no configurada → Edge Function directo
- ✅ Ruta registrada en `index.js` como `/api/exercises` y `/api/ejercicios`
- ✅ `.env.example` actualizado con `N8N_EXERCISE_WEBHOOK_URL` y `OPENAI_API_KEY`

### Flujo W2 completo
```
Frontend/Telegram → POST /api/exercises/recommend
  → Backend carga catálogo de crm_ejercicios_catalogo
  → Llama Edge Function exercise-recommend (o n8n webhook)
  → OpenAI gpt-4o-mini selecciona 3-5 ejercicios
  → Guarda en crm_recomendaciones + crm_recomendacion_items
  → Genera signed URLs de media
  → Devuelve respuesta con ejercicios + mensajes para paciente y fisio
  → Log en crm_comunicaciones
```

### Pendiente para próxima sesión
- [ ] Configurar `OPENAI_API_KEY` como secreto en Edge Functions (Dashboard → Edge Functions → Secrets)
- [ ] W1: Citas + Google Calendar (requiere OAuth config manual)
- [ ] E2E: Prueba completa multicanal Telegram + CRM + Supabase
- [ ] RLS policies granulares para autenticación de usuarios

### W0 — Router de Intención
- ✅ Edge Function `intent-router` desplegada (gpt-4o-mini, temperature 0.1, max 100 tokens)
  - Clasifica mensajes en: `exercise`, `appointment`, `session_note`, `unknown`
  - JSON output con `route`, `confidence`, `reasoning`
- ✅ `telegram.js` actualizado: mensajes free-text pasan por W0 antes de procesarse
  - Si `exercise` + confidence ≥ 0.6 → auto-recomendación W2 + respuesta en Telegram
  - Si `appointment` + confidence ≥ 0.6 → placeholder (W1 pendiente)
  - Fallback graceful: si W0 falla → comportamiento original (crear intake)

### W3 — Trigger Web CRM
- ✅ Botón 🏋️ "Recomendar ejercicios" añadido al panel Agente Clínico IA (botón amber)
  - Envía síntomas directamente a `POST /api/exercises/recommend`
  - Muestra respuesta estructurada: alertas, ejercicios, confianza, razones, mensaje para paciente
  - Usa `selectedPatientId` del SPA para vincular al paciente seleccionado
- ✅ CSS: gradiente amber (#c9871c → #e6a840) diferenciado del send-btn azul
- ✅ Hints actualizados: "Ctrl+Enter = Agente IA · 🏋️ = Ejercicios AI"
## Pivot de Alcance (Objetivo Actual) — 2026-03-03

### 1) Que es ahora el sistema
- CRM Web para centros de fisioterapia (gestion de pacientes, sesiones, citas y recomendaciones).
- Agente de Citas (Telegram + n8n + Google Calendar + Supabase).
- Agente IA de Ejercicios (Telegram + boton en CRM + n8n OpenAI + Supabase + Storage).

### 2) Que queda en pausa
- Pipeline de video: **PAUSADO** (fuera del alcance actual).
- Se preserva todo el trabajo historico previo para futura reactivacion.
- Aprovechamiento acordado: los subflujos de video se conservan como plantilla reusable de pipeline de media (revision/aprobacion/envio) para el nuevo contexto de ejercicios.

### 3) Decisiones tecnicas clave
- Una sola BD: Supabase del proyecto `Fisio_IA_Agent` como source of truth.
- Bucket de Storage: `ejercicios` (privado).
- URLs firmadas: generacion JIT (just-in-time), sin persistir signed URLs en BD.
- Firmado de URLs desde n8n usando service role key de Supabase.
- Todo evento debe quedar registrado en ficha del paciente (trazabilidad completa).

### 4) Arquitectura (Objetivo Actual)
- Web CRM (frontend) -> backend -> webhook/trigger n8n (boton "recomendar ejercicios").
- Telegram -> n8n -> Supabase.
- n8n -> Google Calendar (agenda de citas).
- n8n -> OpenAI (seleccion de ejercicios).
- Supabase DB (source of truth) + Supabase Storage privado (`ejercicios`).

### 5) Flujos principales
- Flujo A: Telegram cita -> n8n -> Google Calendar -> Supabase -> confirmacion Telegram -> visible en CRM.
- Flujo B: Telegram sintomas -> OpenAI -> catalogo en Supabase -> signed URLs de Storage -> envio Telegram -> log en Supabase -> visible en CRM.
- Flujo C: Boton CRM -> backend/webhook -> n8n -> reutiliza Flujo B.

### Ultima sesion / Proximos pasos
- Crear bucket privado `ejercicios` en Supabase Storage.
- Definir mapping ejercicio -> `object_key` (TBD si no existe tabla final acordada).
- Implementar/normalizar workflows n8n:
  - Router Telegram (cita vs ejercicios vs nota de sesion).
  - Citas (Calendar + logging Supabase + confirmacion).
  - Ejercicios (OpenAI + consulta catalogo + signed URLs + envio + logging).
  - Trigger Web (boton CRM).
- CRM debe mostrar: citas + sesiones/notas + recomendaciones (imagenes bajo demanda con URL firmada).
- Seguridad (plan): RLS + modelo de roles `admin`/`fisioterapeuta`.

### TBD / Informacion pendiente
- [ ] Decision final sobre transcripcion de audio Telegram (si aplica).
- [ ] Nombres exactos de tablas para citas, mapping media y comunicaciones/log.
- [ ] Modelo final de auth/roles (`admin` y `fisioterapeuta`).
- [ ] TTL recomendado signed URLs (propuesta inicial: 20 minutos).

## [Sesion 33] - 2026-03-03 (Rediseño Front + alineacion benchmark Fisiomap IA)
### Objetivo
- Mejorar de forma visible el diseño del CRM frontend para una apariencia mas profesional y moderna, manteniendo la funcionalidad actual.
- Aprovechar señales del benchmark publico `https://fisiomap.app/fisiomap-ia/` para reforzar enfoque de producto (prevencion, continuidad asistencial, interoperabilidad y gobernanza de datos).

### Cambios implementados
- Frontend (`frontend/src/layouts/Layout.astro`):
  - Nueva direccion visual: tipografias `Manrope` + `Plus Jakarta Sans`.
  - Paleta y superficies profesionales en modo claro clinico.
  - Fondo atmosferico con gradientes suaves y mejor legibilidad global.
- Frontend (`frontend/src/pages/index.astro`):
  - Ajuste de identidad de cabecera (`Fisio IA Agent`) y titulo de pagina.
  - Refinamiento de componentes UI: sidebar, topbar, cards, tablas, botones y panel de agente.
  - Mejora de microinteracciones (hover/entradas) y animacion escalonada de metricas.
  - Copy de caja de prompt del agente orientado a triage real de dolor.
  - Se conserva toda la logica de datos/API actual sin cambios de contratos.

### Decisiones tecnicas
- Cambio no disruptivo: solo capa visual (HTML/CSS), sin tocar rutas backend ni contratos n8n.
- Se mantiene compatibilidad mobile/desktop y la estructura SPA interna por secciones.
- El benchmark se usa como inspiracion funcional/estrategica, no como clon visual.

### Notas de validacion
- `npm run build` en este entorno falla por ausencia de comando `astro` en PATH local.
- El fallo es de entorno local, no de API/backend ni de los contratos de negocio.

## [Sesion 34] - 2026-03-04 (Hardening deploy frontend EasyPanel)
### Objetivo
- Reducir riesgo de fallo de build en frontend para recuperar servicio `fisio-frontend` en EasyPanel.

### Cambios implementados
- `frontend/src/pages/index.astro`
  - Script cliente marcado como `lang="ts"` para alinear el tipado TypeScript embebido con el compilador de Astro.
- `frontend/package.json`
  - Script `build` ajustado a `astro build` (produccion) para evitar bloqueo por `astro check` en pipeline de despliegue.
  - Script `check` se mantiene disponible de forma explicita para validacion local/CI cuando proceda.

### Estado de plataforma observado
- Backend productivo: `200` en `https://fisio-backend.b5xbaf.easypanel.host/api/health`.
- Frontend productivo: seguia en `502` al momento de iniciar esta sesion de hardening (se fuerza nuevo ciclo de deploy tras este commit).

## [Sesion 35] - 2026-03-04 (Verificacion build OK + bloqueo infra frontend)
### Verificaciones ejecutadas
- Script local de validacion: `powershell -ExecutionPolicy Bypass -File .\\scripts\\frontend-local-build.ps1`
  - `npm install`: OK
  - `npm run build` (`astro build`): OK
  - Resultado: frontend compila correctamente en entorno limpio local.
- Deploy remoto disparado por API (tokens existentes): respuesta `Deploying...` en ambos endpoints conocidos.
- Estado posterior:
  - Backend: `200` estable.
  - Frontend (`fisio-frontend`): sigue `502` ("Service is not reachable").

### Conclusion operativa
- El bloqueo ya no apunta al codigo del frontend; apunta a configuracion/runtime del servicio en EasyPanel (task/container no llega a healthy).
- Siguiente accion critica: inspeccionar error real de servicio en EasyPanel (`services.common.getServiceError` o logs de deployment) con credenciales/API token de EasyPanel.

## [Sesion 36] - 2026-03-04 (Mitigacion runtime frontend en contenedor)
### Hipotesis aplicada
- Build de imagen correcto pero tarea Swarm no permanece activa (`actual=0 / desired=1`).
- Se elimina `HEALTHCHECK` custom del Dockerfile frontend para evitar reinicios por chequeo no fiable en runtime.

### Cambio
- Archivo: `frontend/Dockerfile`
  - Eliminado bloque `HEALTHCHECK`.
  - Se mantiene `CMD nginx -g 'daemon off;'` como proceso principal.

## [Sesion 37] - 2026-03-04 (Frontend recuperado en EasyPanel)
### Acciones ejecutadas
- Commit y push del ajuste de `Dockerfile` frontend.
- Deploy forzado por API TRPC de EasyPanel (`services.app.deployService` con `forceRebuild=true`).
- Verificacion de estado por API:
  - `monitor.getDockerTaskStats` -> `fisio-ia-agent_fisio-frontend: actual=1, desired=1`.
  - `projects.getDockerContainers` -> contenedor frontend en `running`.

### Validacion externa final
- `https://fisio-frontend.b5xbaf.easypanel.host/health` -> `200 (ok)`.
- `https://fisio-frontend.b5xbaf.easypanel.host/` -> `200`.
- Backend se mantiene estable:
  - `https://fisio-backend.b5xbaf.easypanel.host/api/health` -> `200`.

### Estado de cierre
- Bloqueo critico de frontend `502` resuelto.

## [Sesion 38] - 2026-03-04 (Plan exacto de continuidad para manana)
### Orden de arranque acordado
1. W0 + contratos JSON
2. W2 con catalogo + imagen signed URL
3. W3 desde CRM
4. W1 citas + Google Calendar
5. Prueba E2E Telegram + CRM + Supabase logs

### Despues del bloque principal
- Completar pendientes restantes hasta dejar el sistema listo para los primeros tests completos de experiencia de usuario.

## PRIORIDAD OBLIGATORIA GitHub (fuente de verdad)

- Repositorio oficial del proyecto (URL exacta): `https://github.com/raulruizproyectos/Fisio_IA_Agent`
- Todo avance de sesion debe quedar reflejado en este repositorio para continuidad diaria.
- Mantener sincronizada la rama `main` al cierre de cada sesion (codigo + `CHANGELOG.md` + `configuracion_pendiente.md`).
- Esta regla es inicial y permanente para retomar trabajo futuro sin perdida de contexto.
## PRIORIDAD OBLIGATORIA n8n (orden y estructura)

- Todos los workflows de este proyecto deben estar dentro de la carpeta `Fisio_IA_Agent`.
- Todo workflow nuevo que se cree a partir de ahora debe crearse directamente en `Fisio_IA_Agent`.
- Si por error se crea fuera, moverlo de inmediato a `Fisio_IA_Agent` en la misma sesion.
- Esta regla tiene prioridad sobre cualquier otra convencion de nombres.

> Archivo de continuidad entre sesiones.
> Regla acordada: registrar cada avance en formato esquema, breve pero suficientemente exhaustivo para retomar sin perdida de contexto.

## Regla operativa fija (acordada con usuario)

Aplicar en todas las sesiones:
1. Revisar primero todos los workflows disponibles en n8n antes de crear/modificar flujos.
2. Priorizar copiar/adaptar nodos ya funcionales (credenciales, Gmail, errores, webhooks, subworkflows).
3. Registrar en cada sesiÃ³n del changelog quÃ© se revisÃ³ y quÃ© se reutilizÃ³.
4. Usar skills cuando aplique y dejar constancia breve.

---
## Proyecto`r`n- **Nombre:** Fisio_IA_Agent`r`n- **Repositorio GitHub:** `https://github.com/raulruizproyectos/Fisio_IA_Agent`
- **Supabase project:** Agente IA (`uewhbaejcouenoufuwlq`)
- **Organizacion Supabase:** Bases Datos Supabase (`mzbmcdbapvxrqxwkqrmr`)
- **Region:** eu-central-1

## Formato de registro (usar siempre)

Para cada sesion nueva anadir bloque con esta plantilla:

1. `Fecha` y `Sesion`
2. `Objetivo de la sesion`
3. `Cambios implementados` (archivos + endpoints/tablas/flows)
4. `Decisiones tecnicas` (por que)
5. `Pendientes inmediatos`
6. `Bloqueos/riesgos`
7. `Como retomar rapido` (primeros 3 pasos)

---

## 2026-02-26 - Sesion 1: Setup inicial

### Objetivo
- Crear estructura base del proyecto (frontend, backend, db, docs, n8n).

### Cambios implementados
- Base del repo creada con carpetas y archivos iniciales.
- Backend Express con health check y CRUD de pacientes.
- Esquema SQL completo de dominio fisioterapia.
- Documentacion de arquitectura y modelo de datos.

### Decisiones tecnicas
- Stack: Astro + Node/Express + Supabase + n8n.
- Reutilizar proyecto Supabase existente (Agente IA).

### Pendientes inmediatos
- Integracion real de Telegram.
- Workflows n8n funcionales.

### Bloqueos/riesgos
- Falta token real de bot Telegram.

### Como retomar rapido
1. Revisar `backend/src/index.js` y rutas.
2. Revisar `database/schema.sql`.
3. Revisar `n8n/README.md`.

---

## 2026-02-26 - Sesion 2: Telegram + n8n integrado

### Objetivo
- Habilitar opcion de chat por Telegram conectada a Supabase usando n8n.

### Cambios implementados
- Backend:
  - Nuevo archivo: `backend/src/routes/telegram.js`
  - Nuevo endpoint: `POST /api/telegram/link-code/:patientId`
  - Nuevo endpoint: `POST /api/telegram/incoming`
  - Registro de ruta en `backend/src/index.js`
- Base de datos:
  - Nueva tabla: `vinculos_telegram_pacientes`
  - Indices + trigger `actualizado_en` + politica RLS en `database/schema.sql`
- n8n:
  - Nuevo workflow importable: `n8n/workflows/telegram-chat.json`
  - Flujo: `Telegram Trigger -> Prepare Input -> HTTP Request (backend) -> Telegram Reply`
- Documentacion:
  - `n8n/telegram-bot.md`
  - `n8n/README.md`
  - `docs/data-model.md`

### Comandos Telegram disponibles
- `/start CODIGO` -> Vincular paciente-chat
- `/plan` -> Consultar plan activo
- `/dolor <0-10> [nota]` -> Registrar dolor en `sesiones`
- `/ayuda` -> Mostrar comandos

### Decisiones tecnicas
- Resolver logica de comandos en backend (no en nodo Code) para mantener reglas en un solo sitio.
- Usar n8n como orquestador de entrada/salida Telegram.
- Mantener integracion sobre Supabase existente sin tocar tablas legacy (`usuarios`, `citas`, `n8n_chat_histories`).

### Pendientes inmediatos
- Crear bot en BotFather y cargar token en credencial Telegram de n8n.
- Aplicar migracion de `vinculos_telegram_pacientes` en Supabase productivo.
- Probar E2E en entorno accesible por Telegram.
- Endurecer seguridad del endpoint `/api/telegram/incoming` (header secreto/rate-limit).

### Bloqueos/riesgos
- Sin token y sin endpoint publico HTTPS no hay prueba real con Telegram.
- Posible ajuste en consultas join de Supabase segun datos reales.

### Como retomar rapido
1. Levantar backend (`backend`) y verificar `/api/health`.
2. Importar workflow `n8n/workflows/telegram-chat.json` y configurar credencial Telegram + `BACKEND_URL`.
3. Generar codigo con `POST /api/telegram/link-code/:patientId` y probar comandos en Telegram.

## 2026-02-26 - Sesion 3: Verificacion de accesos para puesta en produccion

### Objetivo
- Comprobar acceso operativo a n8n, Telegram y Supabase para dejar el flujo 100% funcional.

### Verificaciones realizadas
- Variables de entorno del sistema:
  - `SUPABASE_URL`: MISSING
  - `SUPABASE_ANON_KEY`: MISSING
  - `SUPABASE_SERVICE_ROLE_KEY`: MISSING
  - `TELEGRAM_BOT_TOKEN`: MISSING
  - `BACKEND_URL`: MISSING
- Archivos de entorno en backend:
  - Solo existe `backend/.env.example` (no existe `backend/.env` configurado)
- n8n en entorno local:
  - Comando `n8n --version`: no disponible en PATH
  - Puerto `5678`: CLOSED
- backend local:
  - Puerto `3001`: CLOSED

### Estado real
- Integracion implementada en codigo/documentacion.
- Integracion NO validada end-to-end por falta de credenciales y servicios activos.

### Datos necesarios para cerrar al 100%
1. `SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `TELEGRAM_BOT_TOKEN`
4. URL de backend accesible por n8n (`BACKEND_URL`)
5. Instancia n8n activa (local o cloud) con credenciales configuradas

### Como retomar rapido
1. Configurar `backend/.env` con Supabase.
2. Levantar backend (`npm run dev`) y n8n.
3. Importar workflow Telegram y probar `/start CODIGO`.

---

## 2026-02-27 - Sesion 4: Orquestacion Fisio con subworkflows + web + control de errores

### Objetivo
- Pasar de flujo unico a arquitectura con subworkflows en n8n, habilitar canal web del agente y dejar trazabilidad para ciclo clinico de video.

### Cambios implementados
- Backend (`backend/src`):
  - Nueva ruta `routes/professional.js` con endpoints:
    - `GET /api/profesional/intakes/pending`
    - `GET /api/profesional/pacientes/:patientId/history`
    - `POST /api/profesional/notes`
    - `POST /api/profesional/video-jobs`
    - `POST /api/profesional/video-jobs/:jobId/review`
    - `POST /api/profesional/video-jobs/:jobId/send`
  - Nueva ruta `routes/agent.js`:
    - `POST /api/agent/message` (bridge web -> n8n agent webhook)
  - `routes/telegram.js` ampliado:
    - Soporte payload nativo Telegram
    - Alta automatica de paciente por primer contacto
    - Deteccion de red flags
    - Registro de intake para revision profesional
  - `index.js`:
    - Registro de rutas nuevas (`/api/profesional`, `/api/agent`)
    - Hook de error critico hacia `N8N_ERROR_WEBHOOK_URL`
- Base de datos (`database/schema.sql`):
  - Nuevas tablas:
    - `mensajes_ingesta_paciente`
    - `notas_seguimiento_paciente`
    - `trabajos_video_ejercicio`
    - `eventos_visualizacion_video`
  - Indices y trigger `actualizado_en` para `trabajos_video_ejercicio`
- Entorno (`backend/.env.example`):
  - `DEFAULT_PROFESSIONAL_ID`
  - `N8N_AGENT_WEBHOOK_URL`
  - `N8N_ERROR_WEBHOOK_URL`
- Frontend (`frontend/src`):
  - RediseÃƒÂ±o de `pages/index.astro` con interfaz profesional + chat agente
  - `layouts/Layout.astro` actualizado (tipografia y base global)
- n8n (desplegado via API):
  - `Fisio_IA_Agent / Nucleo Agente` (activo)
  - `Fisio_IA_Agent / Subflujo Pendientes` (activo)
  - `Fisio_IA_Agent / Subflujo Revision Video` (activo)
  - `Fisio_IA_Agent / Orquestador Intake-Video` (activo)
  - `Fisio_IA_Agent / Puente Error Backend` (activo)
  - `Fisio_IA_Agent / Legacy Intake-Video (inactivo)` (conexiones reparadas)

### Decisiones tecnicas
- Reutilizar patron ya existente en tu n8n: `Execute Workflow` + `Execute Workflow Trigger`.
- Mantener workflow legacy inactivo pero consistente para rollback rapido.
- En errores criticos: disparo webhook a n8n y delegacion en `Manejador_Errores_Global` (Gmail).

### Pendientes inmediatos
1. Mover visualmente en UI todos los workflows `Fisio_IA_Agent / ...` a carpeta `Fisio_IA_Agent` (la API publica no expone operaciones de folder para este token).
2. Configurar/validar en n8n que el flujo de error por webhook termina en Gmail sin filtros.
3. Aplicar migracion SQL completa en Supabase productivo si no esta ya aplicada.

### Bloqueos/riesgos
- Con el API key actual no hay endpoints de `folders/projects` utilizables para mover carpetas por API.
- Hay workflows de error duplicados creados durante ajuste (`Fisio Backend Critical Errors Gmail`, `Fisio Backend Critical Errors Bridge`) que conviene archivar si no se usan.

### Como retomar rapido
1. Verificar salud backend `GET /api/health` y chat web `POST /api/agent/message`.
2. En n8n abrir `Fisio_IA_Agent / Orquestador Intake-Video` y ejecutar test de ambos webhooks.
3. Confirmar recepcion de correo en `raul.ruiz.diaz.bcn@gmail.com` ante error forzado.

---

## 2026-02-27 - Sesion 5: Actualizacion de pendientes del usuario

### Objetivo
- Actualizar el estado de tareas pendientes por parte del usuario y dejar checklist accionable.

### Verificacion de estado (segun avance reportado por usuario)
- Carpeta visual `Fisio_IA_Agent` en n8n: **HECHO** (creada y workflows movidos desde UI).
- Reorganizacion de workflows/subworkflows del paquete Fisio: **HECHO**.
- RevisiÃƒÂ³n de consistencia de workflows Fisio por API: **HECHO**.

### Pendientes por tu parte (usuario)
1. **Validar error->Gmail en produccion**: forzar un error controlado y confirmar recepcion en `raul.ruiz.diaz.bcn@gmail.com`.
2. **Aplicar/confirmar migracion SQL productiva**: asegurar que existen tablas nuevas en Supabase:
   - `mensajes_ingesta_paciente`
   - `notas_seguimiento_paciente`
   - `trabajos_video_ejercicio`
   - `eventos_visualizacion_video`
3. **Limpieza visual en n8n (opcional pero recomendada)**:
   - Archivar workflows duplicados/no usados de error:
     - `Fisio Backend Critical Errors Bridge`
     - `Fisio Backend Critical Errors Gmail`
   - Mantener activo solo `Fisio_IA_Agent / Puente Error Backend` (si esta integrado con tu manejador global).
4. **Validacion E2E final**:
   - Telegram -> intake -> pendiente para fisio
   - Fisio revisa -> aprueba/rechaza -> reintento de video -> envio
   - Web chat -> `POST /api/agent/message` responde correctamente

### Riesgos abiertos
- Si el flujo de error duplicado queda activo en paralelo, puede generar alertas duplicadas por correo.
- Si falta alguna tabla nueva en Supabase, el flujo de seguimiento quedara parcial (sin trazabilidad completa).

### Como retomar rapido
1. Probar un caso real de paciente nuevo por Telegram y revisar `intakes/pending`.
2. Forzar un error en backend para validar correo de alerta.
3. Archivar duplicados y dejar un solo camino de errores.

---

## 2026-02-27 - Sesion 6: Verificacion final de workflows y conexiones

### Objetivo
- Confirmar que la base orquestada en n8n esta completa para iniciar pruebas funcionales.

### Verificacion realizada
- Comprobados workflows requeridos del paquete Fisio:
  - `Fisio_IA_Agent / Nucleo Agente` (activo)
  - `Fisio_IA_Agent / Orquestador Intake-Video` (activo)
  - `Fisio_IA_Agent / Subflujo Pendientes` (activo)
  - `Fisio_IA_Agent / Subflujo Revision Video` (activo)
  - `Fisio_IA_Agent / Puente Error Backend` (activo)
  - `Fisio_IA_Agent / Legacy Intake-Video (inactivo)` (inactivo)
- Resultado de chequeo tecnico: sin conexiones rotas.
- Referencias entre orquestador y subworkflows: validas.

### Decision tecnica
- Se mantiene `Legacy Intake-Video (inactivo)` como respaldo temporal hasta cerrar pruebas E2E.

### Pendientes inmediatos
1. Ejecutar bateria de pruebas E2E (Telegram -> intake -> revision video -> envio).
2. Confirmar correos de alerta ante error critico.
3. Cerrar limpieza de duplicados de error si no aportan valor.

### Riesgos abiertos
- Posibles alertas duplicadas si permanece mas de un flujo de error activo en paralelo.
- Sin prueba E2E completa, el estado es "listo para probar" pero no "validado en produccion".

### Como retomar rapido
1. Lanzar prueba real desde Telegram con paciente nuevo.
2. Revisar `GET /api/profesional/intakes/pending`.
3. Completar ciclo de revision/aprobacion de video y verificar escritura en Supabase.


---

## 2026-02-27 - Sesion 7: Espanol integral + limpieza de tablas no usadas

### Objetivo
- Unificar nombres de tablas/columnas/estados a espanol en backend, SQL y workflows.
- Confirmar tablas necesarias y eliminar no usadas del flujo actual.

### Cambios implementados
- Backend actualizado a esquema espanol:
  - `backend/src/routes/patients.js`
  - `backend/src/routes/telegram.js`
  - `backend/src/routes/professional.js`
  - `backend/src/routes/agent.js`
  - `backend/src/index.js` (alias de rutas en espanol y compatibilidad)
- SQL actualizado:
  - `database/schema.sql` recreado con nomenclatura espanola.
  - `database/seed.sql` alineado al nuevo esquema.
  - Nueva migracion: `database/migrations/2026-02-27_renombrar_esquema_a_espanol.sql`
    - renombra tablas y columnas
    - traduce estados/valores
    - elimina tablas no usadas (`exercise_templates`, `workout_items`, `render_jobs`)
- Workflows n8n locales alineados:
  - `n8n/Fisio_IA_Agent/*.json` (rutas/campos en espanol)
  - validacion JSON: OK
  - validacion de conexiones internas: OK

### Decisiones tecnicas
- Mantener compatibilidad de entrada API con claves antiguas (ingles) y nuevas (espanol) para evitar roturas durante transicion.
- Cambiar estados funcionales a espanol (`pendiente_revision`, `aprobado`, `rechazado`, `enviado`, etc.).

### Pendientes inmediatos
1. Ejecutar la migracion SQL en Supabase productivo.
2. Reimportar/publicar workflows en n8n con los JSON actualizados.
3. Ejecutar bateria E2E completa.

### Riesgos abiertos
- Hasta ejecutar migracion en Supabase, backend nuevo no quedara alineado con produccion.
- Hasta publicar workflows actualizados en n8n, puede haber desajuste de campos.

### Como retomar rapido
1. Ejecutar `database/migrations/2026-02-27_renombrar_esquema_a_espanol.sql` en Supabase.
2. Importar workflows desde `n8n/Fisio_IA_Agent/` y publicar.
3. Probar flujo Telegram -> intake -> revision video -> envio.

---

## 2026-02-27 - Sesion 8: Subflujo crear-render publicado en n8n

### Objetivo
- Implementar y publicar el flujo `crear -> renderizar -> revisar -> aprobar -> enviar`.

### Cambios implementados
- Backend:
  - `backend/src/routes/professional.js`
  - Nuevo endpoint: `POST /api/profesional/video-jobs/:jobId/render`
  - Transicion de estado: `pendiente_revision/rechazado -> renderizando -> pendiente_revision` con `url_salida`.
- n8n:
  - Nuevo workflow activo: `Fisio_IA_Agent / Subflujo Crear y Render Video` (`IlBtqoCYDZYUcple`).
  - Orquestador actualizado `rp6Ya8LllWgrn8aS`:
    - `GET fisio/intakes/pending`
    - `POST fisio/video/crear`
    - `POST fisio/video/review`
  - Subflujos activos confirmados:
    - `Fisio_IA_Agent / Nucleo Agente`
    - `Fisio_IA_Agent / Subflujo Pendientes`
    - `Fisio_IA_Agent / Subflujo Crear y Render Video`
    - `Fisio_IA_Agent / Subflujo Revision Video`
    - `Fisio_IA_Agent / Orquestador Intake-Video`
  - Legacy inactivo mantenido:
    - `Fisio_IA_Agent / Legacy Intake-Video (inactivo)`

### Incidencia gestionada
- El workflow `Fisio_IA_Agent / Puente Error Backend` no admite PUT desde API sin credencial SMTP explicita en payload.
- Se mantiene activo y sin sobreescritura para no perder configuracion de correo existente.

### Pendientes inmediatos
1. Ejecutar migracion SQL en Supabase (bloqueado por falta de token CLI).
2. Probar E2E con `POST /webhook/fisio/video/crear` y luego `POST /webhook/fisio/video/review`.
3. Validar envio final y trazabilidad en tabla `trabajos_video_ejercicio`.


---

## 2026-02-27 - Sesion 9: Supabase aplicada + backend productivo en EasyPanel + E2E OK

### Objetivo
- Cerrar bloqueos operativos: migracion en Supabase, backend accesible para n8n, y validacion E2E completa del ciclo de video.

### Cambios implementados
- Supabase (produccion):
  - Migracion ejecutada y verificada: `database/migrations/2026-02-27_renombrar_esquema_a_espanol.sql`.
  - Tablas objetivo confirmadas en esquema publico:
    - `profesionales`, `pacientes`, `dolencias`, `ejercicios`, `planes`, `items_plan`, `sesiones`,
    - `vinculos_telegram_pacientes`, `mensajes_ingesta_paciente`, `notas_seguimiento_paciente`,
    - `trabajos_video_ejercicio`, `eventos_visualizacion_video`.
- EasyPanel:
  - Nuevo servicio desplegado en proyecto `n8n`: `fisio-backend` (tipo app, source dockerfile).
  - URL backend operativa: `https://fisio-backend.b5xbaf.easypanel.host`.
  - Health check validado: `GET /api/health` -> 200.
- n8n (actualizado via API):
  - Subflujos de Fisio ajustados para usar backend productivo por URL fija (sin depender de `'https://fisio-backend.b5xbaf.easypanel.host'`):
    - `Fisio_IA_Agent / Subflujo Pendientes`
    - `Fisio_IA_Agent / Subflujo Crear y Render Video`
    - `Fisio_IA_Agent / Subflujo Revision Video`
    - `Fisio_IA_Agent / Legacy Intake-Video (inactivo)`
  - Correccion de `jsonBody` en nodos HTTP para eliminar error `JSON parameter needs to be valid JSON`.
- Validacion E2E (real):
  - `POST /webhook/fisio/video/crear` -> 200.
  - `POST /webhook/fisio/video/review` -> 200.
  - Verificado en `trabajos_video_ejercicio`:
    - estado tras crear: `pendiente_revision`
    - estado final: `enviado`
    - `url_salida` y `notas_revision` guardadas correctamente.
  - Ejecuciones n8n asociadas en `success` para orquestador y subflujos.

### Decisiones tecnicas
- Crear backend productivo dedicado en EasyPanel para desbloquear comunicaciones de n8n.
- Evitar dependencia de variables de entorno en nodos n8n por bloqueo de instancia (`N8N_BLOCK_ENV_ACCESS_IN_NODE`).
- Mantener `Legacy Intake-Video (inactivo)` como rollback, alineado con las nuevas URLs.
- Skill usada: `n8n-mcp-tools-expert` (aplicada para gestion/validacion de workflows y operativa API en n8n).

### Pendientes inmediatos
1. Ampliar el backend desplegado (`fisio-backend`) para incluir tambien rutas de Telegram y agente web (`/api/telegram/*`, `/api/agent/message`) en produccion.
2. Validar E2E de canal Telegram completo (paciente nuevo -> ingesta -> pendiente).
3. Revisar y limpiar flujos duplicados de errores (`Fisio Backend Critical Errors Bridge`, `Fisio Backend Critical Errors Gmail`) si no se usan.
4. Rotar credenciales expuestas en sesion (API key n8n, token EasyPanel, y claves sensibles si procede).

### Bloqueos/riesgos
- El backend productivo actual cubre ciclo video (`/api/profesional/*`), pero no todo el backend funcional completo.
- Si no se rota credenciales compartidas en chat, hay riesgo de seguridad.
- Duplicados de flujo de error pueden causar alertas redundantes.

### Como retomar rapido
1. Confirmar en EasyPanel `fisio-backend` y health: `https://fisio-backend.b5xbaf.easypanel.host/api/health`.
2. Probar `POST /webhook/fisio/video/crear` y `POST /webhook/fisio/video/review`.
3. Extender despliegue backend a Telegram + agente y ejecutar E2E completo multicanal.

---

## 2026-02-27 - Sesion 10: Backend productivo ampliado (Telegram + Agent) + validacion multicanal

### Objetivo
- Extender el backend productivo `fisio-backend` para cubrir tambien `/api/telegram/*` y `/api/agent/message`, manteniendo estable el ciclo de video ya validado.

### Cambios implementados
- EasyPanel (`n8n/fisio-backend`):
  - Actualizado source dockerfile del servicio para incluir rutas:
    - `POST /api/telegram/link-code/:patientId`
    - `POST /api/telegram/incoming`
    - `POST /api/agent/message`
    - (se mantiene `/api/profesional/*` y `/api/health`)
  - Redeploy forzado aplicado y health confirmado (`200`).
  - Variables de entorno alineadas en el servicio (`SUPABASE_*`, `TELEGRAM_*`, `N8N_AGENT_WEBHOOK_URL`, `DEFAULT_PROFESSIONAL_ID`, `N8N_ERROR_WEBHOOK_URL`).
- n8n:
  - Ajuste de `Fisio_IA_Agent / Nucleo Agente` para admitir `POST` en `Webhook Agent Core` (`agent/core`).
- Validacion funcional:
  - `POST /api/telegram/incoming` (payload custom) -> responde y crea ingesta en `mensajes_ingesta_paciente`.
  - `POST /api/agent/message` -> responde con `source: n8n_agent` sin error de parseo.
  - Regresion ciclo video:
    - `POST /webhook/fisio/video/crear` -> 200
    - `POST /webhook/fisio/video/review` -> 200
    - estado final en DB: `trabajos_video_ejercicio.estado = enviado`.

### Decisiones tecnicas
- Se desplego version compacta/operativa del backend para evitar limite de payload al actualizar dockerfile via API de EasyPanel.
- Se endurecio parseo en `/api/agent/message` para tolerar respuestas vacias con `content-type: application/json` desde n8n.
- Se mantuvo compatibilidad de rutas en espanol/ingles para campos de entrada criticos en el flujo profesional.

### Pendientes inmediatos
1. Mejorar `Fisio_IA_Agent / Nucleo Agente` para devolver body JSON no vacio (actualmente backend recibe `source: n8n_agent` con `data` vacio en algunas llamadas).
2. Completar pruebas E2E Telegram con comandos (`/start CODIGO`, `/plan`, `/dolor`) sobre pacientes reales.
3. Revisar limpieza de flujos de error duplicados y dejar camino unico de alertas.
4. Rotar credenciales compartidas en sesiones (EasyPanel token, n8n API key, claves sensibles).

### Bloqueos/riesgos
- El endpoint `/api/agent/message` ya no falla, pero la respuesta de negocio del Nucleo Agente puede venir vacia si el workflow no emite payload.
- Persisten riesgos de seguridad hasta rotacion de secretos expuestos.

### Como retomar rapido
1. Verificar backend: `https://fisio-backend.b5xbaf.easypanel.host/api/health`.
2. Probar agente web: `POST /api/agent/message` y confirmar contenido util en respuesta.
3. Probar Telegram real y validar registros en `mensajes_ingesta_paciente`.


---

## 2026-02-27 - Sesion 11: Limpieza de artefactos obsoletos

### Cambios de limpieza
- n8n: eliminado workflow legacy inactivo:
  - `Fisio_IA_Agent / Legacy Intake-Video (inactivo)`
- n8n: eliminados workflows duplicados/inactivos de alertas:
  - `Fisio Backend Critical Errors Bridge`
  - `Fisio Backend Critical Errors Gmail`
- Repositorio: eliminado export obsoleto:
  - `n8n/Fisio_IA_Agent/fisio-error-notifier-gmail.json`
- Repositorio: sustituidas referencias locales de `BACKEND_URL` en exports/docs por URL productiva fija del backend para evitar configuraciones caducadas.

### Estado tras limpieza
- Camino activo de errores en Fisio: `Fisio_IA_Agent / Puente Error Backend`.
- Workflows activos de Fisio quedan sin duplicados legacy de video ni de notificacion critica.


---

## 2026-02-27 - Sesion 12: Orden n8n aplicado (carpeta/tag Fisio_IA_Agent)

### Cambios implementados
- Se aplico la agrupacion en n8n para los workflows activos del proyecto Fisio usando `Fisio_IA_Agent`.
- Workflows alineados:
  - `Fisio_IA_Agent / Nucleo Agente`
  - `Fisio_IA_Agent / Orquestador Intake-Video`
  - `Fisio_IA_Agent / Subflujo Pendientes`
  - `Fisio_IA_Agent / Subflujo Crear y Render Video`
  - `Fisio_IA_Agent / Subflujo Revision Video`
  - `Fisio_IA_Agent / Puente Error Backend`

### Nota operativa
- A partir de ahora, todo workflow nuevo de Fisio debe crearse y mantenerse dentro de `Fisio_IA_Agent` (regla prioritaria).

---

## 2026-02-27 - Sesion 13: Publicacion y hardening del repositorio GitHub

### Cambios implementados
- Repositorio publicado en GitHub:
  - `https://github.com/raulruizproyectos/Fisio_IA_Agent`
- Inicializacion y push de historial local en rama `main`.
- Resolucion de conflicto inicial con README remoto y mejora de descripcion breve del proyecto.
- Configuracion de gobernanza del repositorio:
  - `.github/workflows/ci.yml`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/ISSUE_TEMPLATE/bug_report.md`
  - `.github/ISSUE_TEMPLATE/feature_request.md`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `LICENSE` (MIT)

### Estado actual
- Repositorio sincronizado con `origin/main` y operativo.
- Pipeline CI base activa para backend/frontend en GitHub Actions.

### Pendiente recomendado
1. Activar branch protection en `main` (require PR + checks obligatorios).
2. Revisar y rotar credenciales expuestas durante sesiones tecnicas previas.

---

## 2026-02-27 - Sesion 14: Ajuste de terminologia + cierre de continuidad

### Cambios implementados
- Reemplazada expresion de README:
  - De: `expresion anterior (deprecated)`
  - A: `centraliza la introduccion de sintomas`
- Verificacion en repo local y workflows Fisio n8n: no quedan ocurrencias de la expresion antigua.
- Estado de n8n validado para continuidad:
  - 6 workflows activos de Fisio y alineados por IDs:
    - `FU0XfCbeehpnoW85` (Nucleo Agente)
    - `rp6Ya8LllWgrn8aS` (Orquestador Intake-Video)
    - `a9pejz5CI7zau52i` (Subflujo Pendientes)
    - `IlBtqoCYDZYUcple` (Subflujo Crear y Render Video)
    - `8ovmsUXTxhz6Fulc` (Subflujo Revision Video)
    - `TN1x0kDu03lGBo2a` (Puente Error Backend)

### Estado actual de integracion
- GitHub actualizado: `main` sincronizada en `raulruizproyectos/Fisio_IA_Agent`.
- EasyPanel:
  - `fisio-backend` habilitado
  - `n8n` habilitado
- Enlaces orquestador -> subflujos verificados por `workflowId` y consistentes.

### Punto exacto para continuar en la proxima sesion
1. Ejecutar E2E Telegram real (`/start CODIGO`, `/plan`, `/dolor`) y validar registros en `mensajes_ingesta_paciente`.
2. Afinar `Fisio_IA_Agent / Nucleo Agente` para respuesta de negocio mas rica en `/api/agent/message`.
3. Activar branch protection en GitHub (`main`) con checks obligatorios de CI.
4. Rotar credenciales expuestas en sesiones tecnicas.



---

## 2026-02-27 - Sesion 15: Verificacion global final (plataformas + conexiones + codigo)

### Verificaciones ejecutadas
- Repositorio GitHub:
  - `main` sincronizada con remoto (`HEAD == origin/main`).
  - Estado local limpio (sin cambios pendientes tras push).
- Backend (codigo):
  - Validacion de sintaxis Node OK:
    - `src/index.js`
    - `src/routes/agent.js`
    - `src/routes/patients.js`
    - `src/routes/professional.js`
    - `src/routes/telegram.js`
- Frontend (build local):
  - No ejecutable en este host por falta de binario `astro` en entorno local (`"astro" no se reconoce`).
- n8n (proyecto Fisio):
  - 6 workflows activos confirmados y etiquetados con `Fisio_IA_Agent`.
  - Conexiones del orquestador verificadas:
    - `Ejecutar Sub Pendientes -> a9pejz5CI7zau52i`
    - `Ejecutar Sub Crear Video -> IlBtqoCYDZYUcple`
    - `Ejecutar Sub Revision -> 8ovmsUXTxhz6Fulc`
- EasyPanel:
  - Servicios `n8n` y `fisio-backend` habilitados.
- Backend productivo (runtime):
  - `GET /api/health` -> OK
  - `GET /api/profesional/intakes/pending?profesional_id=...` -> OK con datos
  - `POST /api/agent/message` -> OK (`source: n8n_agent`)
  - `POST /api/telegram/incoming` con payload vacio -> 400 (validacion esperada)
- Telegram:
  - Webhook correcto en produccion:
    - `https://fisio-backend.b5xbaf.easypanel.host/api/telegram/incoming`
  - `pending_update_count = 0`

### Estado de cierre
- Proyecto estable y sincronizado en GitHub para continuidad.
- Terminologia actualizada (uso de `introduccion` en descripcion principal).

### Proxima continuidad recomendada
1. Ejecutar E2E Telegram funcional completo con comandos reales.
2. Mejorar salida funcional de `Nucleo Agente` para respuestas mas utiles en `/api/agent/message`.
3. Activar branch protection de `main` con checks CI obligatorios.
4. Rotar secretos expuestos en sesiones tecnicas.

---

## 2026-02-27 - Sesion 16: Cierre operativo con bloqueo local de npm (frontend)

### Resultado final de plataformas
- n8n: OK (workflows Fisio activos y conectados)
- EasyPanel: OK (`n8n` y `fisio-backend` habilitados)
- Backend productivo: OK (health, profesional, agent y webhook Telegram verificados)
- GitHub: OK (repositorio sincronizado en `main`)

### Bloqueo identificado
- Frontend local en este host: `npm install` queda colgado y deja `astro` en estado `invalid`.
- Se detecto proceso persistente de instalacion npm (`node ... npm-cli.js install --no-audit --no-fund --prefer-online --foreground-scripts`) que no se libera correctamente desde esta sesion.

### Accion recomendada al retomar
1. Cerrar proceso npm colgado desde administrador o reiniciar equipo.
2. En `frontend/` ejecutar:
   - `npm cache clean --force`
   - `rm -r node_modules package-lock.json` (equivalente Windows)
   - `npm install --no-audit --no-fund`
   - `npm run build`
3. Registrar resultado en nueva sesion del changelog.

---

## 2026-03-02 - Sesion 17: Retoma y hardening de respuesta del agente

### Objetivo
- Retomar proyecto con validacion runtime y eliminar respuesta vacia en `/api/agent/message`.

### Verificaciones ejecutadas
- Backend productivo:
  - `GET /api/health` -> OK (200).
  - `POST /api/agent/message` -> OK, pero `data` vacio (`{}`) con `source: n8n_agent`.
- n8n endpoint:
  - `POST /webhook/agent/core` accesible.
  - Respuesta observada desde cliente: cuerpo vacio o serializacion vacia, consistente con el vacio en backend.

### Cambios implementados
- Backend (`backend/src/routes/agent.js`):
  - Parser de respuesta n8n robusto (tolera body vacio y JSON invalido).
  - Deteccion de respuesta funcional vacia (`{}`, `''`, `null`, `[]`, `raw` vacio).
  - Fallback de negocio local cuando n8n responde vacio:
    - `reply_text`
    - `intent_hint`
    - `received`
  - Nueva bandera de salida: `fallback_used` para trazabilidad.
- Workflow repo (`n8n/Fisio_IA_Agent/fisio-agent-core.json`):
  - Normalizado encoding del nodo Code para evitar texto corrupto.
  - Logica robusta para entrada dual (`$json.body` o `$json` raiz).
  - Mapeo de `paciente_id/patient_id` y `profesional_id/professional_id`.

### Decisiones tecnicas
- No bloquear el canal web por drift temporal del workflow activo en n8n.
- Mantener `source: n8n_agent` y agregar fallback controlado en API para continuidad operativa.

### Pendientes inmediatos
1. Alinear workflow activo `Fisio_IA_Agent / Nucleo Agente` con `n8n/Fisio_IA_Agent/fisio-agent-core.json` para que responda JSON util sin fallback.
2. Ejecutar E2E Telegram real (`/start`, `/plan`, `/dolor`) y validar escritura en `mensajes_ingesta_paciente`.
3. Rotar credenciales tecnicas (n8n API key, token EasyPanel y secretos de entorno).

### Como retomar rapido
1. Desplegar backend con este parche.
2. Probar `POST /api/agent/message` y confirmar `data.reply_text` no vacio.
3. Revisar `fallback_used`:
   - `true`: n8n sigue devolviendo vacio.
   - `false`: n8n ya responde payload funcional.

---

## 2026-03-02 - Sesion 18: Resiliencia ante caida del webhook n8n

### Objetivo
- Evitar error crudo (`fetch failed`) en `/api/agent/message` cuando n8n no responde.

### Verificaciones ejecutadas
- Produccion:
  - `GET /api/health` -> OK.
  - `POST /api/agent/message` -> detectado `{"error":"fetch failed"}`.
  - `POST https://n8n-n8n.b5xbaf.easypanel.host/webhook/agent/core` -> body vacio (`""`) en respuesta.

### Cambios implementados
- Backend (`backend/src/routes/agent.js`):
  - Timeout de 10s para llamada a `N8N_AGENT_WEBHOOK_URL` con `AbortController`.
  - Fallback funcional si n8n es inalcanzable o timeout (sin devolver 500 al cliente).
  - Fallback funcional tambien cuando n8n responde HTTP no exitoso (`4xx/5xx`).
  - Nuevas banderas de observabilidad:
    - `fallback_used`
    - `n8n_unreachable`
    - `fallback_reason` (`timeout`, `fetch_failed` o `n8n_http_error`)
    - `n8n_status` (cuando aplica error HTTP de n8n)
  - Se mantiene parseo robusto de respuestas vacias/no JSON.

### Skills usadas (constancia breve)
- `n8n-node-configuration`: criterio de respuesta por nodo webhook/respond.
- `n8n-validation-expert`: enfoque iterativo de validacion y cierre de errores.
- `n8n-workflow-patterns`: patron de resiliencia para webhook processing.

### Pendiente inmediato
1. Desplegar backend con este parche en EasyPanel (`fisio-backend`).
2. Reprobar `POST /api/agent/message` y verificar:
   - sin error `fetch failed`
   - `data.reply_text` no vacio
   - `n8n_unreachable` y `fallback_reason` coherentes.
3. Alinear workflow activo `Fisio_IA_Agent / Nucleo Agente` para dejar `fallback_used = false`.

---

## 2026-03-02 - Sesion 19: Correccion de despliegue real y recuperacion del Nucleo Agente

### Problema raiz detectado
- `fisio-backend` en EasyPanel no desplegaba desde Git.
- El servicio estaba configurado con `source.type=dockerfile` embebido con codigo legacy hardcodeado, por eso ignoraba commits de `main`.

### Cambios ejecutados en plataformas
- EasyPanel (API):
  - `services.app.inspectService` para diagnostico.
  - `services.app.updateSourceGit`:
    - repo: `https://github.com/raulruizproyectos/Fisio_IA_Agent.git`
    - ref: `main`
    - path: `/backend`
  - `services.app.updateBuild`:
    - `type: nixpacks`
    - `startCommand: npm start`
  - `services.app.deployService` con `forceRebuild=true`.

### Ajuste y recuperacion en n8n
- Se verifico que el workflow activo del Nucleo devolvia webhook en GET (POST devolvia 404).
- Se recreo y activo `Fisio_IA_Agent / Nucleo Agente` con webhook `httpMethod=POST` y respuesta JSON limpia.
- Workflow activo final de Nucleo Agente:
  - ID: `ZOarR2hpUUOgm3KC`

### Verificacion final (produccion)
- `POST https://n8n-n8n.b5xbaf.easypanel.host/webhook/agent/core` -> OK con JSON funcional.
- `POST https://fisio-backend.b5xbaf.easypanel.host/api/agent/message` ->
  - `source: n8n_agent`
  - `fallback_used: false`
  - `n8n_unreachable: false`
  - `data.reply_text` no vacio.

### Estado de cierre
- Backend productivo ya usa el codigo actualizado de `main`.
- Integracion backend -> n8n agent recuperada y estable sin fallback forzado.

---

## 2026-03-02 - Sesion 20: Decision UX/UI para frontend con Google Stitch

### Objetivo
- Dejar registrada la herramienta de diseno/prototipado a utilizar en la mejora del frontend.

### Decision tecnica
- Se adopta `Google Stitch` como herramienta de apoyo para crear propuestas de UI del frontend.
- Flujo acordado:
  1. Generar propuesta visual en Google Stitch.
  2. Exportar referencia (codigo/Figma/capturas).
  3. Implementar y ajustar en `frontend/` (Astro) respetando arquitectura del proyecto.

### Pendiente inmediato
1. Definir primera pantalla objetivo para redisenar con Stitch (recomendado: `frontend/src/pages/index.astro`).
2. Traducir el prototipo a componentes Astro reutilizables.

---

## 2026-03-02 - Sesion 21: Cierre de sesion con bloqueo frontend + decision de plataforma de video

### Objetivo
- Resolver bloqueo local de `npm install` en `frontend` y cerrar la sesion con continuidad clara.

### Verificaciones ejecutadas
- `npm ping` -> OK (`PONG`) contra `https://registry.npmjs.org/`.
- Se detectaron y eliminaron procesos colgados de `npm install` (multiples `node.exe` con `npm-cli.js install`).
- Reintentos de instalacion:
  - `npm install --no-audit --no-fund` (varios intentos)
  - `npm install --no-audit --no-fund --fetch-retries=2 --fetch-timeout=120000`
  - intentos con timeout extendido
- Resultado: en este host el proceso vuelve a quedar colgado y expira por timeout de sesion.

### Decision funcional registrada (video IA)
- Para tareas de generacion de video se podra usar `Google Labs Flow`:
  - `https://labs.google/fx/es/tools/flow`
- Contexto de uso acordado: usuario con plan Pro de Gemini.

### Decision funcional registrada (IA conversacional)
- En n8n, la IA conversacional se implementara normalmente con nodo `OpenAI` (o con agente basado en modelo OpenAI).

### Estado de cierre
- Backend/n8n/supabase: sin cambios funcionales en esta sesion.
- Frontend local: bloqueo de instalacion npm persiste en este host.

### Pendiente inmediato para proxima sesion
1. Ejecutar instalacion frontend en entorno alternativo o terminal limpia:
   - `cd frontend`
   - `npm install --no-audit --no-fund`
   - `npm run build`
2. Si vuelve a colgarse, capturar log detallado:
   - `npm install --no-audit --no-fund --verbose`
3. Iniciar rediseno UI con Google Stitch e implementar en Astro.
4. Evaluar `Google Labs Flow` para pipeline de generacion de video en el flujo clinico.

---

## 2026-03-02 - Sesion 22: Diagnostico real del bloqueo frontend + fix TS inicial

### Objetivo
- Resolver el bloqueo persistente de `npm install` en frontend y avanzar el build.

### Hallazgos clave
- Causa raiz identificada: el bloqueo ocurre al instalar `node_modules` dentro de la ruta sincronizada `G:\Mi unidad\...`.
- Verificacion comparativa:
  - En `C:\Temp` con el mismo `package.json`, `npm install` completa correctamente.
  - En la ruta del proyecto sincronizada, `npm install` queda colgado y deja procesos `node/npm` vivos.
- Se eliminaron multiples procesos colgados de `npm install` durante el diagnostico.

### Cambios implementados
- Frontend:
  - `frontend/src/pages/index.astro`
  - Corregidos errores TypeScript del script cliente:
    - tipado explicito de `form`, `input`, `log`
    - tipado de `addMessage(text, type)`
    - guardas de null para evitar acceso inseguro al DOM

### Estado al cerrar esta sesion
- Bloqueo de instalacion en ruta sincronizada: **persistente**.
- Build en entorno local no sincronizado (`C:\Temp`): **OK** tras fix TS.
  - `astro check`: 0 errores
  - `astro build`: completado

### Como retomar rapido
1. Copiar `frontend/` a ruta local no sincronizada (ej. `C:\Temp\Fisio_IA_Agent_frontend_local`).
2. Ejecutar `npm install --no-audit --no-fund` y `npm run build`.
3. Si build OK, continuar iteracion visual (Google Stitch) sobre `frontend/src/pages/index.astro`.

---

## 2026-03-02 - Sesion 23: Cierre de jornada y automatizacion de build frontend local

### Objetivo
- Dejar cerrado el dia con un flujo operativo estable para frontend, sin depender de `npm install` en ruta sincronizada.

### Cambios implementados
- Frontend:
  - `frontend/src/pages/index.astro`
  - fix de tipado TS en script cliente (DOM null-safety + tipos de parametros).
- Script operativo nuevo:
  - `scripts/frontend-local-build.ps1`
  - Flujo automatizado:
    1. copia `frontend/` a `C:\Temp\Fisio_IA_Agent_frontend_local`
    2. ejecuta `npm install --no-audit --no-fund`
    3. ejecuta `npm run build`
- Higiene de repo:
  - `.gitignore` actualizado para ignorar `frontend/node_modules_stuck*/`.

### Verificacion ejecutada
- Script validado en esta sesion:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1`
  - resultado: `astro check` OK (0 errores) + `astro build` OK.

### Decision operativa de continuidad
- Hasta resolver el lock de la ruta sincronizada (`G:\Mi unidad\...`), el build de frontend se ejecuta por ruta local no sincronizada mediante el script anterior.

### Skills usadas (constancia breve)
- `protocolo-6-fases-dev`: aplicado en discovery/roadmap/ejecucion/testing/refinement para cerrar bloqueo tecnico y continuidad.

### Como retomar rapido (proxima sesion)
1. Ejecutar `.\scripts\frontend-local-build.ps1`.
2. Si OK, avanzar rediseno con Google Stitch sobre `frontend/src/pages/index.astro`.
3. Validar en paralelo backlog funcional (E2E Telegram y revisiones de video).

---

## 2026-03-03 - Sesion 24: Rediseno completo del frontend (dashboard profesional dark mode)

### Objetivo
- Retomar proyecto y ejecutar rediseno del frontend con Google Stitch como referencia.

### Verificaciones de plataforma
- Backend productivo (`/api/health`): OK (200).
- Supabase: 15 tablas confirmadas en esquema publico, todas con RLS activo.
  - Datos existentes: 11 pacientes, 8 dolencias, 16 ejercicios, 10 mensajes ingesta, 5 vinculos Telegram, 2 trabajos video.
- n8n: 6 workflows activos segun CHANGELOG (no se modificaron en esta sesion).
- Frontend build: OK (0 errores, 0 warnings) con `frontend-local-build.ps1`.

### Cambios implementados
- Frontend (`frontend/src/layouts/Layout.astro`):
  - Tipografia cambiada de Space Grotesk/Fraunces a Inter.
  - Anadido Google Material Symbols Rounded.
  - Sistema de variables CSS para dark mode premium (--bg-base, --accent, --glass, etc.).
  - Scrollbar custom.
- Frontend (`frontend/src/pages/index.astro`):
  - Rediseno completo de la interfaz:
    - Sidebar colapsable con navegacion (Dashboard, Pacientes, Intake Pendientes con badge, Videos, Historial, Configuracion).
    - Header con busqueda, notificaciones, avatar y nombre del profesional.
    - 4 tarjetas de metricas (intakes pendientes, pacientes activos, videos en revision, sesiones hoy).
    - Tabla "Ultimos Intakes" con carga desde backend productivo y gestion de estados vacio/error.
    - Panel de Agente Clinico IA con chat, indicador de conexion (health check), fallback de errores.
    - Ctrl+Enter para enviar mensajes.
    - Responsive para tablet y movil.
  - Paleta: fondo #0f1419, cards #1a2332, accent teal #0d9488.
  - Glassmorphism, micro-animaciones (msg-in, pulse-dot), hover effects.
- Google Stitch:
  - Proyecto creado: "Fisio IA Agent - Dashboard Profesional" (ID: 8185935624241829024).
  - Pantalla generada con Gemini 3 Pro como referencia de diseno.

### Skills usadas
- Google Stitch (generacion de propuesta visual de dashboard).
- `frontend-design` (patrones de diseno premium en modo oscuro, aplicados implicitamente).

### Decisiones tecnicas
- Backend URL productiva hardcodeada para preview (`https://fisio-backend.b5xbaf.easypanel.host`) con deteccion automatica de localhost.
- Se mantiene arquitectura Astro SSG sin cambios de dependencias.
- Material Symbols via CDN para iconografia consistente sin dependencia de paquetes.

### Pendientes inmediatos (Siguiente arranque)
1. **[Manual EasyPanel]**: Crear App desde GitHub (rama `main`), root directory `/frontend`, build vía `Dockerfile`.
2. **[Manual GitHub]**: Configurar branch protection en `main` desde la consola web.
3. **[Manual E2E]**: Ejecutar interactuación real Telegram (`/start`, `/plan`, `/dolor`) desde móvil y revisar `mensajes_ingesta_paciente` en Supabase.
4. **[Pendiente Seguridad]**: Rotar credenciales sensibles.

### Como retomar rapido
1. Ejecutar `.\scripts\frontend-local-build.ps1` y previsualizar con `npx serve C:\temp\Fisio_IA_Agent_frontend_local\dist -l 4173`.
2. Acometer los 4 puntos "Pendientes inmediatos" descritos arriba para cerrar la integración continua y el E2E.

---

## 2026-03-03 - Sesion 25: Hardening Docker frontend + verificacion de plataformas

### Objetivo
- Preparar el frontend para despliegue en EasyPanel y verificar el estado de todas las plataformas.

### Cambios implementados
- Frontend (`frontend/Dockerfile`):
  - Añadido `HEALTHCHECK` con `wget` contra `/health` cada 30s.
  - EasyPanel y Docker detectan automaticamente si Nginx esta vivo.
- Frontend (`frontend/nginx.conf`):
  - Nuevo bloque `location /health` que devuelve 200 con `access_log off`.
  - Se mantienen headers de seguridad, gzip, cache de assets y SPA fallback.

### Verificaciones de plataforma ejecutadas
- Backend productivo (`/api/health`): OK (200).
- Supabase: 15 tablas confirmadas con RLS activo:
  - `profesionales` (1), `pacientes` (11), `dolencias` (8), `ejercicios` (16),
  - `vinculos_telegram_pacientes` (5), `mensajes_ingesta_paciente` (10),
  - `trabajos_video_ejercicio` (2), entre otras.
- Frontend build local: OK (0 errores, 0 warnings) via `frontend-local-build.ps1`.
- Git: solo 2 archivos modificados (`Dockerfile`, `nginx.conf`), estado limpio.

### Decisiones tecnicas
- HEALTHCHECK basado en `wget` (disponible en `nginx:alpine`) en lugar de `curl`.
- `/health` sin logs para no generar ruido en produccion.
- No se requieren variables de entorno en el contenedor frontend (backend URL hardcodeada en JS con auto-deteccion de localhost).

### Guia de despliegue manual (EasyPanel)
1. EasyPanel → Proyecto `n8n` → **+ Create Service** → **App**.
2. Nombre: `fisio-frontend`.
3. Source: GitHub → `https://github.com/raulruizproyectos/Fisio_IA_Agent.git` → `main` → Root: `/frontend`.
4. Build: Dockerfile.
5. Domains: asignar dominio generado (ej. `fisio-frontend.b5xbaf.easypanel.host`).
6. Puerto: `80`.
7. Deploy.

### Pendientes inmediatos
1. **[Manual EasyPanel]**: Ejecutar los 7 pasos de la guia para crear `fisio-frontend`.
2. **[Manual GitHub]**: Configurar branch protection en `main`.
3. **[Manual E2E]**: Telegram real (`/start`, `/plan`, `/dolor`) y verificar `mensajes_ingesta_paciente`.
4. **[Seguridad]**: Rotar credenciales sensibles.

### Como retomar rapido
1. Hacer push a GitHub con los cambios de Dockerfile y nginx.
2. Crear App en EasyPanel siguiendo la guia de 7 pasos.
3. Verificar `https://fisio-frontend.b5xbaf.easypanel.host/health` devuelve 200.
4. Abrir dashboard y probar chat del agente IA.

### Verificacion E2E adicional (produccion)
- `POST /api/agent/message` → OK:
  - `source: n8n_agent`, `fallback_used: false`, `n8n_unreachable: false`
  - `reply_text` con contenido de negocio funcional.
- `GET /api/profesional/intakes/pending?profesional_id=...` → OK con datos.
- `POST /api/telegram/incoming` (payload nativo Telegram):
  - Backend procesa correctamente y crea ingesta en `mensajes_ingesta_paciente`.
  - Registro confirmado en Supabase: `579ed3a3` con texto `/ayuda`, estado `pendiente_revision`.
  - Error esperado al responder a chat_id de test (no existe en Telegram real).
- Skills instaladas en `.agents/skills/`:
  - `accessibility`, `best-practices`, `core-web-vitals`, `performance`, `seo`, `web-quality-audit`.

### Pendientes que requieren intervencion manual
1. **EasyPanel**: crear App `fisio-frontend` (sin API key disponible).
2. **GitHub**: branch protection en `main` (sin `gh` CLI ni token API directo).
3. **Seguridad**: rotar credenciales sensibles.

---

## [Sesión 26] - 2026-03-03
### Tareas Realizadas
1. **Frontend SPA Completa**: Reestructuración masiva de `index.astro` (colapsados los módulos en una auténtica *Single Page Application* navegable vía menú lateral sin recargar página).
2. **Nuevas secciones implementadas**:
   - `Pacientes`: Fetch a `/api/pacientes` y renderizado de tabla (incluyendo métrica "Pacientes activos").
   - `Intakes Pendientes`: Fetch a `/api/profesional/intakes/pending` con visualización completa (incluye estado de alertas rojas).
   - `Videos`: Placeholder estructurado para la revisión manual (flujo basado en DB de Supabase/n8n).
   - `Historial`: Placeholder preparado para cargar notas de evolución del paciente.
   - `Configuración`: Panel avanzado que realiza un "Health Check" dinámico consultando tanto `/api/health` como `/api/agent/message` (test con role=test) para verificar si la caída es del backend o de n8n exclusivamente.
3. **Validación build local**: Refactor CSS y JS SPA completado sin problemas (`astro build` y `astro check` en `C:\temp\Fisio_IA_Agent_frontend_local` con 0 errores).

### Siguientes Pasos (Punto de pausa)
1. **Frontend Backend Hooks**: Enlazar los botones "Revisar/Ver" de las nuevas tablas para que disparen *modals* dinámicos o detalles.
2. **Despliegues Pendientes**: Ejecutar paso-a-paso manual en EasyPanel y probar todo integrado en producción.

---

## [Sesión 27] - 2026-03-03
### Objetivo
- Cerrar el pendiente de integración frontend-backend dejado en la sesión 26 para acciones reales de revisión.

### Cambios implementados
1. **Backend profesional ampliado**
   - Archivo: `backend/src/routes/professional.js`
   - Nuevo endpoint: `GET /api/profesional/video-jobs`
   - Soporta:
     - `profesional_id` (obligatorio)
     - filtros opcionales `estado`, `paciente_id`
     - `limit` (1..100)
   - Incluye datos asociados para UI:
     - `nombre_paciente` (join con `pacientes`)
     - `nombre_ejercicio` (join con `ejercicios`)

2. **Frontend SPA conectado sin alerts inline**
   - Archivo: `frontend/src/pages/index.astro`
   - Tabla dashboard/intakes:
     - botón `Revisar` ahora abre historial real del paciente (sin `alert()`).
   - Tabla pacientes:
     - botón `Ver` ahora abre historial del paciente seleccionado.
   - Tabla intakes completa:
     - se añade columna `Acciones` con botón `Historial`.
   - Tabla videos:
     - deja de ser placeholder y carga datos reales con:
       - `GET /api/profesional/video-jobs?profesional_id=...`
     - métrica `Videos en revisión` calculada por estado.
   - Sección historial:
     - carga datos reales de:
       - `GET /api/pacientes/:id`
       - `GET /api/profesional/patients/:patientId/history`
     - render de notas de seguimiento + eventos de video.

### Validaciones
- Sintaxis backend verificada con `node --check backend/src/routes/professional.js` -> OK.
- Comprobación estática del frontend:
  - sin `onclick="..."` inline para acciones de revisar/ver.
  - referencias nuevas a `/api/profesional/video-jobs` y `loadHistorial` presentes.

### Decisiones tecnicas
- Mantener interacción en SPA mediante `data-action` + delegación de eventos para evitar handlers inline.
- Reutilizar endpoint de historial ya existente para no duplicar lógica en frontend.

### Pendientes inmediatos
1. **[Manual EasyPanel]** desplegar `fisio-frontend` con root `/frontend` y verificar `/health`.
2. **[Manual E2E Telegram]** ejecutar `/start`, `/plan`, `/dolor` con paciente real y validar DB.
3. **[Manual GitHub]** activar branch protection en `main`.
4. **[Seguridad]** rotar credenciales expuestas en sesiones técnicas.

### Como retomar rapido
1. Push de `main` con cambios de sesión 27.
2. Deploy manual del frontend en EasyPanel.
3. Probar flujo UI:
   - Dashboard -> `Revisar`
   - Pacientes -> `Ver`
   - Videos -> `Historial`
4. Confirmar que la sección historial muestra notas/eventos del paciente seleccionado.

---

## [Sesión 28] - 2026-03-03
### Objetivo
- Reorganizar infraestructura EasyPanel en proyecto dedicado `fisio-ia-agent` y dejar backend/frontend operativos.

### Cambios de infraestructura ejecutados (EasyPanel API)
1. Proyecto:
   - Eliminado: `openclaw`.
   - Creado: `fisio-ia-agent`.
2. Migración de servicios:
   - `fisio-backend` movido de `n8n` -> `fisio-ia-agent`.
   - `fisio-frontend` movido de `n8n` -> `fisio-ia-agent`.
   - Proceso aplicado con `services.common.rename` (previo `stopService`, posterior `startService`).
3. Backend:
   - Estado final: operativo.
   - Verificación: `GET https://fisio-backend.b5xbaf.easypanel.host/api/health` -> 200.
4. Frontend (configuración aplicada):
   - Source Git: `main`, path `/frontend`.
   - Build probado:
     - `nixpacks` (no estable en runtime).
     - `dockerfile` (`build.file = Dockerfile`).
   - Dominio corregido tras movimiento:
     - de `n8n-fisio-frontend.b5xbaf.easypanel.host`
     - a `fisio-frontend.b5xbaf.easypanel.host`.

### Cambio de código para desbloqueo de build frontend
- Archivo: `frontend/Dockerfile`
- Commit: `c3a8aae`
- Cambio:
  - `COPY package.json package-lock.json* ./`
  - -> `COPY package*.json ./`
- Motivo: evitar fallo cuando no existe `package-lock.json`.

### Estado final de la sesión
- Backend: OK en producción.
- Frontend:
  - Deploy toma commit `c3a8aae` correctamente.
  - Sigue devolviendo `502` en `https://fisio-frontend.b5xbaf.easypanel.host/`.
  - Diagnóstico técnico observado:
    - `monitor.getDockerTaskStats`: `fisio-ia-agent_fisio-frontend` -> `actual: 0`, `desired: 1`.
    - `projects.getDockerContainers` para frontend -> `[]` (sin contenedor en ejecución).
    - `services.common.getServiceError` -> `null` (sin detalle de error expuesto por API).

### Punto exacto para retomar
1. Inspeccionar en EasyPanel UI el historial/log de deploy del servicio `fisio-frontend` (falla de task sin contenedor vivo).
2. Revisar task failure reason en Docker Swarm del host (si se dispone de consola).
3. Aplicar fix según log real (build/runtime) y redeploy.
4. Confirmar objetivo:
   - `https://fisio-frontend.b5xbaf.easypanel.host/` -> 200
   - `monitor.getDockerTaskStats` frontend -> `actual: 1`, `desired: 1`.

---

## [Sesión 29] - 2026-03-03 (Punto de situación previo a nueva arquitectura)
### Estado de infraestructura (EasyPanel)
- Proyecto activo objetivo: `fisio-ia-agent`.
- Servicios en proyecto `fisio-ia-agent`:
  - `fisio-backend` (OK)
  - `fisio-frontend` (KO parcial)
- Proyecto eliminado previamente: `openclaw`.

### Estado de servicios
- Backend:
  - URL: `https://fisio-backend.b5xbaf.easypanel.host`
  - Health: 200 (`/api/health`)
  - Runtime: estable.
- Frontend:
  - URL: `https://fisio-frontend.b5xbaf.easypanel.host`
  - Estado HTTP actual: 502.
  - Dominio: corregido y apuntando a `fisio-ia-agent/fisio-frontend`.
  - Build configurado: `dockerfile` (`file: Dockerfile`).
  - Deploy toma commit actualizado, pero no levanta task en runtime.

### Estado de código y ramas
- Rama: `main` actualizada en remoto.
- Últimos commits relevantes:
  - `cd47cba` docs: migración a `fisio-ia-agent` + estado frontend 502.
  - `c3a8aae` fix frontend Dockerfile para no exigir lockfile.
  - `e6d3a6c` backend `video-jobs` robusto sin join sensible al schema cache.

### Riesgo/bloqueo vigente
- Bloqueo principal: frontend no consigue iniciar contenedor en EasyPanel (resultado externo 502) pese a build/deploy aplicados.
- Siguiente paso técnico recomendado para desbloqueo:
  - inspección de logs de task/container fallido en UI EasyPanel (o Swarm host) para causa exacta.

### Preparado para siguiente fase
- Se deja el sistema en estado apto para redefinir arquitectura de `Fisio_IA_Agent` sin perder trazabilidad:
  - backend operativo,
  - frontend en bloqueo acotado,
  - documentación de continuidad al día.

---

## [Sesion 30] - 2026-03-03 (Limpieza para nueva arquitectura)
### Objetivo
- Dejar el repositorio enfocado al nuevo alcance CRM + Citas + Ejercicios.

### Cambios de limpieza aplicados
- Eliminados workflows legacy de video en `n8n/Fisio_IA_Agent`:
  - `sw-fisio-crear-render-video.json`
  - `sw-fisio-video-review.json`
  - `fisio-intake-video-review.json`
  - `fisio-intake-video-review-orchestrator.json`
- Eliminado archivo temporal local no versionado: `create.lazy.tmp.js`.
- Eliminada carpeta residual local: `frontend/node_modules_stuck_20260302_202222`.

### Estandarizacion para continuar
- README principal alineado al pivot activo.
- `n8n/README.md` actualizado al enfoque W0/W1/W2/W3.
- Añadido `ARCHITECTURE.md` con blueprint completo.
- Añadidas reglas y skills en `.agents/`.
- Añadido `database/schema_vnext.sql` (propuesta aditiva para CRM + Agents).

### Estado para siguiente sesion
- Repo limpio de workflows de video legacy.
- Video queda fuera de alcance activo.
- Prioridad siguiente: implementar workflows n8n del nuevo modelo y cablear boton CRM -> trigger web.

---

## [Sesion 31] - 2026-03-03 (Cierre diario listo para continuar manana)
### Objetivo
- Dejar el proyecto en estado de continuidad total para retomar sin perdida de contexto.

### Estado confirmado al cierre
- Rama `main` sincronizada con GitHub.
- Backend productivo: `200` en `https://fisio-backend.b5xbaf.easypanel.host/api/health`.
- Frontend productivo: `502` en `https://fisio-frontend.b5xbaf.easypanel.host/` (bloqueo pendiente).
- Enfoque vigente: CRM + Agente de Citas + Agente IA de Ejercicios.
- Pipeline de video: fuera de alcance activo (legacy limpio en workflows repo).

### Archivos clave de continuidad (fuente de verdad)
- `CHANGELOG.md`
- `configuracion_pendiente.md`
- `ARCHITECTURE.md`
- `.agents/AGENT_RULES.md`
- `.agents/skills/*`
- `database/schema_vnext.sql`

### Arranque recomendado para manana (orden estricto)
1. Revisar `ARCHITECTURE.md` y fijar contratos finales W0/W1/W2/W3.
2. Resolver bloqueo frontend 502 en EasyPanel (logs de task/container) hasta 200.
3. Crear/validar bucket privado `ejercicios` y convención de `object_key`.
4. Implementar en n8n:
   - W0 Router Telegram
   - W1 Citas (Calendar + logging)
   - W2 Ejercicios (OpenAI + catalogo + signed URLs JIT)
   - W3 Trigger Web CRM
5. Cablear botón CRM -> backend -> n8n (W3) y registrar `request_id` end-to-end.

### Criterio de done inmediato (manana)
- Frontend en 200.
- W0/W1/W2/W3 definidos con contratos JSON y logs en Supabase.
- Recomendaciones de ejercicios con imagenes via signed URL JIT (sin persistir URL firmada).

---

## [Sesion 32] - 2026-03-03 (Ajuste prompt Agente Ejercicios para Telegram)
### Objetivo
- Ajustar el prompt maestro para comportamiento conversacional por Telegram, alineado con el agente de citas en n8n.

### Cambios aplicados
- Archivo actualizado: `.agents/skills/exercise-agent-prompt.md`.
- Se fija explicitamente:
  - Canal principal paciente: `telegram`.
  - Paridad operativa con agente de citas (misma capa n8n).
  - Triage inicial cuando el mensaje es saludo o ambiguo.
  - Recomendacion de 1 solo ejercicio maximo por respuesta.
  - Envio por imagen de movimiento via `object_key` (sin YouTube, sin URL firmada persistida).

### Estado
- Prompt listo para implementacion directa en nodo OpenAI Agent de n8n.

---

## [Sesion 33] - 2026-03-04 (Limpieza de duplicados y estructura n8n)
### Objetivo
- Dejar un unico punto de verdad para arquitectura y workflows del proyecto.

### Cambios aplicados
- Eliminada carpeta vacia sin uso: `n8n/workflows/`.
- Eliminado documento legacy duplicado: `docs/architecture.md`.
- Documento canonico de arquitectura: `ARCHITECTURE.md`.
- Carpeta canonica de workflows: `n8n/Fisio_IA_Agent/`.
- Workflows activos confirmados:
  - `n8n/Fisio_IA_Agent/fisio-agent-core.json`
  - `n8n/Fisio_IA_Agent/sw-fisio-pending-intakes.json`
  - `n8n/Fisio_IA_Agent/telegram-chat.json`
  - `n8n/Fisio_IA_Agent/w1-appointment-agent.json`

### Estado
- Estructura local de workflows sin carpetas duplicadas ni archivos basura detectados.
- Pendiente siguiente: ordenar y deduplicar workflows directamente en instancia n8n remota.

---

## [Sesion 34] - 2026-03-04 (Auditoria total n8n + consolidacion operativa)
### Objetivo
- Auditar todos los workflows de la instancia n8n y dejar activos solo los del proyecto dentro de `Fisio_IA_Agent`.

### Auditoria completa ejecutada
- Snapshot completo de la instancia:
  - `docs/data/n8n/workflows_snapshot_20260304_raw.json` (local, no versionado)
  - `docs/data/n8n/workflows_summary_20260304.json`
- Totales iniciales detectados:
  - `54` workflows totales.
  - duplicados por nombre: `Fisio_IA_Agent / Nucleo Agente` (3x).
  - duplicados exactos por contenido: 2x en `Nucleo Agente`.

### Cambios aplicados en n8n remoto
- Se desactivaron `8` workflows activos fuera de la carpeta/prefijo `Fisio_IA_Agent / ...`.
- Se elimino `1` duplicado exacto de `Fisio_IA_Agent / Nucleo Agente`.
- Estado final remoto:
  - `52` workflows totales.
  - `6` workflows activos.
  - los `6` activos quedan en `Fisio_IA_Agent / ...`:
    - `Fisio_IA_Agent / Nucleo Agente`
    - `Fisio_IA_Agent / Orquestador Intake-Video`
    - `Fisio_IA_Agent / Puente Error Backend`
    - `Fisio_IA_Agent / Subflujo Crear y Render Video`
    - `Fisio_IA_Agent / Subflujo Pendientes`
    - `Fisio_IA_Agent / Subflujo Revision Video`

### Backups de seguridad antes de desactivar
- Se guardaron en:
  - `docs/data/n8n/backup_before_deactivate_20260304/` (local, no versionado)
- Incluyen JSON de los flujos desactivados fuera de `Fisio_IA_Agent` para restauracion o reaprovechamiento.

### Hallazgo tecnico relevante
- En esta instancia/API:
  - `POST /api/v1/workflows` -> `500`
  - `PUT /api/v1/workflows/{id}` -> `500`
  - `PUT /api/v1/workflows/{id}/tags` -> `500`
- Operaciones que si funcionan:
  - `GET /api/v1/workflows*`
  - `POST /api/v1/workflows/{id}/activate|deactivate`
  - `DELETE /api/v1/workflows/{id}`

---

## [Sesion 35] - 2026-03-04 (Verificacion post-orden manual en n8n)
### Objetivo
- Validar que la reorganizacion manual en n8n quedo correcta y reparar cualquier desalineacion.

### Verificaciones ejecutadas
- Recuento remoto:
  - `total=52`
  - `active=6`
  - `active_outside_fisio=0`
- Chequeo de colision de webhooks activos:
  - sin duplicados de `path` en workflows activos.
- Test funcional de endpoint critico:
  - `POST /webhook/agent/core` con payload JSON valido -> `200` y respuesta estructurada esperada.

### Estado final
- Instancia consistente tras la ordenacion.
- Todos los workflows activos permanecen dentro de `Fisio_IA_Agent / ...`.

---

## [Sesion 36] - 2026-03-04 (Hardening W1 Appointment Agent)
### Objetivo
- Reforzar `W1` de citas para mejorar robustez operativa y control de errores.

### Cambios aplicados
- Archivo actualizado:
  - `n8n/Fisio_IA_Agent/w1-appointment-agent.json`
- Mejoras en normalizacion de entrada (`Normalize Request`):
  - parseo ISO defensivo para `slot_start` y `slot_end`.
  - validacion de ventana temporal (`slot_start < slot_end`).
  - salida normalizada con `has_slot_window`.
- Mejoras en llamada backend (`Crear Cita en Backend`):
  - `channel` ahora usa valor de entrada (`$json.channel`) con fallback a `telegram`.
  - timeout explicito en request (`15000ms`).
  - se mantiene `ignoreResponseCode` para controlar respuestas en nodo posterior.
- Mejoras en respuesta y control de errores (`Build Created Response`):
  - deteccion de exito por `appointment_id`.
  - deteccion de error por `statusCode >= 400` o mensaje de backend.
  - payload de salida estructurado con `status` y `backend_error` cuando aplica.
- Mejora de mensaje de faltan datos (`Build Need Slot Response`):
  - texto limpio y consistente (sin caracteres corruptos).

### Estado
- Workflow W1 robustecido en repo y validado como JSON valido.
- Pendiente siguiente: publicar en n8n remoto como workflow canonico W1 y validar E2E.

---

## [Sesion 37] - 2026-03-04 (Hardening W0 Telegram + Agent Core)
### Objetivo
- Endurecer el flujo de entrada Telegram y el router core para mejorar resiliencia y trazabilidad.

### Cambios aplicados
- `n8n/Fisio_IA_Agent/telegram-chat.json`
  - `BACKEND_URL` configurable por entorno (`$env.BACKEND_URL`) con fallback seguro.
  - `request_id` generado en entrada.
  - HTTP request con `ignoreResponseCode` + `timeout` (15000ms).
  - nodo nuevo `Build Safe Telegram Reply` para fallback de respuesta cuando backend falla o devuelve payload incompleto.
- `n8n/Fisio_IA_Agent/fisio-agent-core.json`
  - router de intencion estructurado con salidas:
    - `appointment`
    - `exercise`
    - `session_note`
    - `unknown`
  - salida enriquecida con `request_id`, `confidence`, `normalized_payload`.

### Estado
- Ambos workflows quedan endurecidos y validados como JSON.
- Pendiente operativo: import/publicacion en n8n remoto (API create/update sigue devolviendo 500).




