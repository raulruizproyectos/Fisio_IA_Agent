# Agente de citas por Telegram

Estado al 13 de octubre de 2026:

| Nivel | Estado |
| --- | --- |
| Implementado | Sí, en local (sin commit) |
| Probado | Sí, en local con dobles de BD, Telegram y n8n: 135/135 (incluye Plan B, festivos, citas pendientes y avisos; 4 mutaciones detectadas) |
| Desplegado | No |
| Activo | No. `TELEGRAM_PILOT_BOOKING_ENABLED` sigue desactivado y el bot de pacientes sigue usando la ruta heredada |

## Estado inicial (HEAD `ee3449c`)

1. **Bot activo:** n8n «Bot paciente» → `/api/telegram/incoming`, en modo `patient_appointments` y con LLM gpt-4o-mini. Problemas en [AUDITORIA.md](AUDITORIA.md), P0-1.
2. **Piloto desactivado:** `/api/telegram/pilot-incoming` + `lib/patient-booking.js`. Tenía buena base (clínica fija, deduplicación, invitación con hash, exclusión SQL), pero:
   - solo hacía reservas;
   - no admitía pacientes nuevos;
   - afirmaba «confirmada» sin evidencia de Calendar;
   - quedaba mudo ante fallos de lectura;
   - no recuperaba las operaciones inciertas.

Se eligió completar la vía 2 y no ampliar la 1: tiene mejores garantías y menos código.

## Diseño

```
Telegram ──▶ n8n «Bot paciente» (Telegram Trigger) ──▶ POST /api/telegram/pilot-incoming   (cabecera secreta)
                                                     │  dedup por update_id (crm_mensajeria_eventos)
                                                     ▼
                                     lib/patient-booking.js · handlePatientMessage()
                                      identidad · estado · reglas · 24 h · recuperación
                                                     │ reutiliza
                       professional.js: buildPublicBookingSlots · createCrmAppointment · updateCrmAppointment
                                                     │
                                     crm_citas (exclusión SQL, request_id único) + Calendar
                                                     ▼
                              respuesta { text, options, requestContact } ──▶ Bot API (teclado de opciones)
```

- **n8n orquesta y el backend decide.** n8n conserva el disparador de Telegram y reenvía el update sin tocarlo. Identidad, permisos, regla de 24 h, disponibilidad, idempotencia y estado viven en el backend, con pruebas y RLS. Si el backend no responde, n8n envía un aviso que no confirma nada.
- **Independiente del canal.** El dominio devuelve `{ text, options, requestContact }`:
  - Telegram muestra las opciones como teclado.
  - WhatsApp ya usa la misma función y añade «Opciones: …» como texto.
- **Sin LLM.** La conversación se resuelve con botones, palabras clave y el intérprete de fechas existente (Europe/Madrid).
  - Coste por mensaje: 0 €.
  - Latencia: lo que tarden las lecturas.
  - El modelo no puede inventar horarios ni confirmaciones.
  
  Un LLM solo aportaría frases libres más naturales. Si se añade, debe limitarse a clasificar la intención y redactar, con presupuesto autorizado.
- **Estado persistido** en `crm_mensajeria_vinculos.reserva` con versión optimista. Las selecciones caducan a los 10 minutos.

## Funciones y reglas implementadas

