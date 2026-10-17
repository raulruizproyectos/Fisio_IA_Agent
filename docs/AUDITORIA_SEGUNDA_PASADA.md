# Segunda pasada independiente — código, funcionalidades y diseño (16 octubre 2026)

Auditoría local solicitada por Raúl tras la pasada de Codex ([AUDITORIA_FINAL_2026-10-16.md](AUDITORIA_FINAL_2026-10-16.md)). Base revisada: `main` en `fb0a2e7` (producto `ea7f998` frontend / `3d4cce7` backend). **Sin cambios de producto**, sin commit/push/deploy, sin escrituras en Supabase/n8n, sin IA de pago ni envíos. Única consulta remota: listado de solo lectura de workflows n8n (nombre/estado) para decidir la gravedad de H-02.

## Estado de las correcciones

| ID | Estado | Evidencia |
| --- | --- | --- |
| H-01 | **Corregido en local** (autorizado por Raúl el 16-oct), sin commit/push/deploy | `security.js`: `routeKey` y la comprobación de cron comparan la ruta en minúsculas; `index.js`: `case sensitive routing` antes de montar rutas. Nuevo test en `backend/test/security.test.js` (falla antes del cambio, pasa después). Repro original: `/api/CRON` y `/api/Cron` → 401. Express con la configuración: `CRON`, `//cron`, `%63ron` → 404. Backend lint y **215/215**. |
| H-02 | Corregido en local (autorización general de Raúl del 16-oct: «corregir todo») | `/incoming` y `/cita` derivan a la clínica con `TELEGRAM_LEGACY_BOOKING_ENABLED` apagado por defecto; se registra el aviso; ayuda y saludo sin ofrecer reservas. `test/telegram-legacy-booking.test.js` (falla con el flujo antiguo). Emoji de alerta mal codificado corregido. |
| H-03 | Corregido | `extractRedFlags` normaliza tildes, límites de palabra y se suma siempre a lo que diga el motor. `test/red-flags.test.js`. |
| H-04 | Corregido | Bandeja del Dashboard y contadores cargan sin `#intakeBody`; estado «Comprobando» en vez de «en orden». Verificado en navegador (1 mensaje → «1 paciente espera respuesta», badge 1). |
| H-05/H-06/H-07 | Corregidos | Estados con color + etiqueta; sábado/domingo visibles si tienen citas (rejilla 7 columnas y lista móvil); cancelar/no presentado piden confirmación. Nombre corto «María F.». Verificado en navegador. |
| H-08 | Corregido | Voz con 45 s de margen; texto «Transcribiendo el audio…». |
| H-09 | Corregido | El borrador de nota del Historial sobrevive a recargas del mismo paciente. |
| H-10 | Corregido | KPIs muestran «—» si falla la lectura; mes según Madrid. |
| H-11 | Corregido | `lib/http.ts` y reserva pública con mensajes en castellano; éxito ilegible no se toma por reserva confirmada. |
| H-12 | Corregido (17-oct) | Migración `20261017100000_clinic_operation_receipts.sql` + `backend/src/lib/operation-once.js`: cobros, bonos, uso de bono y facturas con recibo por `Idempotency-Key` (repite el resultado tras éxito; bloquea si quedó en duda; libera tras fallo seguro). Frontend envía una clave por apertura de formulario. Ensayo SQL local + `test/operation-once.test.js`. Antes: | Sin confirmación → aviso de revisar la lista y recarga. Idempotencia real de cobros/bonos/facturas requiere ampliar `create_clinic_record_once` (**migración, pendiente de autorización**). |
| H-13 | Corregido | Modales con datos escritos no se cierran con Escape ni clic fuera. |
| H-14 | Corregido | Asignación de reserva pública solo-inserción (`ignoreDuplicates`), nunca reactiva. Test añadido. Riesgo residual: primer vínculo a un profesional nunca asignado (requiere visibilidad de cita sin acceso a ficha: cambio de RLS). |
| H-15 | Corregido | Limitador IA solo en POST exactos (`mountPaidApiLimiter`); test de sondeo. |
| H-16 | Corregido en API y BD (17-oct) | Migración `20261017100100_clinical_record_integrity.sql`: triggers que impiden borrar o reescribir firmados (solo anular) y limitan notas a autor/admin con autor inmutable; ensayo SQL local. Antes: | Documento firmado no se borra (409) y el borrado queda auditado; notas: solo autor/admin y auditoría con la nota completa. Inmutabilidad vía RLS/PostgREST requiere **migración pendiente**. Botón «Eliminar» oculto en firmados. |
| H-17 | Corregido | Clave interna limitada a las rutas que usa n8n (+ `POST /api/cron/*`); test. |
| H-18 | Corregido | Código legacy de un solo uso, caducidad 7 días y regeneración automática; tests. |
| H-19 | Corregido | Comparación por instante y 23P01 por fila; `test/calendar-reconcile.test.js`. |
| H-20 | Corregido (17-oct) | Migración `20261017100200_calendar_in_flight_since.sql`; `check-calendar` libera reservas de más de 5 min y solo **lee** Calendar; `test/calendar-claim-recovery.test.js`. Antes: Sin cambio | Diseño conservador deliberado; caducidad segura requiere columna `in_flight_since` (**migración**). |
| H-21 | Descartado | Conforme a AGENTS.md §5: el sustituto lleva sus precauciones/dosis y se marca `ajustado_apoyo_visual`. |
| H-22 | Corregido | PDF imprime completos «por qué» y precauciones; solo acorta el procedimiento si no cabe en una página. Test. |
| Nuevo | Corregido | Bot legacy activo ordenaba «NUNCA menciones que eres IA» y se presentaba como Carla: ahora asistente virtual (transparencia, art. 50 Reglamento IA UE). |
| P3 | Corregidos | Fechas por defecto con día de Madrid; textos técnicos (triage, timeline, sincronizador, Whisper, briefing, Fallback, Backend/n8n en Ajustes, mensaje de migración a pacientes); plurales; `aria-label` en diálogos/botones de Finanzas y acciones de cita; mensaje honesto en Ajustes; cambio de contacto de clínica auditado; CSP `object-src`/`base-uri` y HSTS. |
| Pendiente | Documentado | Marca de la clínica fija en código (Carla JL) → configuración por clínica; cambio de contraseña sin pedir la actual; `/public-booking/config` expone email del profesional; restringir contacto de clínica a admin (verificar rol real antes). |

