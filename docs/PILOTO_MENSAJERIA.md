# Piloto de Telegram y WhatsApp

## Estado vigente — 2026-10-13

Backend `ee3449c` y frontend `c062967` desplegados. Los bots Telegram paciente/profesional y los doce workflows n8n de Fisio están activos y coinciden con fuente; getMe/dry_run comprobados, sin entrega clínica real de mensajes. Recordatorios horarios ya activos para pacientes vinculados y citas entre 23 y 25 horas; vista previa cero candidatos.

El piloto separado de reserva `TELEGRAM_PILOT_BOOKING_ENABLED` y OpenWA/WhatsApp siguen desactivados. La reserva pública web y el código de reserva guiada no equivalen a activar ese piloto. Telegram es la preferencia actual del usuario por facilidad/coste; la segunda auditoría debe seguir cada entrada/bot/workflow y separar implementado, activo, comprobado y pendiente. [Prompt](DESIGN_RESOURCES.md). No activar canales, vincular pacientes o enviar para «comprobar» sin autorización específica.

## Requisitos nuevos confirmados — implementación local para CloudCode

El usuario exige completar el agente de citas, no dejarlo como propuesta si faltan funciones. CloudCode debe auditar y completar su implementación local y pruebas; los flags productivos siguen desactivados hasta autorización de activación. [Contrato conversacional](PROMPT_AGENTE_CITAS.txt), todavía sin integrar.

| Decisión | Requisito de aceptación |
| --- | --- |
| Telegram primero, WhatsApp futuro | Lógica de negocio reutilizable sin instalar/activar ahora otro proveedor; contratos y límites por canal documentados. |
| Nuevos y existentes | Alta mínima y verificación concreta del contacto; no vincular/revelar historia por nombre/teléfono/email sin comprobar titularidad. |
| Reserva y gestión completa | Consultar citas propias, reservar, cambiar y cancelar con confirmación explícita; solo disponibilidad/configuración real, sin horarios/precios inventados. |
| Antelación | Cambios/cancelaciones permitidos con al menos 24 horas hasta el inicio; con menos, deriva a clínica. Comparar instantes en servidor y mostrar Europe/Madrid; probar umbral exacto y DST. |
| Recordatorios | Mantener pacientes vinculados/cita activa entre 23–25 horas; deduplicación y estado de entrega persistidos. |
| Naturalidad y fiabilidad | Respuestas claras de asistente, intención ambigua aclarada; backend determina permisos/estado/acciones, el modelo no los inventa. |
| Calendar e incertidumbre | Persistencia CRM y evidencia Calendar diferenciadas; recuperación por lectura, idempotencia y exclusión SQL, sin recrear ni reenviar a ciegas. |
| Pruebas | Fixtures para identidad ajena, nuevos/existentes, solapamiento, doble mensaje, cambios/cancelación/24h, selección caducada, caída/timeout/reinicio, baja y entrega incierta. Separar probado localmente de validación/activación real. |

Estas son decisiones objetivo del 13 de octubre, no afirmaciones de que el piloto desplegado ya cumpla todas las funciones. Horarios, duración, servicios, profesionales y contacto proceden de la configuración real; lo ausente se consulta al usuario. LLM con gasto/envíos reales/publicación/activación necesitan permisos separados. Las reservas guiadas históricas siguientes solo cubrían un alcance menor.

Las secciones siguientes describen la preparación histórica del piloto del 7 de octubre; no son instrucciones para reaplicar migraciones o desplegar versiones ya superadas. [Estado y pruebas actuales](PRODUCTION_TESTING.md).

## Historia — preparación del piloto

Decisión del usuario: OpenWA solo para piloto. Código preparado el 7 de octubre de 2026; sin despliegue, números conectados ni envíos reales. La API oficial de Meta continúa siendo la opción propuesta para producción.

El producto se centra exclusivamente en Fisioterapia Carla JL. Se conserva el VPS de EasyPanel y Supabase Cloud (`ACTIVE_HEALTHY`, plan Free). Cuenta admin, endurecimiento, tres migraciones V2 y asignación ya aplicados con autorización; login/Auth/PostgREST verificados y Vault reservado al servidor. El piloto sigue desactivado, sin aplicación actualizada en EasyPanel ni números/bots conectados. Antes de preparar conexiones reales, seguir OPERATIONS; no se necesita otro servidor ni gestión comercial de varias clínicas.