| Requisito | Implementación |
| --- | --- |
| Paciente existente | Código de la clínica: 96 bits, un solo uso, se guarda solo su hash y caduca en 30 min. Se genera en la ficha («Preparar invitación», mismo endpoint `/api/telegram/link-code` cuando el agente está activo) y se usa con `t.me/<bot>?start=CÓDIGO` o `VINCULAR CÓDIGO`. |
| Paciente nuevo | Botón «Compartir mi teléfono» (`request_contact`). Se exige `contact.user_id === from.id`, es decir, el teléfono del propio titular verificado por Telegram. Después se pide nombre y al menos un apellido, se crea la ficha mínima y queda constancia del consentimiento. |
| No revelar por conocer datos | El nombre, el email o el teléfono escritos no dan acceso a nada. Si el teléfono verificado coincide con una ficha existente, no se vincula ni se crea otra: se pide el código a la clínica. |
| Consultar | Solo citas propias, activas y futuras, con su estado y aviso de «calendario pendiente de comprobar». Un fallo de lectura se dice como tal: «No significa que no tengas ninguna». |
| Reservar | Huecos reales del día (CRM + Calendar). Elección por hora o número y resumen con fecha completa. Requiere CONFIRMAR. |
| Cambiar | Elige la cita, aplica 24 h, ofrece huecos nuevos (excluyendo la propia cita) y pide confirmación. Se actualiza la misma fila con su versión (`updated_at`): nunca se anula para reservar después. |
| Anular | Elige la cita, aplica 24 h, pide confirmación y la marca como `cancelada`. «Cancelar» a secas aclara si se refiere a una selección o a una cita. |
| Regla de 24 h | `patientMayChange`: compara instantes (`inicio - ahora >= 24 h`). Se comprueba al elegir la cita y otra vez al confirmar. Con menos tiempo se registra una solicitud de llamada (Plan B) y la cita no se toca. |
| Revalidación | Antes de crear o mover se vuelven a leer los huecos. Después, `createCrmAppointment/updateCrmAppointment` comprueban la disponibilidad y la exclusión SQL impide solapamientos. |
| Confirmación veraz | «Cita confirmada» solo si la cita está guardada y Calendar sin pendiente. Con Calendar pendiente: «registrada en la clínica, pero su calendario aún no la ha confirmado. No la repitas». |
| Incertidumbre | Antes de cada mutación se guarda `processing` con su referencia (`request_id` o cita + versión). Ante error o un mensaje posterior se recupera leyendo; nunca se repite. Solo se declara «no aplicada» tras leer 5 minutos después. |
| Duplicados | `update_id` deduplicado; CONFIRMAR repetido no crea otra cita; dos mensajes simultáneos → conflicto de versión → «repite tu última respuesta». |
| Recordatorios | Se mantiene el cron de 23–25 h. El vínculo del agente prevalece; la baja (BAJA/STOP) elimina el destino; se incluyen las citas `reprogramada`; la entrega incierta no se reenvía. |
| Identificación | «asistente automático de citas de {clínica}». No se presenta como persona. |
| Configuración | Nombre, teléfono y email de `crm_clinicas` (editables en Configuración › Datos de la Consulta). Horario `PUBLIC_BOOKING_WINDOWS` (obligatorio en readiness) y `PUBLIC_BOOKING_SLOT_MINUTES`. Festivos locales y cierres: `BOOKING_EXTRA_HOLIDAYS`. Profesional: `MESSAGING_PILOT_PROFESSIONAL_ID`. |

## Plan B, festivos y citas pendientes (13-oct-2026, decisiones de Raúl)

**Plan B: siempre una respuesta satisfactoria.** Cuando el agente no puede completar una petición, guarda una fila en `crm_solicitudes_contacto` **antes** de decir «Tu petición ha quedado registrada. Te llamaremos…».
- Motivos: `sin_hueco` (botones «Otro día» / «Que me llamen»), `lectura_fallida`, `incierto` (sin tocar la operación pendiente), `conflicto` (Calendar por comprobar), `otro_profesional`, `telefono_existente`, `no_entendido` (tras dos intentos se ofrece la llamada), `menos_24h`, `revisar_paciente_nuevo` y `peticion_paciente` («que me llamen» en cualquier momento).
- Teléfono: el de la ficha o el verificado por Telegram; si no hay, se pide solo ese dato.
- Sin duplicados: una solicitud abierta por paciente (o chat) y motivo; si se repite, «ya estaba registrada» y no hay segundo aviso.
- Si falla el guardado no se dice «registrada»: «inténtalo en unos minutos» y, como último recurso, el teléfono/email de `crm_clinicas`.
- La clínica la ve en **Inicio › Solicitudes de contacto** (Llamar · En gestión · Resuelta) y recibe un aviso por Telegram (bot profesional) a través de n8n. El agente nunca dice «la clínica ha sido avisada».

**Horario y festivos.** De lunes a viernes, 09:00–13:00 y 15:00–19:00, huecos de 60 min. `lib/clinic-calendar.js` bloquea, sin red, los festivos nacionales y de Cataluña (fijos, Viernes Santo y Lunes de Pascua) y las fechas de `BOOKING_EXTRA_HOLIDAYS` (festivos locales de Terrassa y cierres). Se aplica a la web pública (también si alguien envía la reserva directamente a la API: `slot_not_offered`), al agente y a la ruta heredada (que tenía La Mercè y Sant Marçal, que no son festivos de Terrassa).

**Pacientes nuevos.** `crm_pacientes.origen_alta = 'asistente_telegram'` y `revisada_en` vacío ⇒ sus reservas se crean `pendiente`: «Solicitud de cita registrada para…, pendiente de confirmación por la clínica. Te confirmaremos por aquí». También generan una solicitud `revisar_paciente_nuevo`. En la ficha aparece «Marcar ficha revisada»; desde entonces sus reservas se confirman directamente.