Verificación al cierre de este bloque: backend lint y **227/227**; frontend check 0 errores; build; 28 scripts de regresión del CI en verde (adaptados 6 que extraían fragmentos por texto).

## Método y reparto

| Bloque | Responsable | Modelo / razonamiento |
| --- | --- | --- |
| Coordinación, verificación de cada hallazgo, revisión visual e informe | Agente principal | Opus 5.5 / alto |
| Seguridad, RLS, aislamiento, gating clínico | Subagente solo lectura | Opus / alto |
| Backend: idempotencia, Calendar/DST, finanzas, planes | Subagente solo lectura | Sonnet / alto |
| n8n, mensajería, agente de citas | Subagente solo lectura | Sonnet / medio |
| Frontend, estados, accesibilidad, usabilidad | Subagente solo lectura | Sonnet / medio |
| Estado de pendientes conocidos | Subagente solo lectura | Haiku / bajo |

Los hallazgos de subagentes se aceptaron solo tras comprobar el código citado. La columna «Verif.» indica: **R** reproducido (repro local o navegador), **C** confirmado leyendo el código, **S** solo informe del subagente (no comprobado por el coordinador; tratar como hipótesis).

## Verificación ejecutada

- Backend `npm run lint` y `npm test`: **214/214**, 0 fallos. Frontend `npm run check`: 46 archivos, 0 errores/0 warnings/1 hint; `npm run build`: 4 páginas.
- Navegador integrado sobre `frontend/dist` con API ficticia local (servidor en scratchpad, sin red): 1280×860 y 375×812; nombres largos con Ñ/acentos, palabra de 60 caracteres sin espacios, 33 pacientes, tres citas solapadas, cancelada/pendiente/confirmada, cita fuera de horario, bloqueo de Calendar largo, cita en sábado, importes de 123.456.789 €.
- Repro de autorización con el middleware real (`authorizeRequest`) y `fetch` simulado: H-01.
- Descartado como hallazgo: «Invalid Date» y tendencia mensual igual en Finanzas → eran nombres de campo erróneos de mi fixture, no del producto.