## Alcance verificable

- Una clínica y un profesional configurados por backend. Pacientes ya registrados, activos y propios/asignados a ese profesional; no hay alta automática de desconocidos.
- Invitación con código aleatorio de un uso, hash almacenado y caducidad de 30 minutos. WhatsApp exige que el emisor coincida con el teléfono internacional guardado del paciente. El paciente envía `VINCULAR CODIGO` y acepta el canal.
- Reservas guiadas por texto en ambos canales: pedir día (`mañana`, `lunes`, `YYYY-MM-DD`), elegir una opción o una hora disponible y responder `CONFIRMAR`. La selección caduca en 10 minutos. No se crea una cita antes de confirmar; la confirmación usa el mismo creador de citas del CRM y la exclusión SQL de solapamientos. Fecha/hora mostradas en la zona de la agenda; fechas relativas interpretadas en Europe/Madrid.
- Este piloto reutiliza el intérprete de fechas y respuestas deterministas; no añade llamadas a un modelo de IA. Conversación libre, altas, cambios y cancelaciones automáticas de citas quedan fuera de este incremento. `CANCELAR` descarta la selección pendiente; no cancela una cita ya registrada. `BAJA`/`STOP` desactivan el canal sin borrar citas.
- PDF desde el informe persistido y aprobado. OpenWA recibe el documento en base64, sin URL clínica pública. Un HTTP aceptado no equivale a entrega: solo `message.ack` con `delivered`/`read` permite registrar `enviada`.
- Deduplicación persistida antes de reservar o enviar. Un resultado incierto requiere revisión manual y no se repite automáticamente. Los recibos adelantados se conservan y reconcilian.

## Preparación del entorno de pruebas

