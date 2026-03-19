## Sesion 106 - 2026-03-19

### Objetivo
Desbloquear la sincronizacion real con Google Calendar y verificar el pipeline E2E Calendar-CRM.

### Trabajo realizado

**Desbloqueo Calendar sin Service Account (commit `6165b7b`)**
- [x] Refactorizado `professional.js`: nuevo `calendarDirectEnabled()` (JWT) y `calendarW5Enabled()` (n8n OAuth2).
- [x] `calendarIntegrationEnabled()` ahora retorna `true` con solo `GOOGLE_CALENDAR_ID` + W5 (sin necesitar `GOOGLE_CLIENT_EMAIL` ni `GOOGLE_PRIVATE_KEY`).
- [x] `getGoogleCalendarClient()` gated correctamente en `calendarDirectEnabled()`.
- [x] `fetchCalendarAppointments()` usa W5 como fuente primaria cuando no hay Service Account.
- [x] `buildCalendarBackgroundSyncStatus()` incluye campos `mode` ('direct'|'w5'|'none') y `calendar_id` para observabilidad.
- [x] `reconcileAppointmentsWithCalendar()` diferencia `source: 'google_api'` vs `'w5_reader'` correctamente.

**Configuracion EasyPanel**
- [x] `GOOGLE_CALENDAR_ID=raul.ruiz.diaz.bcn@gmail.com` publicada en EasyPanel `fisio-backend`.
- [x] Redeploy exitoso de `fisio-backend` en EasyPanel.
- [x] `calendarId` extraido del workflow W1 de n8n (OAuth2 personal del profesional).

**Verificacion E2E en produccion**
- [x] `GET /api/profesional/appointments/sync-calendar/status` devuelve `enabled: true`, `mode: "w5"`.
- [x] `POST /api/profesional/appointments/sync-calendar` ejecutado manualmente: `source: w5_reader`, `status: ok`, `ui_status: healthy`, `appointments_considered: 4`.
- [x] `GET /api/health` devuelve `status: ok`.
- [x] GitHub sincronizado en `7a86b7f`.

### Estado al cierre
- Frontend: OK, agenda con observabilidad de sync visible.
- Backend: OK en codigo y produccion, Calendar habilitado via W5 (`enabled: true, mode: "w5"`).
- n8n: OK, W5 Calendar Reader y W6 Calendar Sync activos.
- GitHub: OK, todo sincronizado.

### Siguiente paso exacto
1. Verificar reconciliacion real de citas Calendar ↔ CRM en el frontend.
2. Bloqueos / no disponibilidad desde Google Calendar.
3. Envio real por Telegram desde el copilot.
4. Observabilidad ampliada en agenda (ultimo sync, proximo ciclo, errores recientes).

---



### Objetivo
Dejar la agenda preparada para sincronizacion background real con Google Calendar, anadir observabilidad visible en CRM y cerrar el punto exacto antes del desbloqueo final de EasyPanel.

### Trabajo realizado

**Sync background + observabilidad (commits `d9468c6`, `c651966`)**
- [x] Endpoint backend nuevo: `GET /api/profesional/appointments/sync-calendar/status`.
- [x] Heartbeat interno en backend para W6: inicio, exito y error.
- [x] Workflow `Fisio_IA_Agent / W6 Calendar Sync` versionado y activado en n8n real.
- [x] La agenda del CRM ya ensena estado del sincronizador: `Al dia`, `Sincronizando`, `Con retraso`, `Error` o `Solo vista`.
- [x] La agenda resume frescura del ultimo sync y cambios detectados.

**Diagnostico real en produccion**
- [x] Verificado en vivo que el backend desplegado devuelve `enabled: false` para el sync de Calendar.
- [x] Verificado que `W6` existe en n8n y sigue programado cada 2 minutos.
- [x] Confirmado que la discrepancia agenda vs Google Calendar no es de UI: el backend productivo sigue sin credenciales activas de Calendar.

### Estado al cierre
- Frontend: OK, observabilidad de agenda visible y funcional.
- Backend: OK en codigo, pero bloqueado en produccion por variables de Google Calendar aun no publicadas.
- n8n: OK, W6 creado y activo.
- GitHub: OK, todo sincronizado en `c651966`.

### Siguiente paso exacto
1. Publicar en EasyPanel del backend:
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - opcional: `GOOGLE_CALENDAR_REQUIRED=true`
2. Redeploy de `fisio-backend`.
3. Validar que `/api/profesional/appointments/sync-calendar/status` pasa a `enabled: true` y registra `last_success_at`.
4. Seguir con:
   - espejo real del calendario clinico
   - bloqueos / no disponibilidad desde Google
   - envio real por Telegram desde el copilot
   - observabilidad ampliada en agenda

---

## Sesion 104 - 2026-03-18

### Objetivo
Cerrar la fase de recuperacion del copilot, dejar la agenda conectada con Google Calendar y documentar el punto exacto para continuar sin perder contexto.

### Trabajo realizado

**Copilot / frontend CRM**
- [x] Se estabiliza el copilot como superficie de trabajo util para generar planes sin mezclar el informe completo dentro del modal.
- [x] Se consolidan los modos principales del copilot alrededor de trabajo clinico real: nuevo plan, actualizar plan y preparar sesion.
- [x] `Mensaje paciente` se aparta del primer nivel hasta que pueda convertirse en una accion real con envio y trazabilidad.
- [x] El responsive del copilot deja una base operativa para seguir iterando, aunque queda un ajuste visual pendiente en la sidebar (etiquetas que desaparecen por el colapso automatico).

**Agenda sincronizada con Google Calendar (commit `d5fe6de`)**
- [x] `GET /api/profesional/appointments` ya reconcilia la ventana consultada contra Google Calendar.
- [x] Si un evento vinculado cambia en Calendar, el backend actualiza los datos servidos al CRM.
- [x] Si un evento vinculado desaparece o se cancela en Calendar, se refleja como cancelado en agenda.
- [x] Si existe un evento en Calendar dentro de la ventana y aun no tiene representacion local equivalente, la agenda lo muestra igualmente.
- [x] El frontend refresca agenda cada 45 segundos y al recuperar foco en las vistas Inicio y Agenda.

### Estado al cierre
- Backend: OK, reconciliacion de agenda con Google Calendar en lectura.
- Frontend: OK, agenda con auto-refresh y copilot utilizable para seguir desarrollando.
- GitHub: OK, `origin/main` sincronizado en `d5fe6de`.
- EasyPanel: pendiente redeploy de `fisio-backend` y `fisio-frontend` para ver el ultimo bloque.

### Punto exacto para retomar
1. Montar sincronizacion background real de Google Calendar via n8n o backend, para no depender del refresco de la vista.
2. Corregir la desaparicion de etiquetas en la sidebar cuando el viewport entra en colapso automatico.
3. Volver al desarrollo funcional del agente de ejercicios y de la agenda ya sobre esta base mas estable.

### Validacion realizada
- `node --check backend/src/routes/professional.js` OK
- `astro check` OK en copia limpia (`0 errors`, `0 warnings`, `11 hints`)
- `astro build` OK en copia limpia

---

# Fisio_IA_Agent - Changelog / Context Log

## Sesion 103 - 2026-03-17

### Objetivo
Evolucion del CRM hacia software profesional de gestion de clinicas de fisioterapia.
Benchmarking contra TuFisio, FisioSalus, Fibbel, iFisia, iGaleno, Nubimed, Docfav.

### Trabajo realizado

**Fix pagos FK constraint (commit `3431fea`)**
- [x] Bug: select de pacientes en modal de pagos incluia pacientes legacy cuyo UUID no existia en crm_pacientes. FK violation al guardar.
- [x] Fix: filtro `_source !== 'legacy'` en `populatePagoPacienteSelect`.

**Feature: Ficha de paciente enriquecida (commit `eaa04da`)**
- [x] Migration 008: nuevos campos en crm_pacientes (DNI, direccion, profesion, medico_derivador, aseguradora, alergias, antecedentes).
- [x] Nueva tabla `crm_notas_clinicas` (notas de evolucion por sesion con fecha, zona_corporal, dolor EVA, nota, pruebas).
- [x] Backend: GET /pacientes/:id/ficha (paciente + citas + pagos + notas en una llamada), PATCH /pacientes/:id (editar campos enriquecidos), CRUD /notas-clinicas.
- [x] Frontend: pagina de detalle con 4 pestañas:
  - **Datos personales**: vista lectura + formulario edicion con 13 campos.
  - **Notas clinicas**: timeline visual con EVA colorizado (verde/amarillo/rojo), zona corporal, pruebas. CRUD inline.
  - **Historial citas**: tabla con estado (chip) y motivo.
  - **Historial pagos**: tabla con totales acumulados.

**Feature: Dashboard con KPIs financieros (commit `d901d70`)**
- [x] Metricas: ingresos del mes, sesiones del mes (reemplazaron metricas genericas).
- [x] Grafico de barras apiladas (efectivo verde + tarjeta azul) por mes — canvas puro, sin dependencias.
- [x] Auto-carga al abrir el dashboard.

**Benchmarking competidores**
- [x] Analisis de 7 plataformas: TuFisio, FisioSalus, Fibbel, iFisia, iGaleno, Nubimed, Docfav.
- [x] Plan de mejora de 9 puntos priorizado (ver MEMORY.md).

### Estado al cierre
- DB: ⚠️ usuario debe ejecutar migration 008 en Supabase SQL Editor
- Backend: ✅ endpoints ficha + notas clinicas + pagos + gestoria
- Frontend: ✅ dashboard KPIs + ficha paciente con tabs + notas clinicas
- GitHub: ✅ todo pusheado (`b5cd17f`)
- EasyPanel: ⚠️ rebuild necesario para frontend+backend
- DB: ⚠️ ejecutar migrations 008 (✅ hecha) + 009 (pendiente) en Supabase

### Commits de sesion
- `3431fea` — fix(pagos): filter legacy patients from payment modal
- `eaa04da` — feat(ficha): enriched patient profile with tabs, clinical notes timeline
- `d901d70` — feat(dashboard): add financial KPIs and monthly income chart
- `9d2ca43` — feat(reminders): 24h automatic appointment reminders via Telegram
- `b5cd17f` — feat(invoices): PDF invoice generation with fiscal data

### Trabajo adicional (post-benchmarking)

**Feature: Recordatorios 24h automaticos (commit `9d2ca43`)**
- [x] Endpoint POST /api/cron/recordatorios: busca citas en ventana 23-25h, envia recordatorio via bot pacientes.
- [x] GET /api/cron/recordatorios/preview: dry-run para ver que se enviaria.
- [x] Mensaje con fecha, hora Madrid, motivo. Necesita scheduler externo (n8n o cron).

**Feature: Facturacion PDF (commit `b5cd17f`)**
- [x] Migration 009: tabla crm_facturas (numero UNIQUE, lineas JSONB, IVA, totales, estado).
- [x] Backend: GET /facturas (lista), POST /facturas (crea desde pagos), GET /facturas/:id/pdf (genera PDF).
- [x] PDF incluye: cabecera clinica, datos fiscales paciente (DNI, direccion), lineas detalle, base + IVA + total.
- [x] Numeracion secuencial FACT-YYYY-NNNN.
- [x] Frontend: seccion Facturacion en sidebar, tabla facturas, modal generar desde pagos, descarga PDF.

### Roadmap competitivo (actualizado)
| # | Mejora | Estado |
|---|--------|--------|
| 1 | Ficha paciente enriquecida + vista unificada | ✅ |
| 2 | Dashboard KPIs financieros + grafico | ✅ |
| 3 | Notas de evolucion clinica (timeline) | ✅ |
| 4 | Recordatorios 24h automaticos via Telegram | ✅ |
| 5 | Facturacion PDF con datos fiscales | ✅ |
| 6 | Firma digital consentimientos | Pendiente |
| 7 | Bonos / paquetes de sesiones | Pendiente |
| 8 | Reserva online publica | Pendiente |
| 9 | Teleconsulta | Pendiente |

---

## Sesion 102 - 2026-03-16 (continuacion)

### Objetivo
Implementar gestion de pagos (cobros de sesiones) y seccion de gestoria contable en el CRM.

### Trabajo realizado

**Feature: Pagos (cobros de sesiones)**
- [x] Tabla `crm_pagos` en Supabase (migration 007): paciente_id FK, fecha, importe, metodo_pago (efectivo/tarjeta), concepto, notas, timestamps.
- [x] Backend CRUD completo (`backend/src/routes/payments.js`): GET list+filtros, GET resumen mensual, POST crear, PATCH editar, DELETE borrar.
- [x] Ruta registrada en `backend/src/index.js` como `/api/pagos`.
- [x] Frontend: nav item "Pagos" en sidebar, pagina con filtros (mes/anio), resumen inline (total, sesiones, efectivo, tarjeta), tabla de pagos, boton registrar pago.
- [x] Modal de registro: select nativo con todos los pacientes, importe, toggle efectivo/tarjeta (chips visuales), fecha (default hoy), notas opcional.
- [x] Iterado 3 veces: custom dropdown → fix overflow → select nativo (mas fiable).
- [x] Normalizado 16 ejercicios con zona_corporal no estandar (commit `59375a1`).

**Feature: Gestoria (contabilidad)**
- [x] Backend endpoint `GET /api/pagos/gestoria?anio=X`: agrega pagos por paciente x mes con totales efectivo/tarjeta/total y gran total.
- [x] Frontend: nav item "Gestoria", pagina con:
  - Gran total anual (facturacion, sesiones, efectivo verde, tarjeta azul).
  - Tabla paciente x mes (12 columnas) con tooltip desglose, columna paciente sticky, fila TOTAL con facturacion total del mes.
  - Informe mensual detallado: selector de mes, lista de cada pago individual (fecha, paciente, metodo, importe), totales del mes.

### Estado al cierre
- Backend: ✅ `/api/pagos` (CRUD + resumen + gestoria) funcionando en produccion
- Frontend: ✅ Pagos + Gestoria operativos
- Tabla `crm_pagos`: ✅ creada en Supabase, vacia (lista para uso real)
- GitHub: ✅ todo pusheado (`5710a1f`)
- EasyPanel: ⚠️ usuario debe hacer rebuild de frontend+backend para ultimo commit

### Commits de sesion
- `59375a1` — fix(db): normalize zona_corporal values in seed.sql and Supabase
- `465a8f4` — feat(pagos): add full payment management — backend CRUD + frontend page
- `dc9eee9` — fix(pagos): allow patient dropdown to overflow modal panel
- `07d1c16` — refactor(pagos): simplify UI — cleaner layout, toggle method, auto-month
- `52903fc` — fix(pagos): replace custom dropdown with native select for patient picker
- `ed06dd9` — feat(gestoria): add accounting section with per-patient monthly breakdown
- `5710a1f` — feat(gestoria): add monthly detail report with per-payment breakdown

---

## Sesion 101 - 2026-03-16

### Objetivo
Fix bug citas: Calendar event creado a hora incorrecta (16:00 en vez de 15:00), falsos "slot ocupado" por falta de overlap check, nombre del paciente como UUID en Calendar.

### Trabajo realizado

**Fix hora incorrecta en Calendar events**
- [x] Diagnosticado: backend enviaba `slot_start` sin timezone (`"2026-03-20T15:00:00"`) → n8n trataba como UTC → Calendar mostraba 16:00 en vez de 15:00 Madrid.
- [x] Verificado: el snap code con `+01:00` ya era correcto (commits sesión 100), solo faltaba el fix de W1.

**Fix falsos "slot ocupado" en W1 `EvaluateAvailability` (commit `edcea12`)**
- [x] Bug: el nodo Google Calendar de n8n devolvía todos los eventos del calendario sin respetar `timeMin`/`timeMax`, causando falsos conflictos (ej: evento del 18 de marzo contado como conflicto para slot del 20).
- [x] Fix: añadido overlap check real (`evStart < slotE && evEnd > slotS`) en `EvaluateAvailability`. Solo eventos que realmente se solapan con el slot solicitado cuentan como conflictos.
- [x] Desplegado en n8n vía API.

**Nombre real del paciente en Calendar events (commit `bb23058`)**
- [x] Backend ahora resuelve `linkedPatientName` desde `vinculos_telegram_pacientes.pacientes.nombre_completo` y lo pasa como `patient_name` a W1.
- [x] W1 `Normalize Request` propaga `patient_name` como campo separado.
- [x] W1 `Create an event` prioriza `patient_name` sobre `username` en el summary: `"Cita fisioterapia - Raul Ruiz"` en vez de `"Cita fisioterapia - raulruizdiaz"` o UUIDs.
- [x] Verificado E2E: Calendar muestra "Cita fisioterapia - Raul Ruiz" + hora correcta 15:00 + motivo.