## Hallazgos nuevos — prioridad alta (P1)

| ID | Ubicación | Fallo e impacto | Evidencia | Verif. | Corrección mínima | Prueba necesaria |
| --- | --- | --- | --- | --- | --- | --- |
| H-01 | `backend/src/middleware/security.js:32,55,77,89`; montaje en `backend/src/index.js:131-147` | Las comprobaciones de rutas especiales comparan `req.path` **distinguiendo mayúsculas**, pero Express 4 enruta sin distinguirlas. Con cualquier sesión profesional válida, `/api/CRON/avisos-agente`, `/api/Cron/resumenes/:tipo`, `/api/Telegram/incoming` o `/api/WhatsApp/incoming` evitan la clave interna, el secreto de Telegram y la HMAC de OpenWA. Permite disparar crons (avisos a pacientes), leer resúmenes construidos con service role y falsificar mensajes «de un paciente» a los que el bot responde en su chat real. | Repro: `/api/cron/avisos-agente` → 401; `/api/CRON/avisos-agente` y `/api/Cron/...` → 200 con `role: fisioterapeuta`. Los routers de cron no comprueban el actor. | R | `app.set('case sensitive routing', true)` antes de montar rutas **y** comparar en `authorizeRequest` sobre `req.path.toLowerCase()` (o rechazar `/api/*` con mayúsculas). | Test de middleware: variantes de mayúsculas de cron/webhooks con bearer profesional → 401/404. |
| H-02 | `n8n .../production/bot-pacientes.json` («Fisio IA \| Bot paciente», **activo** en n8n remoto) → `backend/src/routes/telegram.js:1772` (`/incoming`), rama de citas 2365-2660 | El bot de pacientes de producción usa el camino **legacy**, no el piloto pausado. Ese camino: (a) reserva vía W1 en cuanto hay hueco + motivo, **sin confirmación explícita**, y responde «tu cita queda confirmada» (enlaza con M-06); (b) no aplica la regla de 24 h; (c) `fetchPatientActiveAppointments` (1237) se llama a sí mismo sin credenciales → 401 → lista vacía, así que cancelar/mover responde siempre «no veo ninguna cita activa». El estado «bot de citas pausado» no describe lo que puede hacer hoy un paciente vinculado por el sistema legacy. | Lectura de código; `search_workflows` (solo lectura): Bot paciente y Citas (W1) `active:true`. No se consultó cuántos pacientes tienen vínculo legacy ni se envió ningún mensaje. | C | Decisión de Raúl: desactivar la intención de citas en `/incoming` modo pacientes (responder con derivación a la clínica/reserva web) hasta validar el piloto. No requiere tocar n8n. | Test de `/incoming` con payload de cita → no llama a W1 y deriva; regresión de ayuda/vinculación intacta. |
| H-03 | `backend/src/routes/exercises.js:331-346, 1635, 1685-1693` | Red flags sin red determinista. Con el motor IA activo, `red_flags_present`/`escalation` dependen solo del LLM (por defecto `false`); `extractRedFlags` solo corre en el fallback y **no normaliza acentos**: «pérdida de fuerza», «parálisis», «caída» no se detectan; `/(fiebre\|39\|40)/` marca «fiebre» con «40 años» o «39 días». Si no se marca, no se exige la justificación de ≥12 caracteres al aprobar. La revisión profesional sigue siendo obligatoria, pero pierde el aviso. | Lectura del regex y de la desestructuración; repro del subagente (`"Paciente de 40 años"→['fiebre']`, `"Pérdida de fuerza…"→[]`). | C | Normalizar con `normalizeClinicalText`, límites de palabra y términos acotados; OR entre `extractRedFlags(symptoms)` y lo devuelto por el motor. | Unit de `extractRedFlags` (acentos, números) y `/recommend` con motor simulado que devuelve `red_flags_present:false` ante «incontinencia». |
| H-04 | `frontend/src/pages/index.astro:390-391, 3664-3667` | El Dashboard nunca carga la bandeja: `#intakeBody` no existe en el DOM y `loadIntakes()` sale en la primera línea. La tarjeta muestra «Bandeja en orden / Sin pacientes pendientes», el contador de Mensajes queda en 0 y el punto de la campana no aparece **aunque haya mensajes de pacientes pendientes**. La vista Mensajes sí los lista. | Navegador: la API ficticia devuelve 1 intake de prioridad alta y el Dashboard dice «Bandeja en orden», badge 0. Solo existe `intakesFullBody`. | R | Alimentar `dashboardRuntime.pendingIntakes` y los badges con un fetch ligero independiente de la tabla; mientras no cargue, «Sin comprobar», no «en orden». | Navegador: 1 intake pendiente → tarjeta «1 en cola», badge 1, campana visible. |