**Avisos al paciente (siempre, a cualquier paciente con el chat vinculado).** Cuando la clínica crea, confirma, cambia o anula una cita desde el CRM, se guarda un aviso en `crm_avisos_paciente` (uno por versión de la cita) y n8n lo envía por el bot de pacientes. Sin baja (BAJA) y solo citas futuras. Un envío dudoso no se repite; lo que seguro no salió se reintenta cada 15 min (`/api/cron/avisos-agente`, máximo 5 intentos).

No existen en el modelo de datos servicios ni precios, así que el agente no los menciona.

## Archivos modificados o nuevos

- `backend/src/lib/patient-booking.js`: núcleo del agente.
- `backend/src/routes/telegram.js`:
  - `/pilot-incoming` acepta contacto, muestra teclados y responde también ante errores;
  - `sendTelegramMessage` con `reply_markup` y timeout;
  - `link-code` usa invitaciones seguras con el agente activo.
- `backend/src/routes/whatsapp.js`: misma función de dominio.
- `backend/src/routes/professional.js`:
  - `updateCrmAppointment` extraído del PATCH, que sigue con el mismo contrato;
  - huecos con una lectura por día;
  - Calendar sin descargar el ICS de festivos.
- `backend/src/routes/reminders.js`: baja, `reprogramada` y texto.
- `database/migrations/20261013120000_booking_agent_onboarding.sql`: `paciente_id` admite nulo **solo** en la fase de alta, con `CHECK` que impide consentimiento sin paciente.
- `n8n/Fisio_IA_Agent/pendiente-activacion/bot-pacientes.json`: flujo que sustituye a «Bot paciente».
- Pruebas: `test/booking-agent.test.js` (14), `test/reminders.test.js` (+1), `test/n8n-production.test.js` (+1) y `test/messaging-pilot.test.js` (el doble admite `delete`).

## Contrato final

El contrato de [PROMPT_AGENTE_CITAS.txt](../PROMPT_AGENTE_CITAS.txt) se aplica **en código**, no como prompt:
- tono y presentación: textos de `patient-booking.js`;
- fuentes únicamente de la API: huecos y citas leídos en cada paso;
- identidad: código o contacto verificado;
- 24 h: `patientMayChange`;
- confirmación veraz: `createdReply/changedReply`;
- incertidumbre: `recoverProcessing`;
- derivación: `contactSentence`.

Si en el futuro se añade un LLM, el prompt es útil como instrucción del redactor, con estas herramientas reales y solo lectura de intención: `consultar_huecos(fecha)`, `mis_citas()`, `preparar_reserva(hueco)`, `preparar_cambio(cita, hueco)`, `preparar_anulacion(cita)`. **La confirmación seguiría siendo un CONFIRMAR literal procesado por el backend.**

Ejemplo de conversación (datos ficticios):

```
Paciente: Hola
Bot: Hola, soy el asistente automático de citas de Clínica Ficticia. Si ya eres paciente, envía VINCULAR y el código…  [Compartir mi teléfono]
Paciente: (comparte su contacto)            Bot: Teléfono verificado. ¿Cuál es tu nombre y apellidos?
Paciente: Carmen Prueba                     Bot: Listo, Carmen. ¿Qué quieres hacer?  [Reservar cita][Mis citas][Cambiar cita][Anular cita]
Paciente: Reservar cita                     Bot: ¿Para qué día? Por ejemplo «mañana», «el lunes»…
Paciente: el jueves                         Bot: Horarios libres el jueves, 15 de octubre de 2026: … [09:00][10:00][11:00]…
Paciente: 10:00                             Bot: Has elegido el jueves, 15 de octubre de 2026, 10:00. ¿Confirmas la reserva? [CONFIRMAR][NO]
Paciente: CONFIRMAR                         Bot: Cita confirmada para el jueves, 15 de octubre de 2026, 10:00. Te enviaremos un recordatorio el día anterior.
```

## Límites conocidos

- Comprensión de texto libre limitada: palabras clave y fechas. Lo que no entiende vuelve al menú. Una petición como «quiero mover la cita al viernes» inicia el cambio, pero pregunta el día otra vez.
- Un solo profesional (configuración del piloto). Las citas con otros profesionales se derivan a la clínica.
- Si n8n contesta con error a un envío de Telegram que en realidad salió, el reintento podría duplicar ese aviso (caso raro; los tiempos de espera y los 5xx no se reintentan).
- Los festivos locales de Terrassa de 2027 aún no están en `BOOKING_EXTRA_HOLIDAYS`: hay que añadirlos cuando el Ayuntamiento los publique.
- Si el chat se pierde entre el alta y su vínculo (fallo entre dos escrituras), la ficha queda creada y el chat indica que la clínica debe completar la vinculación. Se ve en `crm_mensajeria_vinculos.reserva.onboarding = 'creating'`.
- WhatsApp: no hay alta de pacientes nuevos. La identidad del canal es el propio número; se diseñará al integrar el proveedor.
- La migración no se ha ejecutado en PostgreSQL: PGlite no está instalado y no se instaló nada.