**Limpieza**
- [x] Citas test canceladas en Supabase (Mar 19, Mar 20).
- [x] Eventos huérfanos de Calendar identificados (8 test events) — requieren borrado manual en Google Calendar.
- [x] W5 Calendar Reader: verificado que mover a carpeta n8n no rompe webhooks.

### Estado al cierre
- W1 Agenda de Citas: ✅ overlap check real, hora correcta, nombre paciente
- Calendar events: ✅ "Cita fisioterapia - Raul Ruiz" + hora Madrid correcta + motivo
- Backend: ✅ arriba y respondiendo tras rebuild
- n8n: ✅ 8/8 workflows ON, W1 actualizado
- GitHub: ✅ todo pusheado (`bb23058`)
- EasyPanel: ✅ backend rebuildeado

### Commits de sesión
- `edcea12` — fix(w1): add time overlap check in EvaluateAvailability
- `bb23058` — fix(bot,w1): show patient real name in Calendar events and CRM

### Pendiente menor
- 8 eventos test huérfanos en Google Calendar (Mar 17/19/20/23) — borrar manualmente.
- Mover 7 workflows restantes a carpeta `Fisio_IA_Agent` en n8n UI (API no permite).
- (Opcional) Normalizar 16 ejercicios con zona_corporal no estándar.

---

## Sesion 100 - 2026-03-16

### Objetivo
Continuación de sesión 99. Historial de conversación en bot pacientes, nombre real en Google Calendar, teléfono+motivo en cita, flujo de recogida de motivo, fix Carla inventando disponibilidad.

### Trabajo realizado

**Historial de conversación por chat (`telegram_chat_sessions`) (commits `5981670`, `a9f4342`)**
- [x] Tabla `telegram_chat_sessions` creada en Supabase: `telegram_chat_id TEXT PK`, `recent_messages JSONB`, `pending_slot JSONB`, `updated_at TIMESTAMPTZ`.
- [x] `loadChatSession(chatId)` / `saveChatSession(chatId, history, pendingSlot)` — max 8 mensajes, 250 chars/msg, TTL 6h, purge aleatorio 5%.
- [x] `callCarlaAgent` acepta `history = []` y lo inyecta en el array de mensajes OpenAI → Carla ya no olvida el contexto entre mensajes.
- [x] Helper `carlaReplyAndSave` encapsula llamada + guardado de sesión + pending slot.

**Slot persistence y resolución (`resolveSlot`) (commit `a9f4342`)**
- [x] Cuando el paciente confirma día/hora pero falta motivo, se guarda `pending_slot` en la sesión.
- [x] `resolveSlot(parsedCurrent, pendingSlot)` — si el mensaje actual tiene hora pero no día, extrae la fecha del pending slot y combina con la nueva hora (ej. "mañana a las 10" + "a las 12" → cita a las 12 del día ya acordado).
- [x] `buildCombinedUserText(history, currentText)` — concatena últimos 4 mensajes del usuario + mensaje actual para extracción de motivo cross-turn.

**Nombre real del paciente en Google Calendar (commit `decc11f`)**
- [x] `fetchCalendarContext` en `professional.js`: si el paciente no está en `crm_pacientes`, hace fallback a tabla `pacientes` (legacy Telegram).
- [x] Nombre y teléfono del legacy patient ahora se incluyen en el evento de Calendar.

**Teléfono y motivo en Google Calendar (commit `aab0f99`)**
- [x] `formatCalendarNameParts` actualizado para incluir `Tel: X` y `Motivo: Y` en la descripción del evento.
- [x] Ambos call sites de `buildCalendarEventPayload` pasan `patientPhone` y `motivo`.
- [x] Motivo recogido por Carla se almacena en `crm_citas.motivo` y en Google Calendar.

**Fix Carla inventando disponibilidad (commit `6cdec81`)**
- [x] System prompt actualizado con "REGLAS DE DISPONIBILIDAD — MUY IMPORTANTE": Carla no puede decir que un slot está ocupado/libre salvo que el contexto lo indique, y no puede sugerir alternativas por su cuenta.
- [x] Flujo de reserva refactorizado: solicita los tres datos (día, hora, motivo) sin repetir preguntas.

**Limpieza DB**
- [x] Eliminada cita test basura en `crm_citas` (id `bdca5c57`, motivo "Si mañana a als 15h").

### Estado al cierre
- Bot pacientes: ✅ historial persistente, no olvida contexto, recoge motivo antes de reservar
- Carla: ✅ no inventa disponibilidad, no sugiere slots falsos
- Google Calendar: ✅ muestra nombre real del paciente + teléfono + motivo
- crm_citas: ✅ campo motivo rellenado en el booking
- EasyPanel: ⚠️ necesita rebuild backend para activar commits `5981670`..`6cdec81`

### Commits de sesión
- `c50ea30` — refactor(bot-pacientes): eliminate duplicated code from simplify review
- `5981670` — feat(bot): add per-chat conversation history via telegram_chat_sessions
- `a9f4342` — feat(bot): add pending_slot persistence and resolveSlot for multi-turn booking
- `decc11f` — fix(calendar): resolve patient name from legacy pacientes table fallback
- `aab0f99` — feat(calendar): include patient phone and motivo in Google Calendar event
- `6cdec81` — fix(carla): prohibir inventar disponibilidad y mejorar flujo de reserva

### Próximos pasos
1. **Rebuild backend en EasyPanel** para activar todos los commits de sesión.
2. **Test E2E**: Telegram paciente → motivo → día/hora → cita confirmada → Calendar con nombre+teléfono+motivo.
3. (Opcional) Normalizar 16 registros zona_corporal con valores no estándar.

---

## Sesion 99 - 2026-03-16

### Objetivo
Continuación de sesión 98. Revisión y limpieza de código (`/simplify`) en los ficheros cambiados durante la sesión 98 (PDF redesign + bot onboarding + fix slot detection).

### Trabajo realizado

**Refactoring `telegram.js` (commit `c50ea30`)**
- [x] Eliminada doble llamada a `parseNaturalAppointmentSlots(text)` en la rama appointment — resultado del primer parse reutilizado con `parsedSlot`.
- [x] Unificadas 4 variantes de `nameCtx`/`nameCtxErr`/`nameCtxDefault` en una sola variable `patientNameCtx` (había inconsistencia de trailing space).
- [x] Eliminado bloque `patient_appointments` inalcanzable dentro de la rama `!link` (el two-step onboarding retorna siempre antes de llegar a él).
- [x] Optimización: `resolveAgentConversation` y `intent-router` se saltan completamente en modo `patient_appointments` (intent siempre se forzaba a `appointment`, las llamadas eran work waste de ~12-8s).

### Estado al cierre
- Bot pacientes: ✅ onboarding two-step, saludar por nombre, Carla gestiona citas
- Bot fisio: ✅ genera PDF + envía por Telegram
- PDF informe: ✅ diseño limpio, sin overlapping, imágenes PROET
- Refactoring simplify: ✅ código limpio, sin duplicados, sin código inalcanzable
- n8n: 8/8 workflows ON (W2 bypassed en prod, backend usa Edge Function directa)
- EasyPanel: ⚠️ necesita rebuild backend para activar commit `c50ea30`

### Commits de sesión
- `c50ea30` — refactor(bot-pacientes): eliminate duplicated code from simplify review

### Próximos pasos
1. Rebuild backend en EasyPanel (commit `c50ea30`).
2. Test E2E completo: Telegram paciente → nombre → motivo → fecha/hora → cita confirmada → visible en Agenda CRM.
3. (Opcional) Normalizar 16 registros zona_corporal con valores no estándar.

---

## Sesion 96 - 2026-03-12

### Objetivo
Diagnóstico definitivo y resolución de imágenes en PDF. Fix encoding en frontend y Telegram. Catálogo PROET con nombres en español y descripciones limpias. PDF estructurado y legible.

### Trabajo realizado

**Diagnóstico imágenes PDF (resuelto)**
- [x] Confirmado que `crm_ejercicios_catalogo` tenía 179/195 filas PROET con `metadata.proet_image_url` correctas (URLs de DO Spaces públicas, HTTP 200 verificado).
- [x] PDF endpoint testado directamente → imágenes embebidas correctamente. Bloqueo de sesión 95 era falso positivo; el pipeline ya funcionaba.

**Fix encoding UTF-8 doble codificado (commit `179abc4`)**
- [x] `frontend/src/pages/index.astro`: 40 sustituciones — caracteres españoles (`í`,`é`,`ó`,`á`,`ú`,`Ú`) y em-dashes doble-codificados reparados. 5 strings con `?` en literales TypeScript corregidos manualmente.
- [x] `backend/src/routes/telegram.js`: 13 sustituciones — textos del bot (`también`, `verás`, `señales de alerta`, etc.) corregidos.

**Catálogo PROET: nombres en español y descripciones limpias (commit `f4942b9`)**
- [x] `scripts/proet-sync-supabase.mjs`: añadidas funciones `spanishNameFromFilename()` y `decodeHtmlDescription()`. Ahora `nombre` se deriva del `image_filename` (español) en lugar del título catalán. Descripción limpia con HTML decodificado.
- [x] Re-sync ejecutado: 179 ejercicios actualizados en Supabase con nombres en español y descripciones sin entidades HTML.

**PDF generator mejorado (commit `f4942b9`)**
- [x] `backend/src/lib/exercise-report-pdf.js`: añadida `safePdfText()` para eliminar emoji y chars fuera de Latin-1 que Helvetica no puede renderizar.
- [x] Card height con buffer de seguridad (+24px) para evitar overflow de texto.
- [x] Textos largos truncados a 480 chars (descripción) y 200 chars (motivo clínico).
- [x] `ZONA_LABELS` map para nombres de zona legibles en español.
- [x] Labels y secciones del informe mejorados: "Síntomas referidos", "Alertas clínicas", "Plan terapéutico", "Mensajes y seguimiento".
- [x] Separadores visuales entre secciones del card (zona/pauta → procedimiento).

### Estado al cierre
- Frontend CRM: ✅ encoding correcto, sin caracteres raros
- Bot Telegram: ✅ textos en español correcto
- PDF informe: ✅ imágenes funcionales, español, sin overlapping, sin iconos raros
- Catálogo PROET: ✅ 179 ejercicios con nombres en español y descripciones limpias
- n8n: 8/8 workflows ON

### Bloqueos activos
1. **TELEGRAM_PATIENT_BOT_TOKEN** vacío en backend EasyPanel (no bloqueante)
2. **Google Calendar backend vars** vacíos (no bloqueante, W1 usa OAuth2 n8n)
3. **Deploy pendiente**: EasyPanel debe rebuild frontend + backend para activar los cambios

### Commits de sesión
- `179abc4` — fix(encoding): repair double-encoded UTF-8 in frontend and telegram bot
- `f4942b9` — fix(pdf+catalog): Spanish names, clean descriptions, improved PDF layout

---

## Sesion 95 - 2026-03-12

### Objetivo
- Diagnóstico y fix de imágenes en PDFs de informes. Mejora visual del frontend.

### Trabajo realizado
- [x] Reemplazado `exportExerciseReportPdf` en frontend: ya no usa jsPDF client-side; ahora llama `POST /api/exercises/reports/pdf` al backend y descarga el blob (commit `c71133c`).
- [x] Backend `buildExerciseReportPdfBuffer` (PDFKit) ya tenía código correcto para embeber imágenes — verificado.
- [x] Diagnóstico profundo: `crm_ejercicio_media` está VACÍA → `mediaMap` siempre `{}`. `crm_ejercicios_catalogo.metadata` no tiene `proet_image_url` ni `image_url`. Resultado: `imagen_url` es `null` en todas las recomendaciones salvo que OpenAI lo incluya en el JSON estructurado (no fiable).
- [x] Causa raíz: las imágenes de ejercicios nunca se cargaron en la base de datos — faltan en `crm_ejercicio_media` O en `crm_ejercicios_catalogo.metadata.proet_image_url`.
- [x] Docs actualizados al cierre de sesion (CHANGELOG + configuracion_pendiente).

### Bloqueo identificado: imágenes de ejercicios
- **Causa**: `crm_ejercicio_media` vacía. `metadata` del catálogo no tiene `proet_image_url`.
- **Fix necesario**: ejecutar `scripts/proet-sync-supabase.mjs` con soporte de image URLs, O poblar `crm_ejercicio_media` con las URLs de DO Spaces, O añadir `proet_image_url` al campo `metadata` de `crm_ejercicios_catalogo`.
- **Workaround temporal**: el PDF ya usa backend (PDFKit) y está listo para embeber imágenes en cuanto las URLs existan en DB.

### Estado al cierre
- Frontend PDF: ✅ llama backend, código correcto para embeber imágenes
- Imágenes en PDF: ❌ pendiente poblar `crm_ejercicio_media` o `metadata.proet_image_url`
- n8n 8/8 workflows ON

---

## Sesion 94 - 2026-03-11

### Objetivo
- Capturar fix httpMethod:POST de Puente Error Backend en repo, corregir nombres vnext y publicar Bot Pacientes. Sincronizar todos los workflows con n8n.

### Trabajo realizado
- [x] Fix `httpMethod: POST` en `production/puente-error-backend.json` y sincronizado a n8n (id=TN1x0kDu03lGBo2a). Smoke test POST 200 OK.
- [x] BOM eliminado de JSONs de production y vnext afectados.
- [x] Renombrado `telegram-chat.json` a `"Fisio_IA_Agent / Bot Pacientes"`.
- [x] Renombrado `sw-fisio-pending-intakes.json` a `"Fisio_IA_Agent / SW Intakes Pendientes"`.
- [x] Publicado `Bot Pacientes` en n8n (id=f1PcLN8s9YiOXj3w, inactivo hasta bot token).
- [x] Sincronizados todos los workflows activos con las versiones canonicas del repo.

### Estado n8n al cierre (8 workflows Fisio_IA_Agent)
| ID | Nombre | Estado |
|----|--------|--------|
| ZOarR2hpUUOgm3KC | Router de Mensajes | ON |
| BM9YVm8yDUuRpA55 | W2 Recomendacion Ejercicios | ON |
| dXl8F9jNmTNiafra | W3 Disparador CRM | ON |
| TN1x0kDu03lGBo2a | Puente Error Backend | ON |
| a9pejz5CI7zau52i | Subflujo Pendientes | ON |
| cTp8bORuSL9hsdDk | W1 Agenda de Citas | OFF (pendiente bot pacientes) |
| fdBcmetAPoixF6R4 | Bot Fisioterapeuta | OFF (pendiente credential Telegram n8n) |
| f1PcLN8s9YiOXj3w | Bot Pacientes | OFF (pendiente bot token Telegram) |

### Bloqueos pendientes
- Google Calendar: credenciales no disponibles (GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY).
- Bot nuevo de pacientes: crear en @BotFather, publicar TELEGRAM_PATIENT_BOT_TOKEN en backend, luego activar W1 y Bot Pacientes.
- Bot Fisioterapeuta: configurar credential Telegram en n8n para @FisioIA_Agent_bot y activar.

---

## Sesion 93 - 2026-03-11

### Objetivo
- Publicar OPENAI_API_KEY y variables de produccion en fisio-backend, crear W1 en n8n y desbloquear voz nativa Telegram.

### Trabajo realizado
- [x] Inspeccionado fisio-backend en EasyPanel via API (token correcto: Authorization Bearer, openapi en /api/openapi.json).
- [x] Publicadas en fisio-backend: OPENAI_API_KEY, FRONTEND_URL (corregida a produccion), N8N_APPOINTMENT_WEBHOOK_URL, N8N_EXERCISE_WEBHOOK_URL, TELEGRAM_PHYSIO_BOT_TOKEN, TELEGRAM_PHYSIO_BOT_USERNAME, EXERCISE_ENGINE_* y GOOGLE_CALENDAR_* (vacias por ahora).
- [x] Redeploy de fisio-backend con ultimo commit 10d559d completado.
- [x] Creado workflow `Fisio_IA_Agent / W1 Appointment Agent` en n8n via API (id=cTp8bORuSL9hsdDk).
- [x] Corregido bug en `scripts/sync-n8n-workflow.mjs`: el create enviaba `meta` y `pinData` que la API de n8n rechaza con 400.
- [x] Actualizados `configuracion_pendiente.md` y `CHANGELOG.md`.

