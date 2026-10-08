# Primera prueba en producción — 2026-10-08

El usuario autorizó fusionar PR #2, aplicar las cinco migraciones ensayadas, configurar/desplegar los servicios existentes y probar con datos ficticios. Amplió el alcance a Calendar, mensajería y cron. Autorizó expresamente commit/push a main, recordatorios horarios para pacientes vinculados y comprobación temporal Gmail. Eligió terminar la preparación del producto; no se cambió la versión del software n8n.

## Destinos y versión

- CRM: https://fisio-frontend.b5xbaf.easypanel.host/login/
- API: https://fisio-backend.b5xbaf.easypanel.host
- EasyPanel: proyecto fisio-ia-agent; servicios fisio-backend/fisio-frontend.
- n8n existente: https://n8n-n8n.b5xbaf.easypanel.host
- Supabase: uewhbaejcouenoufuwlq, sano; permisos por clínica preservados.
- Backend: 79bfeeee3d9c8839128d51a09e3def3ffb2337c9. Frontend: 0fce17529fb0ea7b99644a0c305cd37b6613a799. Main añade después el cierre documental/archivo de recordatorios, sin cambios ejecutables backend/frontend.
- CI: https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/37820255876 ; backend, n8n y frontend verdes.

## Evidencia de funcionamiento

- Readiness HTTP 200, estado ok, 13 controles DB, seis integraciones configuradas, cero ausentes; dos pilotos sin usar. No confundir presencia de configuración con una llamada real al proveedor.
- Calendar: el usuario reconectó Google. Un evento ficticio sin paciente, invitados ni notificaciones fue creado, leído, editado y cancelado. W5 lee el calendario; W6 devuelve recursos y páginas completos. La lectura fallida/vacía no acredita ausencia ni permite repetir mutaciones inciertas.
- Doce workflows activos coinciden con sus archivos fuente. Todos los webhooks usan Header Auth y las llamadas backend llevan credenciales de cabecera acotadas. Cuerpos JSON explícitos; W6 separa HTTP con cuerpo fijo de lectura/cancelación, porque Send Body del nodo no admite expresiones de datos. Bot paciente sin la reserva adicional ante error del backend.
- Calendar sync activo cada dos minutos: estado real healthy, última ejecución exitosa, cero cambios CRM en la comprobación observada.
- Recordatorios: workflow Fisio IA | Recordatorios, v1zUdrF2JprzUzGN, activo cada hora. Pacientes con vínculo Telegram guardado, citas activas entre 23 y 25 horas; mensaje con nombre, día/hora y motivo. Vista previa 0; endpoint probado con 0 envíos. Rechazo confirmado puede reintentarse; processing/entrega incierta queda bloqueado. Primer tick horario no observado en esta sesión.
- Telegram: tokens válidos, webhooks en n8n y ambos modos backend con dry_run HTTP 200 y respuesta útil. No se probaron envíos reales. Gmail: lectura de perfil autenticada HTTP 200, sin leer correos ni enviar emails; workflow temporal retirado.
- Login profesional real HTTP 200, lecturas autorizadas, cookies __Host-/Secure/HttpOnly/SameSite=Lax sin Domain y logout HTTP 200. Tokens no publicados al cliente. Diez controles de HTTP/CSP/proxy/Auth pasan; acceso anónimo rechazado, CSRF/origen ajeno rechazados.
- Backend lint/106 pruebas; frontend 39 archivos sin diagnósticos y cuatro páginas compiladas. CI prueba Docker/nginx real. Aviso Shiki de Astro conservado; no se usan páginas Markdown en estos flujos.

Recibos locales privados: .private-backups/local-validation/production/2026-10-08/ (smoke-verification, professional-auth-verification, integration-verification, calendar-provider-test y gmail-verification). No subir esos archivos ni datos clínicos. Las primeras pruebas Calendar rechazadas no crearon eventos; se corrigió el cuerpo HTTP antes del ensayo exitoso.

## Migraciones ya aplicadas

| Archivo local | Versión Cloud |
| --- | --- |
| 20261007154552_financial_integrity.sql | 20261008171200 |
| 20261007201534_clinic_creation_retries.sql | 20261008171207 |
| 20261007214504_public_booking_retries.sql | 20261008171213 |
| 20261008064542_appointment_calendar_pending.sql | 20261008171221 |
| 20261008090742_appointment_calendar_verification.sql | 20261008171231 |

Columnas/tabla/RLS e historial comprobados. No repetirlas por timestamps distintos. Ninguna factura histórica al aplicar la migración financiera.

## Recuperación y límites

Copia nativa .private-backups/2026-10-08T16-48-39-268Z/database.dump, SHA-256 5166d906163ed17cb14f3af65b9f722955b00960d74dcaf9fe5d916c6dfbb661. Restauración local: 35 tablas públicas y 27 Auth coinciden por cantidades/hashes; cinco migraciones ensayadas sin perder filas. Servidor local detenido. Alcance CRM/Auth, no restauración completa de pg_net/Vault/Storage/Realtime ni contraseñas globales; restore_verified completo sigue falso.

Metadatos anteriores de EasyPanel en la carpeta privada. Valores de recuperación de env y workflows con posibles secretos solamente en .env.local, como base64. No confundir esos metadatos con una copia de las imágenes Docker; restaurar despliegues exige comprobar disponibilidad del commit/imagen y autorización vigente.

Pendientes fuera de esta comprobación: entrega real Telegram/email, IA con gasto, móvil físico y recuperación administrativa de una cita con in_flight=true tras caída. WhatsApp continúa como piloto sin activar. La protección de contraseñas filtradas de Supabase continúa desactivada, aviso previo: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No se contrató ningún plan.

## Recorrido del usuario

Entrar con la cuenta profesional existente, revisar agenda/pacientes, crear una cita de prueba y comprobar Calendar/recarga; vincular un paciente ficticio a Telegram antes de comprobar entrega o recordatorios. Para ejercicios, generar un caso ficticio, revisar/aprobar profesionalmente antes de PDF/envío. Comunicar acción, resultado esperado, resultado observado y hora aproximada. Mantener IDs de operaciones ante un resultado incierto; no reenviar escrituras a ciegas.