## Hallazgos nuevos — prioridad media (P2)

### Agenda y flujo diario (UI)

| ID | Ubicación | Fallo e impacto | Verif. | Corrección mínima |
| --- | --- | --- | --- | --- |
| H-05 | `frontend/src/styles/editorial-views.css:576-590` frente a `precision-agenda.css:477-503` | En la cuadrícula de escritorio, cita **cancelada, pendiente y confirmada se ven idénticas** (fondo blanco, borde azul): el bloque con `!important` anula los estados. La tarjeta tampoco muestra texto de estado. En móvil sí hay etiqueta. | R (estilos computados idénticos) | Quitar fondo/borde-izquierdo de esa regla o añadir etiqueta de estado a la tarjeta; respetar DESIGN.md (color semántico + etiqueta). |
| H-06 | `index.astro:5189, 5301` (`length: 5`) | Una cita de **sábado o domingo** no aparece en la cuadrícula ni en la lista móvil (la cabecera dice «12 oct - 16 oct»), aunque el resumen la cuenta y el backend permite crearla desde el CRM (`professional.js:2481` sin regla de fin de semana). Solo sale en la tabla inferior. | R | Mostrar sábado/domingo cuando haya citas o bloqueos esa semana (o aviso «1 cita fuera de lunes-viernes»). |
| H-07 | `index.astro:5565, 5849-5851` | «Cancelar» cita es un icono ✕ junto a «Completar», **sin confirmación** ni bloqueo de doble clic; cancela también en Calendar y puede generar aviso al paciente. | C | `requestConfirm` para `cancelada`/`no_show`; deshabilitar durante la petición. |
| H-08 | `index.astro:8618, 8688`; `frontend/src/lib/http.ts:3` | Transcripción y síntesis de voz usan el timeout por defecto de **8 s**; el backend espera hasta 30 s/25 s (`clinical-voice.js:15,85`). Un dictado real falla en pantalla mientras el servidor sigue (y la llamada IA se paga). | C | Pasar timeout ≥ al del backend (p. ej. 45 s) y mensaje en castellano. |
| H-09 | `index.astro:6101-6104` (llamadas 3017-3019, 6339) | `loadHistorial` reescribe todo el contenedor, incluidos los formularios de nota: un **borrador a medio escribir se pierde** al generar un plan, vincular Telegram o refrescar. | S | No re-renderizar formularios con valor sucio o conservar borrador. |
| H-10 | `index.astro:3817-3819` | KPIs del Dashboard con `catch` silencioso: si falla, «Ingresos del mes 0,00 €» y «0 sesiones» parecen datos reales. | S | Mostrar «—/No disponible» en error (patrón ya usado en Finanzas). |
| H-11 | `lib/http.ts:11`; `scripts/public-booking.js:84` | Errores técnicos al usuario: «HTTP 502: <html…>», «The operation was aborted due to timeout»; en la reserva pública un 502 HTML acaba en «Unexpected token <» **ante pacientes**. | C (http.ts) / S (public-booking) | Mapear a mensajes en castellano (sin conexión / tarda demasiado / reintenta). |
| H-12 | `index.astro:7116, 9196, 9441-9445` | Cobros, bonos (incluido consumir sesión, `bonos.js:105`) y facturas sin clave de idempotencia y con timeout de 8-15 s: tras un timeout el reintento puede **duplicar cobro, consumo de sesión o factura**. Notas/pacientes ya usan `createClinicRecord`. | S | Reutilizar `create-record.ts` (Idempotency-Key estable por formulario) en esos POST. |
| H-13 | `index.astro:5695, 5700` y modales de pago/bono/factura/voz | Clic en el fondo o Escape cierran el modal y **descartan lo escrito** (incluido audio y transcripción) sin aviso. | S | Confirmar si el formulario está modificado. |