### Bloqueos reales pendientes
- Google Calendar: credenciales no disponibles aun (GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY).
- Bot nuevo de pacientes: no creado todavia en Telegram.
- W1 inactivo: esperando bot de pacientes para activar.
- W1 fuera de carpeta Fisio_IA_Agent en n8n UI: la API publica no permite asignar folder al crear; mover manualmente en UI o via workaround.

### Punto exacto de continuidad
1. Obtener credenciales Google Calendar y publicar en fisio-backend.
2. Crear nuevo bot de pacientes en Telegram.
3. Publicar TELEGRAM_PATIENT_BOT_TOKEN + USERNAME en fisio-backend.
4. Activar W1: `node scripts/sync-n8n-workflow.mjs --workflowId=cTp8bORuSL9hsdDk --activate=true`
5. Validar E2E completo.

---
## Sesion 92 - 2026-03-11

### Objetivo
- Separar definitivamente el bot profesional del bot futuro de pacientes y dejar preparado el workflow canonico nuevo de citas en `n8n/Fisio_IA_Agent`.

### Decisiones cerradas
- `@FisioIA_Agent_bot` queda reservado solo para el agente profesional del fisioterapeuta.
- El bot de pacientes para agenda sera uno nuevo y todavia no existe; cuando se cree, se conectara al flujo de citas sin reutilizar el bot profesional.
- El workflow canonico de citas pasa a ser `n8n/Fisio_IA_Agent/vnext/w1-appointment-agent.json` con comprobacion de disponibilidad en Google Calendar, alta en backend y limpieza compensatoria si backend falla tras crear el evento.

### Trabajo realizado
- [x] Reescrito `w1-appointment-agent.json` como workflow W1 real de agenda para pacientes.
- [x] Verificado que el contrato encaja con `POST /api/profesional/appointments`.
- [x] Ampliado `scripts/sync-n8n-workflow.mjs` para soportar create/update/activate por API, no solo update.
- [x] Comprobado por API que el workflow `Fisio_IA_Agent / W1 Appointment Agent` todavia no existe en remoto.

### Bloqueo real confirmado
- La API publica disponible para este token no permite ubicar workflows dentro de la carpeta `Fisio_IA_Agent`.
- `POST /api/v1/workflows` acepta crear workflows, pero rechaza propiedades extra de carpeta/proyecto (`request/body must NOT have additional properties`).
- Los endpoints de folders/projects necesarios no estan disponibles con esta licencia/token, y el backend interno `/rest/*` no acepta este API key.
- Conclusion operativa: para que el W1 quede dentro de la carpeta `Fisio_IA_Agent` en n8n, hay que crearlo o moverlo manualmente en la UI, o partir de un placeholder ya creado dentro de esa carpeta y luego sincronizarlo por API.

### Siguiente paso exacto
1. Crear manualmente en la UI de n8n un workflow vacio dentro de `Personal / Fisio_IA_Agent` con nombre `Fisio_IA_Agent / W1 Appointment Agent`.
2. Ejecutar `scripts/sync-n8n-workflow.mjs` para cargarle el JSON canonico y activarlo.
3. Publicar en backend `N8N_APPOINTMENT_WEBHOOK_URL=https://n8n-n8n.b5xbaf.easypanel.host/webhook/fisio/w1/appointment`.
4. Cuando exista el bot nuevo de pacientes, configurar `TELEGRAM_PATIENT_BOT_USERNAME` y `TELEGRAM_PATIENT_BOT_TOKEN` y validar E2E.

---
## Sesion 91 - 2026-03-11

### Objetivo
- Verificar personalmente en produccion el flujo real del bot de pacientes para citas por Telegram y cerrar el estado exacto de CRM, voz y Google Calendar.

### Validacion realizada
- [x] GET https://fisio-backend.b5xbaf.easypanel.host/api/telegram/link-code/:patientId devuelve correctamente el estado de vinculacion, /start y deep link del paciente.
- [x] El frontend publico ya sirve la version nueva del rail y del flujo CRM -> Telegram del paciente.
- [x] Se ejecutan dos altas reales via POST /api/telegram/incoming contra produccion:
  - texto libre de cita e2e_text_prod
  - payload con voice_transcript e2e_voice_prod
- [x] Ambas solicitudes quedan persistidas en crm_citas con canal_origen=telegram y estado=pendiente.
- [x] La solicitud de voz transcrita deja tambien rastro en mensajes_ingesta_paciente.
- [x] crm_comunicaciones confirma que el backend entra en fallback directo de cita (fallbackUsed=true) y que calendar_sync queda skipped.
- [x] El chequeo en produccion revela un bug de normalizacion legacy: el fallback directo podia duplicar crm_pacientes para el mismo paciente legado sin email; el repo ya incluye correccion en resolveCrmPatientId para reutilizar la migracion previa.

### Hallazgos confirmados
- [x] El alta de citas desde el bot de pacientes ya funciona en produccion para texto y para texto ya transcrito.
- [x] Google Calendar no esta activo ahora mismo en backend productivo: la propia traza devuelve calendar_sync.enabled=false.
- [x] La rama nativa de audio Telegram todavia no esta operativa en produccion: un probe controlado responde Ahora mismo no puedo procesar audios, lo que confirma ausencia de OPENAI_API_KEY en runtime backend.
- [x] El backend si intenta resolver voice_file_id por Telegram (getFile), pero sin un file_id real solo puede validarse hasta ese punto.

### Punto exacto de continuidad
1. Publicar en fisio-backend las variables reales para voz: OPENAI_API_KEY y, si aplica, revisar TELEGRAM_PATIENT_BOT_TOKEN.
2. Publicar las variables reales de Google Calendar: GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY y decidir si GOOGLE_CALENDAR_REQUIRED=true.
3. Redeploy de fisio-backend.
4. Hacer prueba E2E real con el bot de pacientes: mensaje de texto, nota de voz real, alta en CRM y evento visible en Google Calendar.
## Sesion 90 - 2026-03-11

### Objetivo
- Reorientar el siguiente bloque al canal real del bot de pacientes: citas por Telegram en texto o voz, con reflejo posterior en CRM y Google Calendar.

### Cambios implementados
- [x] `backend/src/routes/telegram.js` ya acepta payloads Telegram con `voice`/`audio` ademas de texto.
- [x] Se anade descarga del adjunto desde Telegram y transcripcion con OpenAI (`OPENAI_API_KEY`, `TELEGRAM_TRANSCRIPTION_MODEL`) para convertir la nota de voz en texto antes de pasar por el flujo W1 de citas.
- [x] El bot de pacientes actualiza su ayuda y onboarding para indicar que se puede pedir cita por texto, nota de voz o comando `/cita`.
- [x] `frontend/src/pages/index.astro` incorpora accion rapida `Telegram` en la lista de pacientes para abrir Historial directamente sobre el bloque de vinculacion del canal Telegram.
- [x] `scripts/telegram-dry-run.mjs` suma un caso `appointment_voice_transcript` para cubrir el camino de voz transcrita en dry run custom.

### Validacion realizada
- [x] `node --check backend/src/routes/telegram.js` OK.
- [x] `node --check scripts/telegram-dry-run.mjs` OK.
- [x] `npm run build` OK en frontend aislado con el nuevo acceso rapido a Telegram desde Pacientes.

### Punto exacto de continuidad
1. Configurar en backend productivo `OPENAI_API_KEY` y, si hace falta, confirmar `TELEGRAM_PATIENT_BOT_USERNAME` / `TELEGRAM_PATIENT_BOT_TOKEN`.
2. Redeploy de `fisio-backend` y `fisio-frontend`.
3. Probar E2E del bot pacientes con texto y nota de voz: solicitud de cita -> CRM -> Google Calendar.

## Sesion 89 - 2026-03-11

### Objetivo
- Corregir los ultimos estados de contraste rotos del Copilot antes de retomar funcionalidad nueva.

### Cambios implementados
- [x] El selector de paciente del rail distingue visualmente el estado vacio del estado con paciente seleccionado.
- [x] Se fuerza el control nativo del selector a modo claro con color legible en Chromium (color-scheme, appearance, -webkit-text-fill-color).
- [x] Se ajustan fondo y borde del toolbar superior y de la superficie conversacional para evitar texto claro sobre fondos claros.

### Validacion realizada
- [x] npm run build OK en frontend aislado tras sincronizar la version editada desde G:.

### Punto exacto de continuidad
1. Redeploy de fisio-frontend desde origin/main.
2. Verificar en produccion que al seleccionar paciente el nombre se vea con contraste correcto y que no queden textos perdidos en el rail.
3. Si queda validado, retomar el siguiente bloque funcional del CRM.

## Sesion 88 - 2026-03-11

### Objetivo
- Rehacer el Copilot lateral usando como referencia real el export de Stitch proporcionado por el usuario.

### Cambios implementados
- [x] Se toma como referencia visual `frontend/stitch.zip` y se inspeccionan `code.html` y `screen.png`.
- [x] El rail adopta la composicion de Stitch: selector arriba, historial limpio en el centro y pie con acciones, textarea y disclaimer medico.
- [x] Se ajustan bubbles, colores, bordes, CTA y textarea al lenguaje visual blanco/slate/teal del export.
- [x] Se mantiene toda la funcionalidad previa del agente: seleccionar paciente, guardar PDF, generar plan y chat libre.

### Validacion realizada
- [x] `npm run build` OK en frontend aislado tras aplicar la referencia Stitch.

### Punto exacto de continuidad
1. Redeploy de `fisio-frontend` desde `origin/main`.
2. Verificar en produccion el rail vacio, un mensaje libre y un informe de ejercicios para comprobar paridad visual con la referencia Stitch.
3. Si queda correcto, retomar el siguiente bloque funcional pendiente del CRM.

## Sesion 87 - 2026-03-11

### Objetivo
- Rehacer el Copilot lateral completo para corregir el diseno pobre y los contrastes rotos visibles en produccion.

### Cambios implementados
- [x] El rail del agente deja atras el bloque oscuro heredado y pasa a una consola clinica clara, alineada con el resto del CRM.
- [x] Se unifican estilos de mensajes, progreso, informe de ejercicios, botones y compositor para evitar mezcla de estilos legacy dentro del rail.
- [x] Se corrigen estados de contraste problem?ticos: mensajes del agente, tarjetas del informe, textarea, placeholder y botones deshabilitados.
- [x] Documentacion principal refrescada otra vez para dejar trazado que el siguiente paso vuelve a ser un redeploy visual del frontend.

### Validacion realizada
- [x] `npm run build` OK en frontend aislado tras el redise?o completo del rail.
- [x] CSS compilado verificado: el rail ya no usa la superficie oscura anterior y mantiene una sola superficie conversacional.

### Punto exacto de continuidad
1. Redeploy de `fisio-frontend` desde `origin/main`.
2. Verificar en produccion tres casos: chat vacio, mensaje libre del profesional y render de informe de ejercicios.
3. Si el rail ya queda limpio y legible, retomar CRM -> invitacion Telegram del paciente.

## Sesion 86 - 2026-03-11

### Objetivo
- Dejar el Copilot lateral con una unica superficie de interaccion textual y actualizar toda la documentacion de continuidad antes del siguiente redeploy.

### Cambios implementados
- [x] El rail del agente se unifica en una sola superficie conversacional (`assistant-dialog-surface`) que agrupa historial y compositor.
- [x] Se elimina el mensaje inicial visible que hacia parecer que habia dos ventanas distintas para hablar con la IA.
- [x] El selector de paciente y las acciones (`Generar Plan`, `Guardar PDF`) quedan fuera del flujo conversacional, como barra de herramientas compacta.
- [x] Documentacion principal actualizada para reflejar el estado real del desarrollo: `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md` y `configuracion_pendiente.md`.

### Validacion realizada
- [x] `npm run build` OK en frontend aislado tras la unificacion final del rail.

### Punto exacto de continuidad
1. Redeploy de `fisio-frontend` desde `origin/main`.
2. Verificar en produccion que el Copilot muestre una sola superficie conversacional, sin tarjeta inicial duplicada ni scrolls redundantes.
3. Si el UX queda correcto, retomar CRM -> invitacion Telegram del paciente.

## Sesion 85 - 2026-03-11

### Objetivo
- Simplificar el Copilot lateral para dejar un unico espacio de trabajo util, sin tarjetas ni scrolls superpuestos.

### Cambios implementados
- [x] Eliminadas tarjetas de contexto y shortcuts del rail del agente.
- [x] El Copilot queda como panel profesional y compacto: estado/paciente resumido, historial de conversacion y una sola caja de texto para interactuar con IA, manteniendo seleccion de paciente, chat libre, generar plan y guardar PDF.
- [x] El chat vuelve a ser la unica zona de scroll util dentro del rail.

### Validacion realizada
- [x] npm run build OK en frontend aislado tras la simplificacion del rail.

### Punto exacto de continuidad
1. Redeploy de fisio-frontend desde origin/main.
2. Verificar en produccion que el rail lateral solo tenga un scroll util y que el compositor quede siempre accesible.
3. Si el UX queda correcto, retomar validacion CRM -> invitacion Telegram del paciente.

## Sesion 84 - 2026-03-11

### Objetivo
- Corregir el layout visual del Copilot lateral tras desplegar la nueva UI del CRM.

### Cambios implementados
- [x] Composer del assistant rail compactado con autosize mas bajo segun viewport.
- [x] Overrides visuales completados para que el rail use un tema claro coherente sin bloques oscuros mezclados.

### Validacion realizada
- [x] npm run build OK en frontend aislado despues del ajuste visual.

### Punto exacto de continuidad
1. Redeploy de fisio-frontend desde origin/main.
2. Verificar en produccion que el rail lateral ya no pisa las cards superiores ni mezcla tema oscuro/claro.
3. Retomar la validacion CRM -> invitacion Telegram del paciente.

## Sesion 83 - 2026-03-11

### Objetivo
- Cerrar la invitacion/vinculacion Telegram de pacientes desde el CRM sin romper chats ya enlazados.

### Cambios implementados
- [x] Nuevo GET /api/telegram/link-code/:patientId para consultar estado, codigo actual y deep link sin mutar datos.
- [x] POST /api/telegram/link-code/:patientId ya no resetea un chat vinculado por defecto; devuelve warning seguro si el paciente ya esta enlazado.
- [x] El historial del CRM muestra estado Telegram del paciente y permite preparar invitacion, copiar /start, copiar enlace y regenerar codigo cuando sigue pendiente.

### Validacion realizada
- [x] node --check OK en backend/src/routes/telegram.js.
- [x] npm run build OK en frontend aislado tras integrar la UI de invitacion Telegram.

### Punto exacto de continuidad
1. Si quieres publicar esta UI/endpoint en produccion, sigue pendiente el redeploy manual de fisio-backend y fisio-frontend.
2. Tras el redeploy, validar en CRM real un paciente sin vincular: preparar invitacion, copiar /start y completar /start CODIGO desde Telegram.
3. Si esa prueba queda bien, siguiente foco optimo: volver a pendientes visibles del CRM/EasyPanel.

## Sesion 82 - 2026-03-11

### Objetivo
- Cerrar el cuello de botella del bot fisio sobre crm_perfiles y dejar una validacion repetible sin envios reales para el futuro.

### Cambios implementados
- [x] Migracion productiva aplicada: crm_perfiles ya tiene telegram_chat_id, telegram_username y telegram_linked_at.
- [x] Validado el flujo real /informe del bot fisio: enlaza el chat profesional en crm_perfiles y envia el PDF.
- [x] Validado POST /api/telegram/physio-report/send sin chat_id explicito: resuelve target via crm_perfiles con respuesta 200.
- [x] Nuevo soporte local en repo para dry_run de /api/telegram/physio-report/send.
- [x] Nuevo script scripts/physio-report-send-dry-run.mjs para smoke seguro del targeting del bot fisio.

### Validacion realizada
- [x] crm_perfiles en produccion refleja el chat 147659207 y username raulruizdiaz para Profesional Demo.
- [x] /api/telegram/physio-report/send responde { ok: true, target_source: crm_perfiles } sin chat_id explicito.
- [x] El dry_run nuevo compila en local; queda pendiente redeploy backend para usarlo en produccion.