1. Preparar Supabase de pruebas con datos ficticios. Aplicar el esquema base/endurecimiento y las tres migraciones V2 en orden: `20261007091159_clinic_isolation.sql`, `20261007094023_clinical_approval_integrity.sql`, `20261007101248_messaging_pilot.sql`. Mapear clínica/profesional/pacientes y verificar RLS/Auth/PostgREST según OPERATIONS. La migración clínica exige revisar de nuevo los planes antiguos.
2. Preparar backend y frontend de pruebas con estos cambios. Todavía no hay commit ni push. Mantener los flags del piloto desactivados hasta comprobar migraciones, datos y destinos.
3. Preparar un servicio OpenWA separado. Referencia revisada: [OpenWA v0.24.0](https://github.com/rmyndharis/OpenWA/releases/tag/v0.24.0) y su [contrato HTTP](https://github.com/rmyndharis/OpenWA/blob/v0.24.0/docs/06-api-specification.md). Fijar esa versión y verificar la imagen/tag que se utilizará; no actualizar automáticamente durante el piloto. Puerto 2785, volumen persistente `/app/data`, SQLite basta para esta prueba. No necesita montar el socket Docker ni activar Redis/MinIO/Postgres adicionales para este flujo.
4. Crear una sesión de pruebas y una clave de operador limitada a esa sesión en OpenWA. Usar un número dedicado de pruebas; registrar su identificador real en el backend. Los pacientes ficticios deben usar teléfonos de los participantes autorizados del piloto. No usar todavía pacientes ni números productivos.
5. Configurar webhooks y probar el vínculo, un plan aprobado y una reserva con destinatarios de pruebas autorizados. Verificar que las credenciales globales de Calendar/Telegram/n8n corresponden a la clínica del usuario. Si se solicita ampliar a otros centros, habrá que separar sus credenciales, bot/número y calendario; esa ampliación está aplazada.

La creación de servicios, aplicación de SQL en Supabase Cloud, conexión de números y mensajes reales necesitan autorización del usuario para esos destinos. Esta guía no los activa.

## Variables del backend de pruebas

Guardar secretos en el entorno del servicio o `.env.local`; nunca en el frontend ni en Git.

```env
MESSAGING_PILOT_CLINIC_ID=<uuid-centro-de-pruebas>
MESSAGING_PILOT_PROFESSIONAL_ID=<uuid-perfil-crm-del-profesional>
OPENWA_PILOT_ENABLED=false
OPENWA_BASE_URL=http://<servicio-openwa>:2785/api
OPENWA_SESSION_ID=<id-real-de-la-sesion>
OPENWA_API_KEY=<clave-operador-limitada-a-la-sesion>
OPENWA_WEBHOOK_SECRET=<secreto-aleatorio-de-al-menos-32-caracteres>
TELEGRAM_PILOT_BOOKING_ENABLED=false
TELEGRAM_PATIENT_BOT_TOKEN=<token-bot-pacientes-de-pruebas>
TELEGRAM_PILOT_WEBHOOK_SECRET=<otro-secreto-aleatorio-de-al-menos-32-caracteres>
GOOGLE_CALENDAR_TIMEZONE=Europe/Madrid
```

Usar Calendar de pruebas si se configura Calendar. El piloto comparte las ventanas/duración de la reserva pública existente. `GET /api/health/readiness` exige las tablas de mensajería cuando alguno de los flags está activo; indica configuración declarada, no conexión real del número ni entrega efectiva.

## Webhooks y API

En OpenWA, crear la suscripción desde su dashboard, dirigida a `https://<backend-pruebas>/api/whatsapp/incoming`, con el mismo secreto y los eventos `message.received`, `message.ack`, `message.failed`. Activar `RESOLVE_LID_TO_PHONE=true` en OpenWA para emisores identificados por `@lid`; los que no puedan resolverse no se vinculan por suposición. Solo se procesan chats individuales de texto; grupos, estados, mensajes propios y medios se ignoran.

El webhook Telegram del bot de pacientes de pruebas se dirige a `/api/telegram/pilot-incoming`, con `secret_token` igual a `TELEGRAM_PILOT_WEBHOOK_SECRET`. El endpoint anterior `/api/telegram/incoming` conserva el bot y flujo heredados. No sustituir el webhook de un bot productivo.

Con sesión profesional de la clínica y permisos sobre el paciente:

| Operación | Endpoint |
| --- | --- |
| Invitación WhatsApp | `POST /api/whatsapp/link-code/:patientId` |
| Estado del vínculo y últimos envíos | `GET /api/whatsapp/patient-status/:patientId` |
| Enviar plan aprobado | `POST /api/whatsapp/patient-report/send` con `patient_id`, `recommendation_id`; `dry_run: true` no envía |
| Invitación para reservas Telegram del piloto | `POST /api/telegram/pilot-link-code/:patientId` |

El botón **WhatsApp** del resumen del paciente prepara la invitación, envía el plan aprobado o consulta el estado de un envío existente. El informe actual debe corresponder al paciente seleccionado. El envío Telegram existente también reconoce el vínculo del piloto cuando está activo. La integración visual de invitaciones de Telegram del piloto en la ficha todavía está pendiente.

## Resultados inciertos

No borrar registros ni repetir la operación para salir de un bloqueo. Revisar primero OpenWA, la agenda/Calendar y estos registros del centro de pruebas:

- `crm_whatsapp_envios`: `procesando`, `aceptado`, `entregado`, `leido`, `fallido`, `desconocido`.
- `crm_mensajeria_eventos`: `procesando` o `revision_manual` si hubo una interrupción.
- `crm_mensajeria_vinculos.reserva`: `processing: true` significa que una confirmación puede haber creado una cita. Comprobar su `request_id` en `crm_citas` antes de cualquier recuperación manual.

No hay reintentos automáticos de operaciones inciertas. El piloto requiere esta supervisión; una recuperación automática debe diseñarse después de validar los fallos reales del proveedor.

## Verificación local

Backend: lint y 44 pruebas pasando; el contrato HTTP completo del piloto se prueba con Express real y dobles locales de OpenWA/Telegram/base de datos. Se comprueban firma sobre cuerpo original, sesión/clínica, contenido aprobado, consentimiento/baja, deduplicación, recibos adelantados y confirmaciones concurrentes. PostgreSQL real en memoria verifica la migración, RLS, claves foráneas, límites de escritura y exclusión de citas entre canales.

Frontend: Astro check/build. Base, cuenta y lectura Auth/PostgREST ya verificadas en Supabase Cloud. Faltan prueba visual en navegador y flujos completos contra OpenWA, Telegram y Google Calendar reales. La primera conexión necesita validar esos límites en el entorno autorizado.