### Seguridad, integridad y aislamiento

| ID | Ubicación | Fallo e impacto | Verif. | Corrección mínima |
| --- | --- | --- | --- | --- |
| H-14 | `backend/src/routes/professional.js:893-907, 951-953` | La reserva pública (anónima, service role) hace upsert de la asignación fisio↔paciente con `estado:'activa', desasignado_en:null`. Como `can_access_crm_patient` (migración 20260901:140-161) da acceso completo por asignación activa, una reserva con el email/teléfono de un paciente **reactiva el acceso RLS** de un profesional desasignado. Impacto real bajo con una sola clínica y sin desasignaciones; escala horizontal desde un endpoint público. | C | Si el paciente ya existe, no crear/reactivar asignaciones (marcar para revisión). |
| H-15 | `backend/src/index.js:122`; `lib/http-security.js:20-25` | `app.use(PAID_API_PATHS)` casa por prefijo: cada `GET /api/exercises/recommend/jobs/:id` (sondeo cada 1,5 s, hasta 90) **cuenta en el límite de IA de 60/h**. Pocos planes bloquean la IA del profesional una hora. | C | Limitar solo los POST exactos. |
| H-16 | `routes/documents.js:281-289`; `routes/clinical-notes.js:377-381`; RLS `for all` (20260901:277) | Un **consentimiento firmado se borra físicamente** sin comprobar estado ni auditar; la RLS permite actualizar su contenido/firma vía PostgREST. Las **notas clínicas** se borran físicamente y cualquier profesional con acceso puede editar/borrar notas de otro autor. DELETE de documentos devuelve `ok` aunque no exista. | C (rutas) / S (vía PostgREST) | Trigger de inmutabilidad para firmados (solo anular), borrado lógico de notas con `before_state`, UPDATE/DELETE limitado a autor/admin. |
| H-17 | `middleware/security.js:72-75` | `x-internal-api-key` concede service role en **todas** las rutas (p. ej. `GET /api/documentos` de todas las clínicas). Si la clave se filtra desde n8n, compromiso total. | C | Lista blanca método+ruta para la clave interna (las que usa n8n). |
| H-18 | `routes/telegram.js:2111-2135` | `/start CODIGO` legacy: código sin caducidad ni uso único, sobrescribe `telegram_chat_id` aunque ya esté vinculado (secuestro del vínculo y de los recordatorios). | S | Caducidad + uso único como `createPilotLink`. |

### Backend, Calendar y plan de ejercicios

| ID | Ubicación | Fallo e impacto | Verif. | Corrección mínima |
| --- | --- | --- | --- | --- |
| H-19 | `professional.js:1732-1735` (reconciliación en GET agenda y sync) | Compara `row.inicio_en` (PostgREST `…+00:00`) con `calendarEvent.inicio_en` (`toISOString()` → `…000Z`) como texto: **nunca son iguales**. Cada carga de agenda hace un UPDATE por cita enlazada, cambia `updated_at` (provoca 409 «La cita ha cambiado» a quien edite en otra pestaña) y, si el UPDATE da 23P01, el `throw` devuelve error a **toda** la agenda. | C (formato de PostgREST supuesto estándar, no probado contra Cloud) | Comparar con `Date.parse`; capturar 23P01 por fila y marcarla. |
| H-20 | `professional.js:621, 2548`; `lib/appointment-calendar-check.js:41` | `calendar_sync_in_flight` no caduca: un reinicio entre reclamo y cierre, o Calendar caído al crear, deja la cita **sin poder moverse ni cancelarse** (`CALENDAR_CHECK_REQUIRED`) y el hueco ocupado. | S | Caducidad (>2 min = incierto) y acción profesional «reintentar/descartar» tras lectura completa. |
| H-21 | `routes/exercises.js:1526-1627` | `improveSelectionImageCoverage` sustituye ejercicios elegidos por la IA por otros con imagen por puntuación de palabras clave, **conserva el «por qué» del original** y pone contraindicaciones genéricas. Choca con la norma de AGENTS.md §5 (el sustituto debe tener sus propias precauciones/dosificación). | S | No sustituir; avisar de falta de imagen. |
| H-22 | `lib/exercise-report-pdf.js:219-221` frente a `exercises.js:846-850` | El PDF trunca procedimiento a 500, «por qué» a 200 y **cada precaución a 120 caracteres**; la edición aprobada admite 1800/600/280. Lo aprobado ≠ lo entregado al paciente. | S | Alinear límites o paginar; rechazar en borrador lo que no cabe. |
| H-23 | `payments.js:279-292`, `bonos.js:140`, `documents.js` | Borrar/editar cobros, bonos y documentos sin auditoría y con 200 aunque no exista el id; no hay flujo de anulación/rectificativa de factura (estado `anulada` inalcanzable). | S | `recordAudit`, 404 sin fila, RPC de anulación. |