### Punto exacto de continuidad
1. Si queremos usar el nuevo dry_run en prod, hacer redeploy de fisio-backend.
2. Si no es prioritario el redeploy, siguiente foco optimo: volver a pendientes visibles del CRM/EasyPanel.
3. El bloque del bot fisio basado en crm_perfiles puede considerarse funcionalmente desbloqueado.

## Sesion 81 - 2026-03-11

### Objetivo
- Cerrar la validacion E2E real del triage en Telegram con entrega efectiva al chat vinculado.

### Cambios implementados
- [x] Intento con chats de test historicos confirma bloqueo operativo: Telegram devuelve chat not found aunque el backend persiste intake.
- [x] Intento controlado sobre el chat vinculado de raulruizdiaz (chat_id 147659207) entrega correctamente via Telegram.
- [x] El backend responde 200 OK y persiste el mensaje real 'Me duele' en mensajes_ingesta_paciente.

### Validacion realizada
- [x] Entrega real Telegram confirmada por backend con respuesta 200.
- [x] Nuevo intake real en Supabase para el paciente vinculado a raulruizdiaz.
- [x] Queda validado que el copy nuevo de triage ya funciona en canal real, no solo en dry run.

### Punto exacto de continuidad
1. Revisar en el propio chat si el copy recibido resulta natural o necesita pulido.
2. Si el texto convence, cerrar el bloque Telegram triage como DONE.
3. Siguiente foco sugerido: resolver la capa de targeting del bot fisio sobre crm_perfiles o volver al frente CRM/EasyPanel segun prioridad.

## Sesion 80 - 2026-03-11

### Objetivo
- Ejecutar la validacion real mas segura posible del triage Telegram sin escribir a un chat humano real.

### Cambios implementados
- [x] Validacion no dry_run contra POST /api/telegram/incoming usando paciente de test ya vinculado:
  - paciente TestE2E (923dcae8-0fd8-4070-b7ff-fd1d5e8df1c6),
  - chat vinculado 12345678,
  - username test_e2e_bot.
- [x] Confirmado que el backend devuelve en real el mensaje de triage para Me duele sin caer a fallback antiguo.
- [x] Confirmado write real en Supabase sobre mensajes_ingesta_paciente con estado=pendiente_revision y fuente=telegram.

### Validacion realizada
- [x] Respuesta backend real: reply_text pide zona, tiempo y factor agravante.
- [x] Nuevo registro productivo controlado en mensajes_ingesta_paciente para el paciente de test TestE2E.
- [x] No se envio mensaje real a Telegram porque la prueba entro por payload custom, no por webhook nativo.

### Punto exacto de continuidad
1. Ejecutar prueba manual real desde Telegram con un chat humano ya vinculado.
2. Verificar recepcion del mensaje en el chat real y confirmar que el copy de triage es suficientemente natural.
3. Si queda bien, cerrar este bloque como estable.

## Sesion 78 - 2026-03-11 (Mid-task pause)

### Objetivo
- Validacion final de produccion del fix de UI, actualizacion del Core Agent n8n con Triage Clinico y prueba E2E de Telegram.

### Cambios implementados
- [x] Fix del rail responsive validado visualmente en produccion.
- [x] `fisio-agent-core.json` n8n actualizado remotamente via API para la sesion 77.
- [x] Nuevo plan de Triage: Codigo JS refinado para n8n con evaluacion clinica (localizacion anatomica, factores agravantes, tiempo).
- [ ] Push del nuevo codigo de triage a n8n fallido por timeout de PowerShell con payload grande.

### Validacion realizada
- [x] Frontend en prod verificado (chat visible).
- [x] Telegram dry run post-update de Sesion 77 OK (`session_note`, confidence 0.85).

## Sesion 77 - 2026-03-10

### Objetivo
- Resolver todos los problemas pendientes: migracion DB, validacion local, smoke tests, responsive UI, refinamiento n8n core.

### Cambios implementados
- [x] Migracion `crm_async_jobs` aplicada en Supabase via MCP (`apply_migration`). Tabla + indices + trigger `updated_at`.
- [x] Frontend: fix critico de responsive en el assistant rail (`index.astro`):
  - Eliminados todos los `!important` del bloque enterprise refresh CSS.
  - `.assistant-rail`: display:flex, overflow:hidden, max-height:calc(100vh-60px).
  - `.assistant-rail-card`: max-height:100%.
  - `.assistant-module-header`: flex-shrink:0, padding reducido.
  - `.assistant-context-strip`: flex-shrink:0, max-height:28vh, overflow-y:auto.
  - `.ai-workspace`: overflow:hidden.
  - `.chat-log`: min-height reducido de 220px a 60px.
  - `.ai-input-area`: flex-shrink:0, max-height:45vh, padding reducido.
  - textarea rows reducidas de 7 a 3.
  - min-width:0 anadido a .content, .card, .widget-card, .page-section.
- [x] n8n: `fisio-agent-core.json` refinado - mas keywords de clasificacion (disponibilidad, entrenar, pinchazo...), ruta `fallback` nueva, replies mas especificos y clinicos.
- [x] `scripts/bootstrap-local-workspace.ps1` anadido al repo.
- [x] `AGENTS.md` actualizado con reglas de sesion.

### Validacion realizada
- [x] Backend: `node --check` OK en index.js, agent.js, exercises.js, telegram.js, professional.js.
- [x] Frontend: `astro build` OK (1 pagina, 1.69s).
- [x] Health check produccion: `GET /api/health` â†’ `{"status":"ok"}`.
- [x] Telegram dry run produccion: 5/5 OK.
- [x] W2 async smoke produccion: `done` en 12 polls con patientId y professionalId.

### Punto exacto de continuidad (Sesion 78)
1. **Redeploy frontend** en EasyPanel para que los cambios de CSS surtan efecto.
2. **Redeploy backend** en EasyPanel.
3. **Importar `n8n/Fisio_IA_Agent/vnext/fisio-agent-core.json`** actualizado en n8n.
4. Verificar visualmente el frontend post-deploy (assistant rail + chat input visible).
5. Prueba manual del bot Telegram real con chat vinculado.

### Commits
- `2b72db5` - fix(ui): responsive + feat(n8n): intent classification
- `5d54a40` - fix(ui): pin chat input at bottom
- `2df261a` - fix(ui): bulletproof assistant rail flex layout


## Sesion 76 - 2026-03-10

### Objetivo
- Cerrar el dia con un estado de situacion fiable antes de continuar el hotfix responsive del rail del agente.

### Cambios implementados
- [x] `frontend/src/pages/index.astro` y `frontend/src/layouts/Layout.astro` quedan saneados a nivel de codigo fuente frente a caracteres corruptos/mojibake.
- [x] `README.md` y `CHANGELOG.md` se actualizan para reflejar el estado real del proyecto al cierre.
- [x] Nuevo checkpoint operativo: `docs/checkpoint_20260310_ui_handoff.md`.

### Validacion realizada
- [x] `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` OK en `C:\Temp\Fisio_IA_Agent_frontend_local`.
- [x] Confirmado que el bug pendiente de produccion no es de fuente de deploy antigua, sino de layout responsive del rail.

### Punto exacto de continuidad
1. Retomar `frontend/src/pages/index.astro`.
2. Reestructurar el rail del agente en dos capas: cuerpo scrollable y compositor fijo.
3. Validar build local.
4. Solo despues hacer commit/push y redeploy de frontend.

## Sesion 75 - 2026-03-10

### Objetivo
- Consolidar la arquitectura hibrida recomendada, limpiar el informe clinico visible y cerrar validacion local final.

### Cambios implementados
- [x] El CRM deja explicito que n8n es el agente clinico y que el backend valida, archiva y genera el PDF profesional.
- [x] `frontend/src/pages/index.astro` reduce ruido tecnico en el rail y mejora la jerarquia clinica del informe.
- [x] `backend/src/routes/exercises.js` recompone el informe archivado como resumen clinico estructurado.
- [x] `backend/src/routes/telegram.js` mejora el fallback textual del informe profesional.
- [x] `backend/src/lib/exercise-report-pdf.js` refuerza el wording del PDF, la metrica clinica y el pie de pagina profesional.
- [x] `README.md` y `ARCHITECTURE.md` fijan ya el principio de orquestacion hibrida.
- [x] `scripts/doctor-windows-workspace.ps1` corrige la deteccion de rutas sincronizadas con barras `/` y ya avisa correctamente cuando el worktree comparte `.git` con `G:\Mi unidad\...`.

### Validacion realizada
- [x] `powershell -ExecutionPolicy Bypass -File .\scripts\backend-local-validate.ps1` OK en `C:\Temp\Fisio_IA_Agent_backend_local`.
- [x] `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` OK en `C:\Temp\Fisio_IA_Agent_frontend_local`.
- [x] `node --check backend/src/lib/exercise-report-pdf.js` OK.
- [x] `node --check backend/src/routes/exercises.js` OK.
- [x] `node --check backend/src/routes/telegram.js` OK.
- [x] `powershell -ExecutionPolicy Bypass -File .\scripts\doctor-windows-workspace.ps1 -WorkspacePath C:\Temp\Fisio_IA_Agent_workspace` detecta correctamente modo `worktree` con `.git` sincronizado en `G:`.

### Siguiente paso exacto
1. Si queremos aislamiento maximo de tooling: recrear el workspace local con `-Mode standalone`.
2. Si queremos cerrar funcionalidad visible: redeploy de backend + frontend y validacion del flujo real CRM -> PDF -> Telegram profesional.
## Sesion 74 - 2026-03-10

### Objetivo
- Endurecer la estrategia Windows/sandbox y dejar una ruta operativa clara entre modo ligero y aislamiento maximo.

### Cambios implementados
- [x] `scripts/bootstrap-local-workspace.ps1` ahora soporta dos modos:
  - `worktree` para ahorrar disco,
  - `standalone` para aislamiento maximo cuando el sandbox siga tocando `G:\Mi unidad\...`.
- [x] El bootstrap valida rutas sincronizadas, avisa sobre rutas no ASCII y escribe `.workspace-context.json`.
- [x] Nuevo `scripts/doctor-windows-workspace.ps1` para diagnosticar si el workspace local sigue compartiendo `.git` con una ruta sincronizada.
- [x] Nueva guia `docs/windows_sandbox_strategy_20260310.md` con politica operativa y referencias tecnicas.
- [x] `AGENTS.md` actualizado para dejar claro cuando subir de `worktree` a `standalone`.

### Decision operativa
1. Usar `worktree` por defecto para no duplicar el repo entero.
2. Si el sandbox o Codex siguen heredando estado de `G:`, pasar a `standalone`.
3. Mantener siempre runtime y automatizacion reales en VPS/EasyPanel/Hostinger/n8n/Supabase.

## Sesion 73 - 2026-03-10

### Objetivo
- Corregir el PDF del informe de ejercicios y dejar el rail derecho del CRM con una presentacion profesional y legible.

### Cambios implementados
- [x] Nuevo helper compartido `backend/src/lib/exercise-report-pdf.js` para generar un PDF clinico estructurado con PDFKit.
- [x] `backend/src/routes/exercises.js` expone `POST /api/exercises/reports/pdf` para que el CRM descargue el PDF generado en backend, no en el navegador.
- [x] `backend/src/routes/telegram.js` reutiliza el mismo helper, de modo que el fisioterapeuta recibe por Telegram el mismo PDF profesional cuando lo solicita.
- [x] `frontend/src/pages/index.astro` deja de usar `jsPDF` en cliente y descarga el PDF desde backend.
- [x] `frontend/src/pages/index.astro` rehace el render del plan de ejercicios en el rail con bloques, metricas, tarjetas y mejor jerarquia visual.
- [x] Root cause del rail confuso identificado y corregido: el HTML dinamico del informe no estaba recibiendo bien los estilos por alcance de CSS, por eso se veia casi como texto plano.

### Validacion realizada
- [x] `node --check backend/src/lib/exercise-report-pdf.js` OK.
- [x] `node --check backend/src/routes/exercises.js` OK.
- [x] `node --check backend/src/routes/telegram.js` OK.
- [x] `powershell -ExecutionPolicy Bypass -File .\scripts\backend-local-validate.ps1` OK en `C:\Temp\Fisio_IA_Agent_backend_local`.
- [x] `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` OK en `C:\Temp\Fisio_IA_Agent_frontend_local`.

### Siguiente paso exacto
1. Redeploy de backend y frontend en VPS/EasyPanel/Hostinger.
2. Probar en produccion un caso real desde el rail: generar plan, descargar PDF y verificar que ya incluye imagenes y maquetacion clinica.
3. Solicitar el mismo informe desde Telegram profesional y comprobar que recibe el mismo PDF antes de reenviarlo al paciente.
4. Si todo queda bien, siguiente refinamiento: automatizar reenvio controlado al paciente y archivado binario del PDF.

## Sesion 72 - 2026-03-10

### Objetivo
- Cerrar una funcionalidad visible del CRM: seguimiento manual de recomendaciones desde el historial del paciente.

### Cambios implementados
- [x] frontend/src/pages/index.astro anade un bloque dedicado de "Seguimiento de recomendaciones" dentro del historial del paciente.
- [x] El nuevo formulario envia recommendation_id, adherence_status, pain_scale, recommendation_state y note_text a POST /api/exercises/recommendations/:recommendationId/follow-up.
- [x] La vista de recomendaciones ya muestra mejor el seguimiento guardado con adherencia, dolor y estado actual cuando existen.
- [x] Corregido el bloque duplicado/roto de "Informes y recomendaciones" en el historial del CRM.
- [x] database/schema_vnext.sql queda alineado con la migracion y fija search_path = public en public.crm_set_updated_at().

### Validacion realizada
- [x] powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1 OK en C:\Temp\Fisio_IA_Agent_frontend_local.
- [x] El historial del CRM compila correctamente con Astro/Vite en copia limpia fuera de G:\Mi unidad\....

### Siguiente paso exacto
1. Redeploy del frontend en VPS/EasyPanel/Hostinger para publicar el seguimiento de recomendaciones en el CRM real.
2. Probar end-to-end con un paciente de prueba: abrir historial, guardar nota normal, guardar seguimiento de recomendacion, recargar y verificar trazabilidad.
3. Solo despues de esa validacion, continuar con la siguiente funcionalidad cerrada.
## Sesion 71 - 2026-03-10

### Objetivo
- Endurecer el workflow Windows de desarrollo y corregir una regresion SQL del flujo async W2.

### Cambios implementados
- [x] Nuevo script scripts/bootstrap-local-workspace.ps1 para crear un git worktree local en C:\Temp\Fisio_IA_Agent_workspace sin duplicar el repo entero.
- [x] AGENTS.md actualizado para obligar el trabajo local fuera de G:\Mi unidad\... y dejar claro que C:\Temp es solo desarrollo, no runtime.
- [x] database/schema_vnext.sql: public.crm_set_updated_at() ahora fija search_path = public.
- [x] database/migrations/2026-03-09_crm_async_jobs.sql: la migracion de crm_async_jobs ya no reescribe el helper sin search_path.

### Validacion realizada
- [x] scripts/backend-local-validate.ps1 OK en C:\Temp\Fisio_IA_Agent_backend_local.
- [x] scripts/frontend-local-build.ps1 OK en C:\Temp\Fisio_IA_Agent_frontend_local.
- [x] Confirmado que backend y frontend validan correctamente fuera de G:\Mi unidad\....

### Siguiente paso exacto
1. Mantener el desarrollo local en C:\Temp, pero toda operacion real en VPS/EasyPanel/n8n/Supabase.
2. Continuar el siguiente bloque funcional ya sobre este workflow estable.
## Sesion 70 - 2026-03-09

### Objetivo
- Automatizar la validacion remota del canal Telegram y dejarla como smoke test repetible del proyecto.

### Cambios implementados
- [x] Nuevo script scripts/telegram-dry-run.mjs para ejecutar 5 casos de validacion sobre POST /api/telegram/incoming?dry_run=true.
- [x] El script comprueba route y next_action esperados para ejercicio, cita libre, seguimiento, /cita y /informe fisio.
- [x] README actualizado con el comando de smoke test de Telegram.

### Validacion realizada
- [x] node --check scripts/telegram-dry-run.mjs OK.
- [x] Smoke test remoto contra produccion: 5/5 casos OK.

### Siguiente paso exacto
1. Lanzar prueba manual del bot Telegram real con un chat ya vinculado.
2. Confirmar que la respuesta real coincide con lo que predice el dry run.
3. Si queda bien, siguiente foco: afinar el core n8n para depender menos de normalizaciones backend.
## Sesion 69 - 2026-03-09