## Checklist de activación (cada paso requiere tu autorización expresa y separada)

Orden pensado para no dejar nunca a un paciente sin respuesta. Marca cada paso al terminarlo.

**Estado 2026-10-13:** pasos 1–9 hechos y verificados (detalle en [STATUS.md](../STATUS.md)). Pendientes el 10 (prueba de Raúl) y el 11.

1. **Copia previa de Supabase** (Dashboard › Database › Backups, o `pg_dump`). Comprobar que existe y su fecha.
2. **Migraciones en Supabase**, en este orden, desde el SQL Editor:
   1. `database/migrations/20261013120000_booking_agent_onboarding.sql`
   2. `database/migrations/20261013150000_contact_requests_patient_notices.sql`

   Verificar: existen `crm_solicitudes_contacto` y `crm_avisos_paciente`, y `crm_pacientes` tiene `origen_alta` y `revisada_en`.
3. **Datos de la clínica** en `crm_clinicas`: teléfono `623983731` y email provisional de Raúl. Se puede hacer desde el CRM (Configuración › Datos de la Consulta › Guardar) una vez desplegado, o por SQL con tu OK.
4. **Commit y push** de los cambios locales (rama `main`).
5. **Variables del backend** (Easypanel), sin imprimirlas:
   - `PUBLIC_BOOKING_WINDOWS=09:00-13:00,15:00-19:00`, `PUBLIC_BOOKING_SLOT_MINUTES=60`, `BOOKING_EXTRA_HOLIDAYS=` (locales de Terrassa y cierres cuando se conozcan)
   - `TELEGRAM_PILOT_BOOKING_ENABLED=true`, `MESSAGING_PILOT_CLINIC_ID`, `MESSAGING_PILOT_PROFESSIONAL_ID`, `TELEGRAM_PATIENT_BOT_TOKEN`, `TELEGRAM_PATIENT_BOT_USERNAME`, `TELEGRAM_PILOT_WEBHOOK_SECRET` (≥ 32 caracteres)
   - `N8N_CONTACT_REQUEST_WEBHOOK_URL=…/webhook/fisio/agente/solicitud-contacto`, `N8N_PATIENT_NOTICE_WEBHOOK_URL=…/webhook/fisio/agente/aviso-paciente` (con `N8N_WEBHOOK_SECRET` ya existente)
6. **Despliegue del backend** y comprobación de `/api/health/readiness`: `booking_hours` configurado y tablas del agente `ok`.
7. **n8n — credencial** Header Auth «Fisio Telegram Agente Citas» con `x-telegram-bot-api-secret-token` = `TELEGRAM_PILOT_WEBHOOK_SECRET`.
8. **n8n — flujo de avisos**: importar `n8n/Fisio_IA_Agent/pendiente-activacion/avisos-agente-citas.json`. Revisar credenciales (header de webhooks, bot profesional `FisioIAAgent`, bot de pacientes, clave interna) y que `crm_perfiles.telegram_chat_id` del fisio esté relleno (si no, poner su chat en el nodo «Aviso al fisio»). Activarlo.
9. **n8n — sustituir «Bot paciente»** por `pendiente-activacion/bot-pacientes.json`: mismo disparador y credencial del bot, nunca dos flujos activos con el mismo disparador. Con esto se cierra el P0.
10. **Prueba con paciente ficticio** ([PRIMERA_PRUEBA.md](PRIMERA_PRUEBA.md), parte B): alta nueva → reserva queda `pendiente` → aparece en Inicio y llega aviso al fisio → confirmar en Agenda → el paciente recibe «La clínica ha confirmado…» → «Que me llamen» → solicitud y aviso → marcar Resuelta. Probar un festivo y una cita a menos de 24 h.
11. **Tras una semana sin incidencias**, eliminar la rama heredada `patient_appointments` de `/incoming`.

## Integración futura con WhatsApp

- La lógica ya es común (`handlePatientMessage`).
- El adaptador de OpenWA existe para el piloto. Para producción conviene la API oficial de Meta, que tiene plantillas de recordatorio y ventana de 24 h.
- Habrá que decidir cómo verificar el contacto nuevo (el remitente es el propio número) y convertir las opciones en botones o listas interactivas.
- No se instaló ni activó nada.