### n8n y mensajería (agente de citas pausado salvo H-02)

| ID | Ubicación | Fallo e impacto | Verif. | Corrección mínima |
| --- | --- | --- | --- | --- |
| H-24 | `n8n/Fisio_IA_Agent/production/*.json` (`settings`) | Ningún workflow tiene `errorWorkflow` y 12/13 tienen `saveDataErrorExecution: none`: si fallan recordatorios, Calendar sync o resúmenes, **nadie se entera** y no queda rastro. | C (fuente local; remoto no comparado) | Asignar «Fisio IA \| Errores» como errorWorkflow y guardar ejecuciones fallidas. Requiere autorización para tocar n8n. |
| H-25 | `n8n .../production/w5-calendar-reader.json` «Leer calendario» | Sin `singleEvents=true`: un evento **recurrente** podría llegar como maestro y no bloquear sus repeticiones → posible doble reserva. | S (comportamiento del nodo no probado) | Comprobar con un evento semanal de prueba y activar `singleEvents`. |
| H-26 | `lib/agent-notices.js:44-45, 59, 81, 152` | Avisos que quedan en `enviando` si el proceso muere no se recuperan; sin chat del fisio se envía a un id de marcador y tras 5 intentos queda en silencio (al paciente se le dijo «te llamaremos»). | S | Recuperar `enviando` antiguos como inciertos; no enviar sin chat y escalar. |
| H-27 | `lib/booking-ai.js:30-36`; `patient-booking.js:297, 336` | (Piloto pausado) Nombre, teléfono y síntomas libres de usuarios aún no vinculados se envían a OpenAI sin necesidad. | S | No interpretar con IA en alta/teléfono; redactar dígitos. |

## Prioridad baja (P3), resumidos