### Objetivo
- Habilitar una validacion segura del canal Telegram sin crear datos productivos ni enviar mensajes reales al bot.

### Cambios implementados
- [x] backend/src/routes/telegram.js admite dry_run=true en POST /api/telegram/incoming para payload custom.
- [x] El dry run calcula agent_mode, red flags, clasificacion, reply_text y next_action sin crear pacientes, intakes, citas ni recomendaciones.
- [x] El dry run soporta mensajes libres y comandos clave: /start, /ayuda, /plan, /dolor, /cita y /informe del bot fisio.

### Validacion realizada
- [x] node --check src/routes/telegram.js OK en copia aislada C:\Temp\Fisio_IA_Agent_backend_local.
- [x] La ruta queda preparada para validacion remota via API tras deploy.
- [!] La simulacion local por import directo del router no es fiable por el acoplamiento actual telegram.js -> index.js -> telegramRouter.

### Siguiente paso exacto
1. Redeploy de fisio-backend en EasyPanel.
2. Validar por API POST /api/telegram/incoming con dry_run=true.
3. Si el dry run devuelve route, reply_text y next_action correctos, pasar a prueba manual del bot real.
## Sesion 68 - 2026-03-09

### Objetivo
- Dejar Telegram alineado con la arquitectura n8n-first y reducir la dependencia del router legacy de Supabase.

### Cambios implementados
- [x] backend/src/routes/telegram.js desactiva por defecto la llamada al edge-router legacy de Supabase.
- [x] El edge-router queda disponible solo como fallback opcional mediante TELEGRAM_EDGE_ROUTER_ENABLED=true.
- [x] backend/.env.example documenta la nueva bandera de compatibilidad.

### Validacion realizada
- [x] node --check src/routes/telegram.js OK en copia aislada C:\Temp\Fisio_IA_Agent_backend_local.
- [x] La clasificacion principal sigue dependiendo de n8n compartido mas heuristica local del backend.

### Siguiente paso exacto
1. Redeploy de fisio-backend en EasyPanel.
2. Probar el bot Telegram ya existente con un mensaje libre y una solicitud de ejercicios.
3. Confirmar que Telegram responde de forma coherente incluso sin depender del edge-router legacy.
## Sesion 67 - 2026-03-09

### Objetivo
- Cerrar la divergencia final entre CRM y Telegram en el texto de respuesta del agente cuando no entra W1 o W2.

### Cambios implementados
- [x] backend/src/routes/telegram.js reutiliza ahora el reply_text del gateway compartido del agente como respuesta por defecto.
- [x] Si W2 no llega a devolver un informe, Telegram mantiene una respuesta coherente del mismo agente compartido en vez del mensaje generico legacy.
- [x] Se mantiene la logica existente de auto-recomendacion W2 y citas W1, sin tocar frontend ni workflows n8n.

### Validacion realizada
- [x] node --check src/routes/telegram.js OK en copia aislada C:\Temp\Fisio_IA_Agent_backend_local.
- [x] Verificacion previa en produccion del gateway CRM: ejercicio, cita y seguimiento ya salen con intencion correcta tras Sesion 66.

### Siguiente paso exacto
1. Redeploy de fisio-backend en EasyPanel.
2. Ejecutar prueba real del bot Telegram ya existente con un mensaje libre.
3. Confirmar paridad funcional del tono e intencion entre CRM y Telegram.
## Sesion 66 - 2026-03-09

### Objetivo
- Corregir la clasificacion generica que devuelve n8n en el gateway compartido para que CRM y Telegram no degraden las intenciones clinicas reales.

### Cambios implementados
- [x] backend/src/routes/agent.js normaliza respuestas de n8n cuando llegan con rutas genericas como register_intake o unknown.
- [x] La normalizacion backend conserva n8n como fuente principal, pero sobreescribe la ruta cuando la heuristica local es mas especifica.
- [x] La heuristica local se ha afinado para priorizar exercise ante solicitudes explicitas de plan o ejercicios y evitar falsos positivos por sintomas como menos movilidad.

### Validacion realizada
- [x] node --check src/routes/agent.js OK en copia aislada C:\Temp\Fisio_IA_Agent_backend_local.
- [x] Simulacion controlada con respuesta register_intake desde n8n: ejercicio -> exercise, cita -> appointment, seguimiento -> session_note.

### Siguiente paso exacto
1. Redeploy de fisio-backend en EasyPanel.
2. Validar en produccion POST /api/agent/message con 3 casos: ejercicio, cita y seguimiento.
3. Si la clasificacion ya sale bien en CRM, pasar a verificacion funcional del mismo flujo desde Telegram.
## Sesion 65 - 2026-03-09

### Objetivo
- Unificar la entrada del chat CRM y el chat libre de Telegram sobre el mismo gateway de agente conectado a n8n.

### Cambios implementados
- [x] `backend/src/routes/agent.js` pasa a exponer un gateway compartido `resolveAgentConversation(...)` para CRM y Telegram.
- [x] `POST /api/agent/message` deja de depender de una ruta separada y reutiliza ese gateway compartido.
- [x] `backend/src/routes/telegram.js` usa primero el gateway n8n del agente para clasificar y responder el chat libre.
- [x] Telegram mantiene W1/W2 existentes, pero ahora llega a ellos desde la misma capa de enrutado que usa el CRM.

### Validacion realizada
- [x] `node --check backend/src/routes/agent.js` OK.
- [x] `node --check backend/src/routes/telegram.js` OK.
- [x] Verificacion previa en produccion del backend actual: W2 sync/async ya estable con `image_coverage: 100%` en lumbar y hombro.

### Siguiente paso exacto
1. Redeploy de `fisio-backend` en EasyPanel.
2. Verificar en produccion `POST /api/agent/message` y un mensaje libre de Telegram contra el mismo core n8n.
3. Si la paridad queda bien, siguiente bloque: mover tambien la decision W0 legacy de Telegram fuera del edge router para depender solo del core n8n + fallback local.

## Sesion 64 - 2026-03-09

### Objetivo
- Mejorar la calidad visual del plan W2 y corregir textos corruptos visibles en el rail del agente sin reabrir el error productivo ya resuelto.

### Cambios implementados
- [x] `backend/src/routes/exercises.js` ahora intenta reequilibrar la seleccion final para alcanzar una cobertura minima de ejercicios con imagen cuando existan alternativas clinicamente equivalentes.
- [x] Nueva variable documentada: `EXERCISE_IMAGE_MIN_RATIO` (default `0.75`).
- [x] `engine_observability` expone `image_min_ratio` e `image_coverage_adjusted`.
- [x] `frontend/src/pages/index.astro` limpia separadores corruptos del rail y del resumen de ejercicios para evitar texto roto en produccion.

### Validacion realizada
- [x] `node --check backend/src/routes/exercises.js` OK.
- [x] `astro build` OK en copia aislada `C:\Temp\Fisio_IA_Agent_frontend_local`.
- [x] `astro check` OK en copia aislada `C:\Temp\Fisio_IA_Agent_frontend_local` (`0 errors`, `0 warnings`, `0 hints`).

### Siguiente paso exacto
1. Redeploy de `fisio-backend` en EasyPanel para activar la mejora de cobertura de imagenes.
2. Redeploy de `fisio-frontend` en EasyPanel para publicar la limpieza visual del rail.
3. Repetir una prueba real desde el copilot con un caso de hombro/lumbar y comparar `image_coverage` y `image_coverage_adjusted`.

## Sesion 63 - 2026-03-09

### Objetivo
- Reducir latencia y probabilidad de timeout del motor W2 sin tocar la UX ni romper el fallback actual.

### Cambios implementados
- [x] `backend/src/routes/exercises.js` ahora construye una shortlist heuristica de candidatos antes de llamar al motor IA.
- [x] La shortlist prioriza coincidencia por sintomas/zona, ejercicios con imagen y niveles mas seguros.
- [x] `engine_observability` expone `catalog_total`, `candidate_count` y `candidate_limit` para medir el recorte real de contexto.
- [x] `backend/.env.example` documenta `EXERCISE_ENGINE_CANDIDATE_LIMIT`.
- [x] `README.md` actualizado con la nueva observabilidad/configuracion del motor.

### Siguiente paso exacto
1. Redeploy de `fisio-backend` en EasyPanel.
2. Repetir smoke sync y async en produccion.
3. Comparar `candidate_count`, `total_duration_ms`, `fallback_used` y cobertura de imagen.


## Sesion 62 - 2026-03-09

### Objetivo
- Corregir el error productivo del agente de ejercicios al generar planes desde el copilot rail.

### Problema raiz confirmado
- El frontend envia un `PROF_ID` valido para el modelo legacy, pero `/api/exercises/recommend` y `/api/exercises/recommend/async` no resolvian ese ID al `crm_perfiles.id` real.
- Las rutas de agenda si hacian esa resolucion, por eso citas funcionaba pero ejercicios fallaba al persistir `crm_recomendaciones`.
- Verificacion remota previa al fix:
  - `GET /api/profesional/appointments?fisioterapeuta_id=4a194ec4-3580-4246-9452-0852b589fd63` devolvio citas con `fisioterapeuta_id=6dae4ef6-b6b3-4cb0-91d9-0320d10db255`.
  - `POST /api/exercises/recommend` con `fisioterapeuta_id=6dae4ef6-b6b3-4cb0-91d9-0320d10db255` devolvio `ok=true` en produccion.

### Cambios implementados
- [x] Backend `backend/src/routes/exercises.js`:
  - resolucion automatica de `patient_id` y `fisioterapeuta_id` al modelo CRM antes del flujo sync y async,
  - los jobs async ya nacen con IDs CRM resueltos,
  - el endpoint deja de caer por mismatch legacy->CRM al persistir recomendaciones,
  - si la persistencia falla por esquema/constraint, el plan se devuelve igualmente con `persistence_warning` en lugar de romper toda la generacion.

### Validacion realizada
- [x] `node --check backend/src/routes/exercises.js` OK.
- [x] Diagnostico remoto completado contra backend productivo actual.
- [!] `npm run lint` no ejecutable en esta copia sincronizada porque falta `eslint` en `node_modules` de Google Drive; no es un error del codigo.

### Pendiente inmediato
1. Commit + push del fix a `main`.
2. Redeploy de `fisio-backend` en EasyPanel.
3. Reprobar desde UI y por terminal `POST /api/exercises/recommend` usando el `PROF_ID` bruto del frontend.
4. Si se quiere automatizar el deploy desde esta sesion, hace falta token/sesion de EasyPanel: la TRPC responde `401 UNAUTHORIZED` sin autenticacion.


## Sesion 61 - 2026-03-09

### Objetivo
- Resolver de forma definitiva el cuello de botella del agente de ejercicios y continuar el desarrollo con un flujo asincrono/polling reutilizable.

### Cambios implementados
- [x] Backend `backend/src/routes/exercises.js`:
  - nuevos endpoints `POST /api/exercises/recommend/async` y `GET /api/exercises/recommend/jobs/:jobId`,
  - runner asincrono que reutiliza el endpoint sincronico actual sin duplicar logica clinica,
  - persistencia de jobs en `crm_async_jobs` cuando la tabla existe,
  - fallback temporal a memoria si la migracion aun no esta aplicada,
  - logging operativo del job async en `crm_comunicaciones`.
- [x] Frontend `frontend/src/pages/index.astro`:
  - `Generar Plan` lanza job asincrono y hace polling desde el copilot rail,
  - si el polling expira, el job queda retomable en el siguiente intento sin perder el trabajo en curso,
  - fallback automatico a la ruta sincronica si el backend desplegado aun no expone el nuevo polling.
- [x] Base de datos/documentacion:
  - `database/schema_vnext.sql` a?ade `crm_async_jobs`,
  - `backend/.env.example` documenta nuevas vars del polling,
  - `README.md` actualizado con endpoints y comportamiento W2 asincrono.

### Decisiones tecnicas
- La solucion definitiva se apoya en persistencia por BD, no solo en memoria, para que el job de ejercicios sobreviva a reinicios del backend.
- Se mantiene compatibilidad progresiva: si la tabla aun no existe o el backend desplegado va por detras, el sistema no se cae; degrada a memoria o a ruta sincronica.

