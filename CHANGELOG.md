# Fisio_IA_Agent - Changelog / Context Log
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
## Proyecto
- **Nombre:** Fisio_IA_Agent
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