- Fechas por defecto con UTC (`toISOString().slice(0,10)`) entre 00:00-02:00 de Madrid: frontend `index.astro:6617,7127,8784,8830,8856,9406,10617`; backend `payments.js:225`, `clinical-notes.js:275`. `fmtDate` sin zona Madrid ni año (`index.astro:654`). (S/C parcial)
- Agenda: tarjetas solo con el primer nombre («María», «Paciente»): homónimos indistinguibles en la cuadrícula (R). Textos técnicos/sin tilde en la cabecera de Agenda: «Sin heartbeat de W6», «se reconcilio» (R).
- Doble clic en «Crear cita»: el botón se rehabilita 600 ms antes de cerrar el modal (`index.astro:5747-5756`); probablemente lo frena la restricción de solape en BD, pero mostraría un error tras el éxito (C).
- `syncChatPatientSelection` no limpia `#chatLog`: tras cambiar de paciente quedan tarjetas de planes del anterior (S). `#chatLog` sin `role=log`/`aria-live` (S).
- Ajustes de clínica: «Datos guardados correctamente» aunque nombre/NIF/dirección solo van a `localStorage` (S); datos del emisor de facturas/consentimientos tomados de la query del cliente (`documents.js:220-224`, `invoices.js:121-125`) (S).
- Seguridad de refuerzo: CSP sin `script-src`/`object-src`/`base-uri` y sin HSTS (`frontend/nginx.conf:76`); cambio de contraseña sin pedir la actual (`auth.js:136-142`); `PATCH /clinic-settings` sin rol admin ni auditoría; config pública devuelve email del profesional; parser JSON de 15 MB antes de autenticar en transcripción; `/public-booking/slots` lee Calendar en cada petición sin límite propio (S).
- Calidad backend: 500 en vez de 400 ante UUID/mes/año inválidos; filtro `?estado=` de documentos ignorado; `notas_seguimiento_paciente` con error ignorado → 201; `/recommend/async` sin idempotencia y jobs `running` sin caducidad; agenda lista dos veces la misma ventana de Calendar; listados truncados sin aviso (facturas 200, pacientes 500); fallback de voz devuelve `favorable` fuera del enum (S).
- n8n: cuerpo de «Lanzar plan» (`crm-plan.json`) construido como texto con `{{ }}` (comillas en síntomas pueden romperlo; confirmar comportamiento real); W1 detecta 409 por texto y regenera `request_id` no UUID; un único secreto de cabecera para todos los webhooks; rate limit por IP compartido con n8n (S).
- Accesibilidad: diálogos de Bonos/Facturación sin `aria-labelledby`; botones de icono sin nombre (`#refreshBonos`, `#refreshFacturas`, `#bonoModalClose`); aprobación con alertas vía `window.prompt` (S).

## Pendientes conocidos — estado actual

Comprobados contra la fuente actual (inventario Haiku, puntos clave revisados por el coordinador). **Ninguno corregido ni con regresión.**

| Pendiente | Estado | Ubicación actual |
| --- | --- | --- |
| M-02 `/physio-report/send` sin recibo | Sigue | `telegram.js:1584-1592` |
| M-03 teléfono por últimas 9 cifras | Sigue | `patient-booking.js:189, 225` |
| M-04 entrega incierta → `fallido` y reintento | Sigue (n8n); backend lo reclasifica | `avisos-agente-citas.json:43,84`; `agent-notices.js:53` |
| M-05 negación en redacción IA | Sigue | `booking-ai.js:134` |
| M-06 W1 confirma por tener id | Sigue — **ahora alcanzable en producción por H-02** | `w1-agenda-citas.json:156` |
| M-08 recordatorio tras reprogramar | Sigue | migración 20260901:62; `reminders.js:112-113` |
| M-09 avisos caducados bloquean cola | Sigue | `agent-notices.js:152,162` |
| M-10 `revision_manual` mostrado como enviado | Sigue | `no-show-followup.js:94-95, 51` |
| `/profesional/notes` sin idempotencia durable | Sigue | `professional.js:3298` |
| Supabase sin deadline global | Sigue | `lib/supabase.js:15-23` |
| Matching con listas acotadas | Sigue (parcial) | `professional.js:945` (200); Calendar 2500 |

## Sin hallazgos materiales

- Gating clínico: trigger `guard_exercise_recommendation`, snapshot aprobado inmutable, PDF/envíos por `getApprovedExerciseReport`, justificación ≥12 caracteres en RPC con `search_path` fijo, `patient-report/send` rechaza `chat_id` (independiente de H-03, que afecta a la detección, no al bloqueo).
- CSRF/cookies `__Host-`, CORS, PKCE, `SECURITY DEFINER` con `search_path`, webhooks n8n con headerAuth, HMAC OpenWA, sin XSS P0/P1 localizado (`escapeHtml`/`escapeAttr` usados de forma consistente en lo revisado).
- Agenda: columnas alineadas y texto largo contenido (la corrección `ea7f998` se mantiene); sin desbordamiento horizontal a 375 px; ficha con nombre/email muy largos legible; diálogos ocultos inertes al teclado.

## Cobertura real y límites