### Validacion de cierre
- [x] Frontend validado en copia local no sincronizada:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` OK,
  - `astro build` OK,
  - `astro check` OK.
- [x] Backend validado en copia local no sincronizada:
  - `npm install --no-audit --no-fund` OK,
  - `npm run lint` OK tras anadir `backend/eslint.config.js`,
  - `node --check` OK en `src/index.js`, `src/routes/agent.js`, `src/routes/exercises.js`, `src/routes/telegram.js`, `src/routes/professional.js`.
- [x] Saneamiento tecnico adicional:
  - `backend/src/index.js` ajustado para eliminar argumento no usado del middleware de error,
  - `backend/src/routes/telegram.js` limpiado de helper muerto,
  - el bloqueo restante queda acotado al entorno sincronizado de Google Drive, no al codigo del repo.

### Ajuste n8n derivado de referencias internas
- [x] `n8n/Fisio_IA_Agent/vnext/w3-crm-trigger.json` actualizado para usar `POST /api/exercises/recommend/async`.
- [x] El ack de W3 ahora devuelve `job_id`, `tracking_request_id`, `poll_url` y `tracking_status` en vez de asumir `done` inmediato.
- [x] Se consolida playbook operativo n8n con importacion, credenciales y smoke tests reutilizando patrones de `Agente_IA_Carla_Final`, `Agente_IA_Carla_Final_V2` y `Citas_Telegram_GoogleCalendar_n8n`.
### Automatizacion de smoke test
- [x] `scripts/w2-smoke-async.mjs` anadido para validar inicio de job, polling y resultado final del flujo async W2.
- [x] README y playbook n8n actualizados con el comando exacto de smoke test por terminal.
### Siguiente paso exacto
1. Aplicar `database/migrations/2026-03-09_crm_async_jobs.sql` en Supabase.
2. Redeploy de backend y frontend.
3. Validar en navegador:
   - generar plan con paciente seleccionado,
   - esperar polling del rail,
   - exportar PDF,
   - recargar backend/frontend y comprobar que un job persistente sigue consultable.
4. Solo despues continuar con nuevas funcionalidades.

## Sesion 60 - 2026-03-08

### Objetivo
- Dejar un checkpoint exacto del estado actual, convertir el asistente en un copilot lateral fijo y documentar el punto de continuidad para retomar desde aqui.

### Cambios implementados
- [x] Frontend `frontend/src/pages/index.astro`:
  - alta de pacientes desde modal CRM,
  - buscador superior operativo por paciente/email,
  - notas de seguimiento desde historial,
  - alta de citas desde CRM,
  - asistente IA movido a `copilot rail` lateral persistente para todas las paginas,
  - acceso rapido desde sidebar, topbar y dashboard,
  - contexto del paciente activo dentro del rail,
  - shortcuts de prompt,
  - textarea mas grande, mas legible y con autoajuste,
  - el prompt ya no se vacia al pulsar `Generar Plan` o enviar chat.
- [x] Validacion tecnica:
  - `scripts/frontend-local-build.ps1` OK en `C:\Temp\Fisio_IA_Agent_frontend_local` tras el rediseÃ±o del rail.
- [x] Documentacion sincronizada:
  - `CHANGELOG.md`
  - `README.md`
  - `configuracion_pendiente.md`
  - `docs/checkpoint_20260308_copilot_rail.md`

### Decisiones tecnicas
- El patron adoptado para el asistente pasa de modulo central en dashboard a rail lateral persistente, mas cercano a un copilot operativo de CRM.
- Se prioriza ergonomia y continuidad de trabajo: el usuario mantiene visible el prompt mientras espera la respuesta del agente.
- El siguiente salto de valor ya no es visual sino de flujo: si el motor tarda demasiado, conviene pasar a un modelo asincrono/polling para ejercicios.

### Punto de control seguro
1. El frontend ha quedado validado tras la migracion del asistente a rail lateral.
2. El estado funcional local incluye CRM mas completo y asistente mucho mas usable.
3. El siguiente bloque exacto recomendado es despliegue/preview y, despues, resolver timeout asincrono del motor de ejercicios si sigue siendo un cuello de botella.
## Sesion 59 - 2026-03-07

### Objetivo
- Cerrar un checkpoint seguro tras el crash de VS Code, validar el frontend y alinear las metricas del dashboard con la logica real.

### Cambios implementados
- âœ… Frontend `frontend/src/pages/index.astro`:
  - `Timeouts/Reintentos IA` ya no duplica conteo cuando la respuesta exitosa trae `engine_observability`.
  - `Informes IA archivados` solo incrementa tras archivado real de PDF y evita doble conteo por `recommendation_id` dentro de la misma sesion.
  - eliminado helper sin uso `resolveExerciseName` para dejar `astro check` limpio.
- âœ… Validacion tecnica:
  - `node --check` OK en backend principal (`src/index.js`, `src/routes/*.js`).
  - JSON de workflows n8n validado OK.
  - `scripts/frontend-local-build.ps1` OK en `C:\Temp\Fisio_IA_Agent_frontend_local`.
  - `npm run check` OK en la copia local no sincronizada (`0 errors`, `0 warnings`, `0 hints`).
- âœ… Documentacion sincronizada:
  - `README.md`
  - `configuracion_pendiente.md`

### Decisiones tecnicas
- Se mantiene la validacion del frontend fuera de `G:\Mi unidad\...` cuando `npm install` se bloquea en la ruta sincronizada.
- El KPI de archivado queda ligado al exito de `/api/exercises/reports/archive`, no a la mera generacion de la recomendacion.

### Punto de control seguro
1. El frontend queda validado en build/check desde ruta local no sincronizada.
2. Backend y workflows n8n quedan sintacticamente validados.
3. El siguiente bloque funcional debe arrancar solo tras confirmar si se continua hoy con pulido UI o se deja el checkpoint cerrado para manana.

## Sesion 58 - 2026-03-07

### Objetivo
- Iniciar el rediseÃ±o del frontend hacia un "Light Clinical Theme" profesional (SaaS clÃ­nico).

### Cambios implementados
- âœ… Frontend `frontend/src/layouts/Layout.astro`:
  - Nuevo esquema de colores Light Clinical (grises/azules muy claros, acentos teal).
  - TipografÃ­a y estructura base actualizada.
- âœ… Frontend `frontend/src/pages/index.astro`:
  - Componente Sidebar reordenado para flujo clÃ­nico (Inicio, Pacientes, Agenda, IA clÃ­nica, Plantillas).
  - Componente Topbar actualizado.
  - Estructura Dashboard (grid) reemplazada por flujo vertical funcional (Hero, KPIs, MÃ³dulo IA ancho completo).
  - Estilos del Agent Panel (Asistente IA) llevados a bloque full-width limpio.
- âš ï¸ Frontend dependencies:
  - Ejecutado `npm install` en frontend para solventar bloqueos locales.

### Punto de partida (siguiente sesiÃ³n)
1. Completar la implementaciÃ³n de UX/UI states (Loading, Empty states, Errores).
2. Refinar Responsive (breakpoints intermedios) y transiciones.
3. RevisiÃ³n profunda de Copywriting para tono clÃ­nico en toda la vista.
4. Validar funcionalidad (API endpoints de IA y Base de Datos) con el nuevo DOM.

## Sesion 57 - 2026-03-05

### Objetivo
- Cerrar fallo reportado en CRM (`patient_required`) y estabilizar UI de chat para desktop/movil.
- Dejar base operativa de 2 bots Telegram (pacientes/citas y fisio/informes PDF) con fallback robusto.

### Cambios implementados
- âœ… Frontend `frontend/src/pages/index.astro`:
  - Selector obligatorio de paciente en el panel del agente (`chatPatientSelect`).
  - Sincronizacion de paciente entre:
    - selector del chat,
    - acciones de tabla (revisar/ver historial),
    - estado interno (`selectedPatientId`, `selectedPatientName`).
  - Bloqueo preventivo antes de pedir ejercicios si no hay paciente seleccionado (evita `HTTP 400 patient_required`).
  - Carga temprana del catalogo de pacientes al iniciar dashboard para permitir prueba inmediata.
  - Ajustes UX de envio:
    - deshabilitado coordinado de botones/chat mientras hay request en curso.
  - Ajustes responsive del panel:
    - breakpoint de small desktop (`max-width: 1360px`) para evitar desestructuracion/corte del chat.
    - estilos del bloque de selector de paciente en chat.
- âœ… Backend `backend/src/routes/telegram.js` (consolidado en esta rama):
  - Doble modo de agente Telegram:
    - `patient_appointments` (bot pacientes/citas),
    - `physio_reports` (bot fisio/informes).
  - Flujo `/informe <paciente_id> | <sintomas>` para bot fisio:
    - genera recomendacion,
    - construye PDF,
    - envia PDF por Telegram.
  - Fallback directo de cita cuando falla/no existe webhook W1:
    - crea cita por API interna `/api/profesional/appointments`.
- âœ… n8n/documentacion:
  - Workflow nuevo versionado: `n8n/Fisio_IA_Agent/vnext/telegram-fisio-reports.json`.
  - `telegram-chat.json` enriquecido con `agent_mode` y `bot_username`.
  - README/n8n README/.env example alineados para 2 bots y migracion de credenciales.

### Verificacion
- âœ… `node --check backend/src/routes/telegram.js`
- âš ï¸ `node --check frontend/src/pages/index.astro` no aplica (archivo `.astro`).
- âš ï¸ `npm run build` frontend no ejecutable en este entorno porque falta `astro` en `node_modules` local.

### Punto de partida (siguiente sesion)
1. Deploy backend + frontend en EasyPanel (ultimo commit en `main`).
2. Prueba funcional CRM:
   - abrir dashboard,
   - seleccionar paciente en chat,
   - generar recomendacion,
   - exportar PDF,
   - validar guardado en historial.
3. Prueba bot pacientes (`fisioterapia_CarlaJL`):
   - `/start <codigo>`,
   - `/cita <inicio_iso> <fin_iso>`,
   - validar en CRM Citas + Google Calendar.
4. Prueba bot fisio (`FisioIA_Agent_bot`):
   - `/informe <paciente_id> | <sintomas>`,
   - validar PDF recibido en Telegram y consistencia del informe.
5. Si hay drift visual post-deploy:
   - revisar cache/CDN,
   - comprobar que el frontend desplegado corresponde al hash del commit.

## Sesion 56 - 2026-03-05

### Objetivo
- Permitir exportar el informe del agente de ejercicios en PDF estructurado desde el CRM.

### Cambios implementados
- âœ… Frontend `frontend/src/pages/index.astro`:
  - Nuevo boton `PDF` en el panel del agente (`exercisePdfBtn`).
  - Se guarda el ultimo payload de recomendacion (`lastExerciseReportPayload`).
  - Nueva exportacion PDF con jsPDF cargado dinamicamente desde CDN:
    - portada con fecha, `request_id`, `recommendation_id`,
    - resumen clinico,
    - ejercicios con pauta/procedimiento/motivo/cautelas/imagen URL,
    - mensajes para paciente y fisioterapeuta.
  - Mensajes UX en chat: confirmacion de exportacion o error.
  - Estilos nuevos del boton PDF (`.pdf-btn`) y soporte responsive.
- âœ… Documentacion:
  - `README.md` actualizado con seccion `Informe PDF (CRM)`.

### Estado
- âœ… El CRM ya tiene flujo funcional para descargar informe PDF estructurado tras generar recomendacion.
- Pendiente: redeploy frontend para verlo en produccion.

## Sesion 55 - 2026-03-05

### Objetivo
- Endurecer la observabilidad W2 y cerrar documentacion operativa para despliegue.

### Cambios implementados
- âœ… Backend `backend/src/routes/exercises.js`:
  - Guard clause robusta cuando no hay target IA configurado (`engine_target_not_configured`).
  - Se evita llamada remota invalida si faltan `N8N_EXERCISE_WEBHOOK_URL` y `SUPABASE_URL`.
- âœ… Frontend `frontend/src/pages/index.astro`:
  - Sincronizacion de metricas backendâ†’UI (`engine_observability`) usando `request_id` para evitar doble conteo.
  - La card `Timeouts/Reintentos IA` ahora suma:
    - timeouts/reintentos del cliente (frontend)
    - timeouts/reintentos del motor IA (backend).
- âœ… Configuracion/documentacion:
  - `backend/.env.example`: nuevas vars `EXERCISE_ENGINE_TIMEOUT_MS` y `EXERCISE_ENGINE_MAX_ATTEMPTS`.
  - `README.md`: nueva seccion `Observabilidad W2 (timeouts/reintentos)`.
  - nuevo script de prueba: `scripts/w2-smoke-observability.mjs`.

### Estado
- âœ… Flujo W2 queda listo para validacion E2E de observabilidad en produccion.
- âœ… Smoke test remoto ejecutado con `scripts/w2-smoke-observability.mjs` contra `fisio-backend`:
  - HTTP `200` en ~29s.
  - sin campos de observabilidad nuevos (`attempts/retries_used/total_duration_ms` vacios), indicando backend productivo aun sin redeploy de este cambio.
- Pendiente: redeploy y smoke test real con latencia alta.

## Sesion 54 - 2026-03-05

### Objetivo
- AÃ±adir observabilidad operativa de timeout/reintentos en el flujo de recomendaciones de ejercicios (backend + frontend).

### Cambios implementados
- âœ… Backend `backend/src/routes/exercises.js`:
  - Nuevo wrapper robusto `callEngineWithRetry(...)` para llamadas al motor IA (n8n/Edge).
  - Retries con backoff para timeout, errores de red y HTTP transitorios (`429/5xx`).
  - Nuevas variables de control:
    - `EXERCISE_ENGINE_TIMEOUT_MS` (default `30000`)
    - `EXERCISE_ENGINE_MAX_ATTEMPTS` (default `2`)
  - Se aÃ±ade `engine_observability` en la respuesta de `POST /api/exercises/recommend`:
    - `target`, `timeout_ms`, `max_attempts`, `attempts`, `retries_used`, `fallback_used`, `fallback_reason`, `total_duration_ms`, `attempts_detail`.
  - Logging de fallback enriquecido con `attempts` y `retries`.
- âœ… Frontend `frontend/src/pages/index.astro`:
  - Nueva mÃ©trica visual en dashboard: `Timeouts/Reintentos IA` (`metricEngineOps`).
  - Nuevo helper `requestExerciseRecommendation(...)` con reintento automÃ¡tico en timeout.
  - Contadores locales de operaciÃ³n (`timeouts`, `retries`) y actualizaciÃ³n en tiempo real del dashboard.
  - El reporte de ejercicios muestra mÃ©tricas del backend (`Motor IA: intentos/reintentos`) y aviso explÃ­cito cuando hay fallback.

### Verificacion
- âœ… `node --check backend/src/routes/exercises.js`
- âœ… `node --check backend/src/index.js`
- âœ… `node --check backend/src/routes/telegram.js`
- âœ… `node --check backend/src/routes/professional.js`

### Estado
- âœ… Observabilidad E2E de latencia/fallback/reintentos disponible en respuesta backend y UI CRM.
- Pendiente: redeploy en EasyPanel para validacion en produccion y prueba E2E real con latencia alta.

## Sesion 53 - 2026-03-05

### Objetivo
- Mejorar cobertura de imagenes en recomendaciones de ejercicios (backend + frontend).

### Cambios implementados
- âœ… Backend `exercises.js`:
  - `/catalog` ahora devuelve `imagen_url` resuelta desde `metadata.proet_image_url`.
  - `/recommend` optimizado: salta query a `crm_ejercicio_media` si tabla vacia (0 registros).
  - Nueva metrica `image_coverage` en respuesta: `{ with_image, total, percentage }`.
  - Fallback heuristico `buildRuleBasedRecommendation` ahora incluye `imagen_url` de metadata PROET.
- âœ… Frontend `index.astro`:
  - Ejercicios recomendados ahora se renderizan como **tarjetas visuales con imagen**.
  - Cada tarjeta muestra: imagen PROET, titulo, badge de zona, pauta, procedimiento, motivo.
  - `onerror` handler oculta imagenes rotas gracefully.
  - Layout responsivo: horizontal en desktop, apilado en movil (<480px).
  - CSS nuevo: `.exercise-report`, `.exercise-card`, `.exercise-card-img`, etc.
- âœ… Datos analizados:
  - 195 ejercicios activos, 179 con `proet_image_url` (91.8%), 16 legacy sin imagen.
  - `crm_ejercicio_media` vacia (0 rows) â€” todas las imagenes vienen de metadata PROET.

### Verificacion
- âœ… `node --check` OK (4 rutas backend).
- âœ… `astro build` OK (frontend, 1.48s, 0 errores).
- âœ… Push a GitHub: `be63070` en `main`.

### Estado
- âœ… Imagenes de ejercicios visibles en CRM con cobertura del 91.8%.
- âœ… Commit `be63070` pushed a GitHub.
- Pendiente: deploy en EasyPanel para ver en produccion.

## Sesion 52 - 2026-03-04

### Objetivo
- Resolver fallo del agente de ejercicios en frontend y dejar cierre de sesion listo para continuar manana.

### Cambios implementados
- âœ… Diagnostico raiz:
  - backend tardaba ~12s en `/api/exercises/recommend`.
  - frontend tenia timeout fijo de 8s y mostraba falso "Error de conexion con el agente de ejercicios".
- âœ… Fix frontend:
  - `fetchJson` ahora admite `timeoutMs` configurable y devuelve detalle HTTP.
  - `handleExerciseRecommend` usa timeout de `45000ms`.
  - manejo de errores mejorado (timeout vs error real) sin marcar desconexion por falso negativo.
- âœ… Build validado:
  - `scripts/frontend-local-build.ps1` completado OK.

### Estado
- âœ… Agente de ejercicios estabilizado en frontend para respuestas IA lentas.
- âœ… Session log actualizado para retomar desde este punto.

## Sesion 51 - 2026-03-04

### Objetivo
- Corregir desalineacion entre codigo local y version publicada (frontend/backend legacy con rastros de video).

### Cambios implementados
- âœ… Normalizacion a `UTF-8 sin BOM` en archivos criticos para evitar errores de parseo.
- âœ… Build local del frontend validado con `scripts/frontend-local-build.ps1` (`astro build` OK).
- âœ… Verificacion del artefacto local: sin referencias a `Videos` ni `generar video`.
- âœ… Robustez API ejercicios:
  - `POST /api/exercises/recommend` ya no exige `patient_id` para generar informe.
  - persiste en DB solo cuando hay `patient_id`; si no, responde informe igualmente (`persistence_skipped=true`).
- âœ… Redeploy forzado por API en EasyPanel:
  - `fisio-frontend` y `fisio-backend` desplegados con commit actual.
  - frontend productivo confirmado sin modulo `Videos`.
- âœ… Fix backend post-deploy:
  - corregida variable no definida en `composeClinicalReport` (`symptomSummary: symptom_summary`) que provocaba `500`.

### Estado
- âœ… Verificacion E2E en produccion completada:
  - frontend sin seccion `Videos`.
  - `POST /api/exercises/recommend` devuelve `200` y `informe_clinico`.
  - `POST /api/agent/message` operativo sin copy de video.
- âœ… Regla operativa reforzada: actualizar `CHANGELOG.md` y `configuracion_pendiente.md` en cada bloque que afecte al sistema.

## Sesion 50 - 2026-03-04

### Objetivo
- Eliminar parte de video y consolidar flujo de informe de ejercicios con imÃ¡genes en CRM/Telegram.

### Cambios implementados
- âœ… Frontend sin pÃ¡ginas ni copy de video.
- âœ… Backend orientado a `informe_clinico` de ejercicios (procedimiento, pauta e imagen).
- âœ… Workflows de video eliminados de n8n repo y de n8n remoto.
- âœ… Snapshot PROET sincronizado en Supabase:
  - `72` dolencias insertadas.
  - `179` ejercicios `PROET-*` upsertados en `crm_ejercicios_catalogo`.
  - nuevo script `scripts/proet-sync-supabase.mjs`.
- âœ… Robustez reforzada:
  - `exercises.js` con fallback heuristico cuando falla motor IA/Edge (incluye caso `OPENAI_API_KEY not configured`).
  - `agent.js` fuerza fallback si n8n devuelve copy legacy de video.
  - norma formal agregada: `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`.

### VerificaciÃ³n tÃ©cnica
- âœ… Sintaxis backend y JSON n8n correctos.
- âš ï¸ Build frontend pendiente en este entorno por timeout en `npm install`.

## Sesion 49 - 2026-03-04

### Objetivo
- Dejar W2/W3 operativos en n8n y verificar bloqueos reales de produccion para cerrar despliegue.

### Cambios implementados
- âœ… W2/W3 recreados en n8n con webhook `POST` y activados.
- âœ… Corregidos workflows vNext para evitar `$env` en expresiones (instancia bloquea env access en nodos).
- âœ… Correccion de contratos HTTP JSON en W2/W3 para evitar error de parseo del nodo HTTP Request.

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
- âœ… Nuevo documento normativo:
  - `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- âœ… Referencia aÃ±adida en:
  - `n8n/README.md`
  - `README.md`

### Regla formalizada
- Ningun workflow de proyecto se considera `DONE` si no esta dentro de carpeta/tag `Fisio_IA_Agent`.
- Si API no permite etiquetar/mover, se exige accion manual en UI antes de cerrar la sesion.
## Sesion 47 - 2026-03-04

### Objetivo
- Cambiar la UI del CRM a modo oscuro completo manteniendo legibilidad y consistencia visual.

### Cambios implementados
- âœ… `frontend/src/layouts/Layout.astro`
  - Nueva paleta dark global (`--bg-*`, `--text-*`, `--border-*`, sombras y fondo general).
- âœ… `frontend/src/pages/index.astro`
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
- âœ… Fix frontend runtime:
  - `frontend/src/pages/index.astro`: cambiado `<script lang="ts">` a `<script>` para evitar entregar TypeScript sin transpilar en produccion.
- âœ… Fix backend CORS en produccion:
  - `backend/src/index.js`: CORS pasa a lista de origenes permitidos (`FRONTEND_URLS`, `FRONTEND_URL`, localhost y dominio frontend productivo).
  - evita bloqueo de peticiones desde `https://fisio-frontend.b5xbaf.easypanel.host`.
- âœ… Workflows n8n vNext aÃ±adidos:
  - `n8n/Fisio_IA_Agent/vnext/w2-exercise-agent.json`
  - `n8n/Fisio_IA_Agent/vnext/w3-crm-trigger.json`
- âœ… Documentacion de workflows actualizada:
  - `README.md`
  - `n8n/README.md`

### Diagnostico confirmado de incidencia
- El frontend desplegado mostraba HTML con script TypeScript embebido (sintaxis `as HTML...`), lo que rompe ejecucion JS en navegador.
- El backend respondia `Access-Control-Allow-Origin: http://localhost:4321`, bloqueando llamadas cross-origin desde el frontend productivo.

## Sesion 45 - 2026-03-04

### Objetivo
- Dejar inventario de workflows de n8n ordenado y sincronizado con produccion, sin duplicados confusos.

### Cambios implementados
- âœ… Sincronizacion desde n8n remoto de los `6` workflows activos de `Fisio_IA_Agent / ...` a:
  - `n8n/Fisio_IA_Agent/production/`
  - archivos exportados: `nucleo-agente`, `orquestador-intake-video`, `puente-error-backend`, `subflujo-crear-render-video`, `subflujo-pendientes`, `subflujo-revision-video`.
- âœ… Reordenacion de workflows canonicos en desarrollo a:
  - `n8n/Fisio_IA_Agent/vnext/`
  - incluye `telegram-chat.json` con `Telegram Trigger` nativo.
- âœ… CI actualizada para validar JSON de workflows de forma recursiva en toda la carpeta `n8n/Fisio_IA_Agent`.
- âœ… Artefacto de auditoria refrescado:
  - `docs/data/n8n/workflows_summary_20260304.json`

### Estado resultante
- El repositorio ya contiene todos los workflows activos del proyecto dentro de `Fisio_IA_Agent`.
- Separacion clara entre:
  - `production/` (estado real desplegado)
  - `vnext/` (estado objetivo en migracion)

## Sesion 44 â€” 2026-03-04

### Objetivo
- Implementar en producto el bloque de mayor ROI detectado en PROET: **Plantillas + clonado de programas**.

### Cambios implementados
- âœ… `backend/src/routes/professional.js`
  - Nuevo endpoint `GET /api/profesional/program-templates`
    - agrega planes legacy (`planes`) por titulo para generar plantillas reutilizables
    - calcula `usage_count`, `exercises_count`, `last_used_at`, `source_plan_id`, `source_patient_name`
    - control de errores si faltan tablas (`planes`, `items_plan`, `pacientes`)
  - Nuevo endpoint `POST /api/profesional/program-templates/clone`
    - clona plan origen a paciente destino
    - crea nuevo registro en `planes` (estado `borrador`)
    - copia todos los `items_plan` del plan origen
    - valida coherencia profesionalâ†”paciente
- âœ… `frontend/src/pages/index.astro`
  - Nueva secciÃ³n SPA **Plantillas TerapÃ©uticas** en sidebar.
  - Tabla de plantillas mÃ¡s reutilizadas con:
    - tÃ­tulo
    - usos
    - nÂº ejercicios
    - Ãºltimo uso
    - paciente origen
  - Selector de **paciente destino** para clonado.
  - AcciÃ³n â€œClonarâ€ conectada a backend (`POST /program-templates/clone`).
  - Ajustes de estilos responsive para controles de la nueva secciÃ³n.
- âœ… `README.md`
  - AÃ±adidos endpoints de plantillas/clonado en listado principal.

### Verificacion tecnica
- `node --check backend/src/routes/professional.js` -> OK.
- Build frontend no ejecutable en este entorno por falta de dependencia local:
  - `npm run build` falla con `"astro" no se reconoce...`.

### Pendiente inmediato
- [ ] Instalar dependencias frontend en entorno local de build y validar `astro build` tras el cambio de Plantillas.
- [ ] Redeploy backend EasyPanel para publicar rutas W1 (`/api/profesional/appointments` sigue `404` en producciÃ³n).

## Sesion 43 â€” 2026-03-04

### Objetivo
- Analizar frontend + backend de PROET por secciones para extraer mejoras concretas aplicables a Fisio_IA_Agent.

### Cambios implementados
- âœ… Escaneo completo de bundles de `app.exerciciterapeutic.cat`:
  - `131` chunks JS analizados.
  - `148` endpoints API unicos detectados.
- âœ… Inventario de secciones del sidebar profesional (frontend):
  - `Inici`, `Crear programa`, `Meus programes`, `Plantilles`, `Meus exercicis`, `Pacients`, `Contacte`, `Meu calendari`, `Meu perfil`.
  - Mapeo ruta + endpoints por seccion.
- âœ… Artefactos de analisis versionados:
  - `docs/proet/platform_analysis_20260304.md`
  - `docs/proet/sections_endpoints_20260304.json`
  - `docs/proet/api_groups_20260304.json`
- âœ… Hallazgos priorizados para roadmap del proyecto:
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

## Sesion 42 â€” 2026-03-04

### Objetivo
- Aprovechar contenido real de PROET (diagnosticos/programas/ejercicios/imagenes) y dejar un flujo reproducible para alimentar W2.

### Cambios implementados
- âœ… `scripts/proet-export.mjs`
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
- âœ… Snapshot generado y versionado:
  - `docs/data/proet_snapshot_20260304.json`
  - Estadisticas del snapshot:
    - `user_programs_total: 20`
    - `templates_total: 59`
    - `program_exercises_total: 309`
    - `unique_exercises_total: 179`
- âœ… `README.md`
  - Documentada la operativa de exportacion PROET (`node scripts/proet-export.mjs --email=<tu_email> --locale=val`).

### Verificacion de produccion (backend)
- `GET /api/health` en `fisio-backend` -> `200`.
- `GET /api/profesional/appointments` en `fisio-backend` -> `404`.

### Pendiente inmediato
- [ ] Redeploy de `fisio-backend` en EasyPanel para aplicar codigo de W1 (rutas `appointments`) ya presente en `main`.
- [ ] Conectar snapshot PROET a ingesta de `crm_ejercicios_catalogo` / `crm_ejercicio_media` (paso siguiente para robustecer W2 con catalogo real ampliado).

## Sesion 41 â€” 2026-03-04

### Objetivo
- Avanzar W1 (citas) en Telegram con integraciÃ³n real no bloqueante y corregir bug runtime en W2.

### Cambios implementados
- âœ… `backend/src/routes/exercises.js`
  - AÃ±adido `import crypto from 'node:crypto'` para evitar `ReferenceError` en `POST /api/exercises/recommend` (`crypto.randomUUID`).
- âœ… `backend/src/routes/telegram.js`
  - W1 deja de estar en placeholder: cuando `intent.route === "appointment"` y confianza >= 0.6:
    - dispara webhook configurable `N8N_APPOINTMENT_WEBHOOK_URL`
    - envÃ­a payload estructurado con `request_id`, `patient_id`, `professional_id`, `chat_id`, `message_text`, `timestamp`
    - responde al paciente con mensaje de Ã©xito del workflow o fallback seguro.
  - Nuevo comando Telegram `/cita <inicio_iso> <fin_iso> [nota]` para solicitar cita sin depender del clasificador.
  - AÃ±adido logging tÃ©cnico en `crm_comunicaciones` (si existe tabla) para trazabilidad de intentos W1.
  - Umbral de confianza unificado en constante (`INTENT_CONFIDENCE_THRESHOLD`).
- âœ… `backend/.env.example`
  - AÃ±adida variable `N8N_APPOINTMENT_WEBHOOK_URL`.
  - Incluida URL de ejemplo local para W1: `http://localhost:5678/webhook/fisio/w1/appointment`.
- âœ… `.github/workflows/ci.yml`
  - CI backend ahora incluye `node --check src/routes/exercises.js`.
  - Nuevo job `n8n_json_validate` para validar parseo JSON de workflows versionados.
  - Fix adicional: parser JSON en CI limpia BOM UTF-8 (`\uFEFF`) para evitar falsos fallos.
- âœ… `backend/src/routes/professional.js`
  - Nuevos endpoints W1 para citas en `crm_citas`:
    - `GET /api/profesional/appointments`
    - `POST /api/profesional/appointments`
    - `PATCH /api/profesional/appointments/:appointmentId`
  - Incluye validaciÃ³n de fechas/estado/canal y control de solapes por fisioterapeuta.
  - Incluye resoluciÃ³n automÃ¡tica de IDs legacy (`pacientes`/`profesionales`) hacia modelo CRM (`crm_pacientes`/`crm_perfiles`) para compatibilidad con Telegram actual.
- âœ… `n8n/Fisio_IA_Agent/w1-appointment-agent.json`
  - Workflow W1 versionado en repo:
    - recibe webhook de solicitud de cita
    - normaliza payload
    - crea cita en backend si hay slot completo
    - devuelve respuesta JSON para Telegram (confirmaciÃ³n o solicitud de mÃ¡s datos).
- âœ… DocumentaciÃ³n alineada:
  - `README.md`: endpoints de citas y workflow W1 aÃ±adidos.
  - `n8n/README.md`: workflow W1 y endpoint de citas aÃ±adidos.
  - `n8n/telegram-bot.md`: nuevo comando `/cita` documentado.
- âœ… `frontend/src/pages/index.astro`
  - Nueva secciÃ³n SPA **Citas** (tabla agenda + refresh).
  - Carga desde `GET /api/profesional/appointments`.
  - CancelaciÃ³n desde UI con `PATCH /api/profesional/appointments/:appointmentId`.
  - MÃ©trica `Sesiones hoy` conectada a citas del dÃ­a.

### ReutilizaciÃ³n n8n (regla obligatoria)
- âœ… Revisados workflows existentes en `n8n/Fisio_IA_Agent/*` antes de ampliar W1.
- âœ… Reutilizado patrÃ³n webhook + respuesta segura ya presente en flujos y rutas actuales (sin crear flujo paralelo en repo).

### Pendiente inmediato
- [ ] Configurar `N8N_APPOINTMENT_WEBHOOK_URL` en backend productivo para activar W1 de extremo a extremo.
- [ ] Configurar credenciales/flow de Google Calendar en W1 para confirmaciÃ³n automÃ¡tica.
- [ ] Ejecutar E2E Telegram para ruta `appointment` y validar logs en `crm_comunicaciones`.

## Sesion 40 â€” 2026-03-04

### Requisito aÃ±adido: Responsive Design obligatorio (PC + MÃ³vil)
- âœ… `ARCHITECTURE.md` secciÃ³n 8 (UX Touchpoints): aÃ±adida regla obligatoria de responsive design con guÃ­as tÃ©cnicas (mobile-first CSS, sidebar colapsable, tablas adaptativas, targets 44x44px, viewport meta tag, breakpoints de verificaciÃ³n 375px / 1280px)
- âœ… `AGENT_RULES.md` nueva regla 6: todo cambio de frontend debe ser compatible con escritorio y mÃ³vil
- MotivaciÃ³n: el frontend se visualizaba correctamente en PC pero no en mÃ³vil

### Requisito aÃ±adido: ReutilizaciÃ³n obligatoria de workflows n8n
- âœ… `AGENT_RULES.md` nueva regla 7: antes de crear cualquier workflow/nodo en n8n, revisar TODOS los existentes y priorizar reutilizaciÃ³n
- âœ… Reforzada la regla operativa existente en CHANGELOG (SesiÃ³n 4+) sobre copiar/adaptar nodos funcionales

### Frontend Responsive implementado
- âœ… Sidebar: oculto por defecto en mÃ³vil (`transform: translateX(-100%)`), se abre como overlay con backdrop semitransparente
- âœ… JS sidebar toggle: detecta `isMobile()` para abrir overlay vs colapsar en desktop, cierra al clicar nav item o backdrop
- âœ… Metrics cards: grid 4col desktop â†’ 2col tablet â†’ 1col small mobile
- âœ… Agent panel: `max-height: 60vh` en mÃ³vil, fluye debajo del contenido principal
- âœ… Tables: `min-width: 560px` fuerza scroll horizontal en `.table-wrap` en mÃ³vil
- âœ… Touch targets: mÃ­nimo 44Ã—44px en botones, send, exercise, toggle
- âœ… Chat textarea: `font-size: 16px` para prevenir zoom en iOS
- âœ… Config grid: `1fr` en mÃ³vil, `minmax` adaptativo
- âœ… Breakpoints: 1100px (tablet), 768px (mobile), 480px (small mobile)
- âœ… Build validado: `astro build` OK, 0 errores
- âœ… Push a GitHub: commit `ce630f3` en `main`

### Security Hardening (RLS Policies) implementado
- âœ… Verificada habilitaciÃ³n de RLS en las 27 tablas de la base de datos Supabase.
- âœ… Aplicada migraciÃ³n para polÃ­ticas granulares RLS (38 nuevas polÃ­ticas `auth.uid()` para tablas del CRM y legacy).
- âœ… Funciones helper (`get_my_profile_id`, `get_my_profesional_id`) creadas.
- âœ… Resueltas advertencias de Supabase Security Advisor (asignado explÃ­citamente `search_path = public` a funciones y polÃ­ticas genÃ©ricas a `citas`/`usuarios`).

### Pendiente para prÃ³xima sesiÃ³n (Punto de Retorno)
- [ ] **[Manual EasyPanel]** Redeploy `fisio-frontend` y `fisio-backend` para aplicar cambios en producciÃ³n.
- [ ] E2E: Prueba completa multicanal Telegram + CRM + Supabase.
- [ ] W1: Citas + Google Calendar (requiere OAuth config manual).
- [ ] W3: CRM Trigger Button.

## Sesion 39 â€” 2026-03-04

### Prerequisitos completados
- âœ… MigraciÃ³n `schema_vnext.sql`: 12 tablas CRM nuevas creadas en Supabase (27 tablas totales)
  - `crm_perfiles`, `crm_pacientes`, `crm_asignaciones_fisio_paciente`, `crm_sesiones`, `crm_notas_seguimiento`
  - `crm_citas`, `crm_ejercicios_catalogo`, `crm_ejercicio_media`
  - `crm_recomendaciones`, `crm_recomendacion_items`, `crm_comunicaciones`, `crm_audit_log`
- âœ… RLS habilitado + polÃ­ticas service_role en todas las tablas CRM
- âœ… Triggers `updated_at` en 9 tablas CRM
- âœ… 16 ejercicios migrados de `ejercicios` â†’ `crm_ejercicios_catalogo` con metadata completa
- âœ… Bucket privado `ejercicios` creado en Supabase Storage (10MB, JPEG/PNG/GIF/WebP/MP4)
- âœ… Fix search_path en funciÃ³n `crm_set_updated_at` (advisory de seguridad)

### W2 â€” Agente IA de Ejercicios
- âœ… `backend/src/routes/exercises.js` â€” 4 endpoints:
  - `GET /catalog` â€” catÃ¡logo filtrable por zona, nivel, bÃºsqueda
  - `GET /:id/media` â€” signed URLs de Storage (1h expiry)
  - `POST /recommend` â€” core W2: sÃ­ntomas â†’ OpenAI â†’ ejercicios â†’ `crm_recomendaciones`
  - `GET /recommendations/:patientId` â€” historial de recomendaciones con items + ejercicio details
- âœ… Edge Function `exercise-recommend` desplegada en Supabase (gpt-4o-mini, ACTIVE)
  - System prompt con reglas de seguridad (red flags, contraindicaciones)
  - Respuesta JSON estructurada obligatoria
  - Fallback automÃ¡tico: si `N8N_EXERCISE_WEBHOOK_URL` no configurada â†’ Edge Function directo
- âœ… Ruta registrada en `index.js` como `/api/exercises` y `/api/ejercicios`
- âœ… `.env.example` actualizado con `N8N_EXERCISE_WEBHOOK_URL` y `OPENAI_API_KEY`

### Flujo W2 completo
```
Frontend/Telegram â†’ POST /api/exercises/recommend
  â†’ Backend carga catÃ¡logo de crm_ejercicios_catalogo
  â†’ Llama Edge Function exercise-recommend (o n8n webhook)
  â†’ OpenAI gpt-4o-mini selecciona 3-5 ejercicios
  â†’ Guarda en crm_recomendaciones + crm_recomendacion_items
  â†’ Genera signed URLs de media
  â†’ Devuelve respuesta con ejercicios + mensajes para paciente y fisio
  â†’ Log en crm_comunicaciones
```

### Pendiente para prÃ³xima sesiÃ³n
- [ ] Configurar `OPENAI_API_KEY` como secreto en Edge Functions (Dashboard â†’ Edge Functions â†’ Secrets)
- [ ] W1: Citas + Google Calendar (requiere OAuth config manual)
- [ ] E2E: Prueba completa multicanal Telegram + CRM + Supabase
- [ ] RLS policies granulares para autenticaciÃ³n de usuarios

### W0 â€” Router de IntenciÃ³n
- âœ… Edge Function `intent-router` desplegada (gpt-4o-mini, temperature 0.1, max 100 tokens)
  - Clasifica mensajes en: `exercise`, `appointment`, `session_note`, `unknown`
  - JSON output con `route`, `confidence`, `reasoning`
- âœ… `telegram.js` actualizado: mensajes free-text pasan por W0 antes de procesarse
  - Si `exercise` + confidence â‰¥ 0.6 â†’ auto-recomendaciÃ³n W2 + respuesta en Telegram
  - Si `appointment` + confidence â‰¥ 0.6 â†’ placeholder (W1 pendiente)
  - Fallback graceful: si W0 falla â†’ comportamiento original (crear intake)

### W3 â€” Trigger Web CRM
- âœ… BotÃ³n ðŸ‹ï¸ "Recomendar ejercicios" aÃ±adido al panel Agente ClÃ­nico IA (botÃ³n amber)
  - EnvÃ­a sÃ­ntomas directamente a `POST /api/exercises/recommend`
  - Muestra respuesta estructurada: alertas, ejercicios, confianza, razones, mensaje para paciente
  - Usa `selectedPatientId` del SPA para vincular al paciente seleccionado
- âœ… CSS: gradiente amber (#c9871c â†’ #e6a840) diferenciado del send-btn azul
- âœ… Hints actualizados: "Ctrl+Enter = Agente IA Â· ðŸ‹ï¸ = Ejercicios AI"
## Pivot de Alcance (Objetivo Actual) â€” 2026-03-03

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

## [Sesion 33] - 2026-03-03 (RediseÃ±o Front + alineacion benchmark Fisiomap IA)
### Objetivo
- Mejorar de forma visible el diseÃ±o del CRM frontend para una apariencia mas profesional y moderna, manteniendo la funcionalidad actual.
- Aprovechar seÃ±ales del benchmark publico `https://fisiomap.app/fisiomap-ia/` para reforzar enfoque de producto (prevencion, continuidad asistencial, interoperabilidad y gobernanza de datos).

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
  - RediseÃ±o de `pages/index.astro` con interfaz profesional + chat agente
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
- RevisiÃ³n de consistencia de workflows Fisio por API: **HECHO**.

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
1. **[Manual EasyPanel]**: Crear App desde GitHub (rama `main`), root directory `/frontend`, build vÃ­a `Dockerfile`.
2. **[Manual GitHub]**: Configurar branch protection en `main` desde la consola web.
3. **[Manual E2E]**: Ejecutar interactuaciÃ³n real Telegram (`/start`, `/plan`, `/dolor`) desde mÃ³vil y revisar `mensajes_ingesta_paciente` en Supabase.
4. **[Pendiente Seguridad]**: Rotar credenciales sensibles.

### Como retomar rapido
1. Ejecutar `.\scripts\frontend-local-build.ps1` y previsualizar con `npx serve C:\temp\Fisio_IA_Agent_frontend_local\dist -l 4173`.
2. Acometer los 4 puntos "Pendientes inmediatos" descritos arriba para cerrar la integraciÃ³n continua y el E2E.

---

## 2026-03-03 - Sesion 25: Hardening Docker frontend + verificacion de plataformas

### Objetivo
- Preparar el frontend para despliegue en EasyPanel y verificar el estado de todas las plataformas.

### Cambios implementados
- Frontend (`frontend/Dockerfile`):
  - AÃ±adido `HEALTHCHECK` con `wget` contra `/health` cada 30s.
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
1. EasyPanel â†’ Proyecto `n8n` â†’ **+ Create Service** â†’ **App**.
2. Nombre: `fisio-frontend`.
3. Source: GitHub â†’ `https://github.com/raulruizproyectos/Fisio_IA_Agent.git` â†’ `main` â†’ Root: `/frontend`.
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
- `POST /api/agent/message` â†’ OK:
  - `source: n8n_agent`, `fallback_used: false`, `n8n_unreachable: false`
  - `reply_text` con contenido de negocio funcional.
- `GET /api/profesional/intakes/pending?profesional_id=...` â†’ OK con datos.
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

## [SesiÃ³n 26] - 2026-03-03
### Tareas Realizadas
1. **Frontend SPA Completa**: ReestructuraciÃ³n masiva de `index.astro` (colapsados los mÃ³dulos en una autÃ©ntica *Single Page Application* navegable vÃ­a menÃº lateral sin recargar pÃ¡gina).
2. **Nuevas secciones implementadas**:
   - `Pacientes`: Fetch a `/api/pacientes` y renderizado de tabla (incluyendo mÃ©trica "Pacientes activos").
   - `Intakes Pendientes`: Fetch a `/api/profesional/intakes/pending` con visualizaciÃ³n completa (incluye estado de alertas rojas).
   - `Videos`: Placeholder estructurado para la revisiÃ³n manual (flujo basado en DB de Supabase/n8n).
   - `Historial`: Placeholder preparado para cargar notas de evoluciÃ³n del paciente.
   - `ConfiguraciÃ³n`: Panel avanzado que realiza un "Health Check" dinÃ¡mico consultando tanto `/api/health` como `/api/agent/message` (test con role=test) para verificar si la caÃ­da es del backend o de n8n exclusivamente.
3. **ValidaciÃ³n build local**: Refactor CSS y JS SPA completado sin problemas (`astro build` y `astro check` en `C:\temp\Fisio_IA_Agent_frontend_local` con 0 errores).

### Siguientes Pasos (Punto de pausa)
1. **Frontend Backend Hooks**: Enlazar los botones "Revisar/Ver" de las nuevas tablas para que disparen *modals* dinÃ¡micos o detalles.
2. **Despliegues Pendientes**: Ejecutar paso-a-paso manual en EasyPanel y probar todo integrado en producciÃ³n.

---

## [SesiÃ³n 27] - 2026-03-03
### Objetivo
- Cerrar el pendiente de integraciÃ³n frontend-backend dejado en la sesiÃ³n 26 para acciones reales de revisiÃ³n.

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
     - botÃ³n `Revisar` ahora abre historial real del paciente (sin `alert()`).
   - Tabla pacientes:
     - botÃ³n `Ver` ahora abre historial del paciente seleccionado.
   - Tabla intakes completa:
     - se aÃ±ade columna `Acciones` con botÃ³n `Historial`.
   - Tabla videos:
     - deja de ser placeholder y carga datos reales con:
       - `GET /api/profesional/video-jobs?profesional_id=...`
     - mÃ©trica `Videos en revisiÃ³n` calculada por estado.
   - SecciÃ³n historial:
     - carga datos reales de:
       - `GET /api/pacientes/:id`
       - `GET /api/profesional/patients/:patientId/history`
     - render de notas de seguimiento + eventos de video.

### Validaciones
- Sintaxis backend verificada con `node --check backend/src/routes/professional.js` -> OK.
- ComprobaciÃ³n estÃ¡tica del frontend:
  - sin `onclick="..."` inline para acciones de revisar/ver.
  - referencias nuevas a `/api/profesional/video-jobs` y `loadHistorial` presentes.

### Decisiones tecnicas
- Mantener interacciÃ³n en SPA mediante `data-action` + delegaciÃ³n de eventos para evitar handlers inline.
- Reutilizar endpoint de historial ya existente para no duplicar lÃ³gica en frontend.

### Pendientes inmediatos
1. **[Manual EasyPanel]** desplegar `fisio-frontend` con root `/frontend` y verificar `/health`.
2. **[Manual E2E Telegram]** ejecutar `/start`, `/plan`, `/dolor` con paciente real y validar DB.
3. **[Manual GitHub]** activar branch protection en `main`.
4. **[Seguridad]** rotar credenciales expuestas en sesiones tÃ©cnicas.

### Como retomar rapido
1. Push de `main` con cambios de sesiÃ³n 27.
2. Deploy manual del frontend en EasyPanel.
3. Probar flujo UI:
   - Dashboard -> `Revisar`
   - Pacientes -> `Ver`
   - Videos -> `Historial`
4. Confirmar que la secciÃ³n historial muestra notas/eventos del paciente seleccionado.

---

## [SesiÃ³n 28] - 2026-03-03
### Objetivo
- Reorganizar infraestructura EasyPanel en proyecto dedicado `fisio-ia-agent` y dejar backend/frontend operativos.

### Cambios de infraestructura ejecutados (EasyPanel API)
1. Proyecto:
   - Eliminado: `openclaw`.
   - Creado: `fisio-ia-agent`.
2. MigraciÃ³n de servicios:
   - `fisio-backend` movido de `n8n` -> `fisio-ia-agent`.
   - `fisio-frontend` movido de `n8n` -> `fisio-ia-agent`.
   - Proceso aplicado con `services.common.rename` (previo `stopService`, posterior `startService`).
3. Backend:
   - Estado final: operativo.
   - VerificaciÃ³n: `GET https://fisio-backend.b5xbaf.easypanel.host/api/health` -> 200.
4. Frontend (configuraciÃ³n aplicada):
   - Source Git: `main`, path `/frontend`.
   - Build probado:
     - `nixpacks` (no estable en runtime).
     - `dockerfile` (`build.file = Dockerfile`).
   - Dominio corregido tras movimiento:
     - de `n8n-fisio-frontend.b5xbaf.easypanel.host`
     - a `fisio-frontend.b5xbaf.easypanel.host`.

### Cambio de cÃ³digo para desbloqueo de build frontend
- Archivo: `frontend/Dockerfile`
- Commit: `c3a8aae`
- Cambio:
  - `COPY package.json package-lock.json* ./`
  - -> `COPY package*.json ./`
- Motivo: evitar fallo cuando no existe `package-lock.json`.

### Estado final de la sesiÃ³n
- Backend: OK en producciÃ³n.
- Frontend:
  - Deploy toma commit `c3a8aae` correctamente.
  - Sigue devolviendo `502` en `https://fisio-frontend.b5xbaf.easypanel.host/`.
  - DiagnÃ³stico tÃ©cnico observado:
    - `monitor.getDockerTaskStats`: `fisio-ia-agent_fisio-frontend` -> `actual: 0`, `desired: 1`.
    - `projects.getDockerContainers` para frontend -> `[]` (sin contenedor en ejecuciÃ³n).
    - `services.common.getServiceError` -> `null` (sin detalle de error expuesto por API).

### Punto exacto para retomar
1. Inspeccionar en EasyPanel UI el historial/log de deploy del servicio `fisio-frontend` (falla de task sin contenedor vivo).
2. Revisar task failure reason en Docker Swarm del host (si se dispone de consola).
3. Aplicar fix segÃºn log real (build/runtime) y redeploy.
4. Confirmar objetivo:
   - `https://fisio-frontend.b5xbaf.easypanel.host/` -> 200
   - `monitor.getDockerTaskStats` frontend -> `actual: 1`, `desired: 1`.

---

## [SesiÃ³n 29] - 2026-03-03 (Punto de situaciÃ³n previo a nueva arquitectura)
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

### Estado de cÃ³digo y ramas
- Rama: `main` actualizada en remoto.
- Ãšltimos commits relevantes:
  - `cd47cba` docs: migraciÃ³n a `fisio-ia-agent` + estado frontend 502.
  - `c3a8aae` fix frontend Dockerfile para no exigir lockfile.
  - `e6d3a6c` backend `video-jobs` robusto sin join sensible al schema cache.

### Riesgo/bloqueo vigente
- Bloqueo principal: frontend no consigue iniciar contenedor en EasyPanel (resultado externo 502) pese a build/deploy aplicados.
- Siguiente paso tÃ©cnico recomendado para desbloqueo:
  - inspecciÃ³n de logs de task/container fallido en UI EasyPanel (o Swarm host) para causa exacta.

### Preparado para siguiente fase
- Se deja el sistema en estado apto para redefinir arquitectura de `Fisio_IA_Agent` sin perder trazabilidad:
  - backend operativo,
  - frontend en bloqueo acotado,
  - documentaciÃ³n de continuidad al dÃ­a.

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
- AÃ±adido `ARCHITECTURE.md` con blueprint completo.
- AÃ±adidas reglas y skills en `.agents/`.
- AÃ±adido `database/schema_vnext.sql` (propuesta aditiva para CRM + Agents).

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
3. Crear/validar bucket privado `ejercicios` y convenciÃ³n de `object_key`.
4. Implementar en n8n:
   - W0 Router Telegram
   - W1 Citas (Calendar + logging)
   - W2 Ejercicios (OpenAI + catalogo + signed URLs JIT)
   - W3 Trigger Web CRM
5. Cablear botÃ³n CRM -> backend -> n8n (W3) y registrar `request_id` end-to-end.

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
---

## [Sesion 38] - 2026-03-17 (Cockpit publicado + rail del copilot afinado)
### Objetivo
- Recuperar la fuente real del deploy, estabilizar el frontend visible en produccion y dejar el rail del agente utilizable para seguir evolucionando el producto desde ahi.

### Cambios aplicados
- Se alineo el trabajo local con `origin/main`, que era la fuente real del servicio `fisio-frontend`.
- Se identifico que la URL publica habia estado sirviendo una build rota con markup corrupto y estilos heredados conflictivos.
- Se rehizo y publico la home como cockpit de producto en `frontend/src/pages/index.astro`.
- Se reforzo el rail del agente de ejercicios:
  - cabecera clara con contraste correcto,
  - badge de conexion legible,
  - textarea mas compacto,
  - estado vacio mas claro,
  - auto-resize del composer limitado para no invadir el rail.
- Se sincronizo tambien parte de la realidad de n8n:
  - anadido `n8n/Fisio_IA_Agent/vnext/w5-calendar-reader.json`
  - documentado el drift repo vs instancia viva en `docs/n8n/live_vs_repo_sync_20260317.md`

### Verificaciones
- `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` -> OK
- `npm run check` en `C:\Temp\Fisio_IA_Agent_frontend_local` -> `0 errors`, `0 warnings`, `11 hints`

### Commits de sesion
- `c0b0aa0` - `fix: repair cockpit and exercise copilot UI`
- `7b9bf04` - `fix: improve copilot rail contrast and composer`

### Estado al cierre
- GitHub queda sincronizado en `origin/main`.
- El siguiente paso exacto es redeploy de `fisio-frontend` para ver el ultimo ajuste del rail en la URL publica.
- Despues de validar visualmente ese redeploy, la siguiente iteracion ya debe centrarse en funcionalidad real del agente de ejercicios, agenda online y automatizacion administrativa.