- Seguridad: completos `index.js`, `security.js`, libs de sesión/HTTP/OpenWA/aprobación, rutas auth/documents/patients/whatsapp/agent-notices/clinic-digests, migraciones de aislamiento/aprobación/piloto/finanzas, `nginx.conf`, Docker. Parciales: `professional.js`, `exercises.js`, `telegram.js`.
- Backend: completos invoices/payments/bonos/documents/patients/clinical-notes/agent/finance/clinic-calendar/calendar-reader/appointment-calendar-check/clinical-voice; `professional.js` 1-3340 (video-jobs no), `exercises.js` casi completo.
- Mensajería: completos patient-booking, booking-ai, agent-notices, clinic-digests, no-show-followup, openwa, reminders; 25 JSON n8n por script + nodos Code clave; `telegram.js` parcial.
- Frontend: ~35 % de `index.astro` en detalle (fetch/formularios/modales/historial/agenda/dashboard/voz) y el resto por búsqueda dirigida; Plantillas/Gestoría/Config, `income-chart.ts`, objetivos táctiles de 44 px y movimiento reducido no auditados a fondo.
- Navegador: Dashboard, Agenda, Pacientes/Ficha y Finanzas a 1280 y 375; no se probaron Documentos/firma, Plantillas, Mensajes, reserva pública ni 768/1920 en esta pasada.
- No ejecutado: SQL/RLS real, PostgREST/Cloud, Google Calendar, n8n, Telegram, OpenAI, móvil físico. H-19, H-20 y H-25 dependen de comportamiento externo no probado.
- Repros temporales en el scratchpad de la sesión (fuera del repo); no forman parte de la suite.

## Propuesta de implementación (una a una, con autorización)

1. **H-01** (bypass por mayúsculas): cambio pequeño en `index.js`/`security.js` + test de middleware. Mayor riesgo/beneficio.
2. **H-02** (bot de pacientes legacy activo): decisión de Raúl; propuesta mínima en backend, sin tocar n8n.
3. **H-03** (red flags) y **H-04** (bandeja del Dashboard).
4. Bloque UI de Agenda: **H-05, H-06, H-07** con revisión a 375/1280.
5. **H-08, H-15, H-19** (timeouts de voz, limitador IA, reconciliación de Calendar).
6. Resto de P2 por dominio (integridad documental/notas H-16 requiere migración → autorización específica para Cloud).


## Rediseño Noche clínica (17-oct)

Dirección C elegida por Raúl. Especificación en `DESIGN.md` v7; capa final `frontend/src/styles/premium-system.css`; Inter Tight vía Fontsource. Render de 9 vistas: de 54 a 14 tamaños de letra, pesos 400/500/600, radios unificados, sin desbordamiento a 1366/390 px. Contratos ID/data-* intactos.

Verificación al cierre: backend lint y **237/237**; frontend check 0 errores y build; 28 scripts CI en verde; migraciones ensayadas en PostgreSQL 18 local con roles tipo Supabase (todas las aserciones OK).

## Estado remoto (17-oct-2026)

- **Migraciones aplicadas en Supabase** (proyecto Fisio-IA-Agent) con autorización de Raúl: `clinic_operation_receipts`, `clinical_record_integrity`, `calendar_in_flight_since`. Verificado por metadatos: 6 funciones de recibos, tabla privada con RLS, sin ejecución para `anon`, triggers `guard_signed_document` y `guard_clinical_note_author`, columna `calendar_sync_in_flight_since`; 0 reservas de Calendar en curso. Compatibles con el backend desplegado `3d4cce7`.
- **Publicado y desplegado (17-oct):** `main` en `f9833c2` (incluye corrección del lockfile: npm en Windows había quitado entradas opcionales `@emnapi/*` y el CI falló en `259866a`). [CI 39035277548](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/39035277548) verde. EasyPanel `fisio-backend` y `fisio-frontend` en `f9833c2`, contenedores en marcha; backend `/api/health` 200; frontend `/health` 200 y sirve Inter Tight. Comprobaciones públicas sin mutación: `/api/cron/…` y `/api/CRON/…` → 401, `/api/Telegram/incoming` sin secreto → 401, clave interna falsa → 401. Login público con el diseño v7, sin errores de CSP.
- **No verificado por Claude:** sesión real dentro del CRM, cobros/facturas con datos reales y bot de Telegram; queda para la prueba de Raúl.
