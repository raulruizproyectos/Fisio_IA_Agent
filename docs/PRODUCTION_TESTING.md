# Primera prueba en producción — estado actualizado 2026-10-13

## 16-oct, 18:18 — estado para continuar la auditoría

Lectura nueva a las 18:18:51: frontend ea7f998 y backend 3d4cce7 habilitados; Calendar healthy, error:null, último éxito 18:18:24; W5 activo/publicado con intervalo correcto. La prueba de Raúl ya comenzó y sus incidencias anteriores se repararon. [PUNTO_SITUACION_2026-10-16.md](PUNTO_SITUACION_2026-10-16.md) separa pruebas reales, fixtures y pendientes. Este checkpoint solo actualiza seguimiento/prompt, sin otro deploy. No reensaya login, DB/RLS, todos los workflows, entrega clínica ni IA con gasto. Primera respuesta de Calcode: contexto + recomendación de modelos/razonamiento/agentes, antes de auditar.

## 16-oct, 17:10 — columnas de Agenda desplegadas

Deploy frontend autorizado y verificado en `ea7f998`, [CI 38911381365 verde](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38911381365). Contenedor running y `/health` 200; backend `3d4cce7`, entornos preservados, n8n sin cambios. Cinco anchuras 375–1920 sobre archivos públicos con API/Auth ficticias, bloqueos largos/simultáneos y apertura de detalle pasan; capturas inspeccionadas. [Detalle y recibos](INCIDENCIA_CALENDAR_HISTORIAL_2026-10-16.md). No acredita login real, envío, DB ni nueva prueba Calendar. Seguimiento postdeploy solo local, sin nueva publicación documental.

## 16-oct, 15:09 — recuperación Calendar y primera incidencia visual

Tras autorización de commit/push, `e3a4773` con CI [38905155872](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38905155872) verde. Con autorizaciones de producción separadas se desplegó únicamente frontend y se actualizó/publicó W5; backend permanece `3d4cce7`. Calendar requería reconexión OAuth, realizada por Raúl. W5/W6 leen HTTP 200; dos intervalos W5 reales verificados tras corregir parámetros, y ciclo automático de las 15:08:25 `healthy`/sin error actual. Frontend público: 12 estados a 375/1280 con API/Auth ficticias, además de 24 estados locales. [Detalle de acciones, evidencia y límites](INCIDENCIA_CALENDAR_HISTORIAL_2026-10-16.md). No acredita nueva prueba de login, Cloud RLS, envíos clínicos, gasto IA ni activación del bot. Esta entrada posterior al despliegue se conserva localmente, sin nueva publicación documental.

> Publicación autorizada el 16-oct: Raúl autoriza expresamente el commit de esta tanda y, por separado, su push a main en raulruizproyectos/Fisio_IA_Agent. La entrega que contiene esta entrada reúne las correcciones y la evidencia; comprobar el CI de su HEAD en GitHub. No autoriza despliegues ni activar el bot. Las referencias a «local/sin publicar» describen el cierre previo a esta autorización.

## 16-oct — Tanda local comprobada; producción todavía no actualizada

La evidencia de esta tanda es local: lint/214 pruebas backend, check/build frontend, 28 scripts y navegador a 375/768/1280/1920 px. [Informe, casos manuales y límites](AUDITORIA_FINAL_2026-10-16.md). No acredita Supabase/PostgREST, proveedores, mensajes reales ni la versión que sirve la URL pública.

Antes de probar esta tanda allí: autorización de commit/push, CI verde, autorización y deploy de backend y frontend; después contenedores/readiness/sesión/Calendar y casos ficticios. No hay migración nueva y no deben repetirse las históricas. Mantener el bot pausado. Las secciones anteriores al 16 de octubre son antecedentes, no pruebas frescas ni órdenes de ejecutar Cloud.

## Estado vigente y próximo encargo

Frontend `c06296701f6f7214b788ef1f461aa62146e1de6a` y backend `ee3449c61644d7d0d978c4c1fa822835557f8c2e` ya desplegados en los servicios existentes. Main publicado `ee3449c`; documentación de este traspaso modificada en local, sin nueva publicación. CI frontend [38375833160](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38375833160) y backend [38377245576](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38377245576) completos verdes. No necesitas hacer esos deploy manualmente.

Después del despliegue: diez controles HTTP y readiness 13/13 pasan, seis integraciones configuradas/cero ausentes. Supabase ACTIVE_HEALTHY; una clínica, 35 tablas públicas con RLS, cero perfiles/pacientes sin clínica y cero citas Calendar pendientes/en curso. Doce workflows activos/coincidentes; Calendar OAuth responde y sync healthy tras reiniciar, éxito observado `2026-10-13T09:40:25.068Z`. Recordatorios horarios activos para vinculados/citas 23–25 horas, vista previa cero candidatos; no acredita entrega del primer tick. Pilotos separados WhatsApp/Telegram booking desactivados.

Backend lint/108 pruebas y frontend check 40 archivos/cero diagnósticos/build cuatro páginas pasan. Handlers/SQL con fixtures cubren pacientes/notas, citas, pagos/bonos/facturas, revisión y recuperación. Chromium 375/768/1280 sobre archivos públicos con API/Auth ficticias pasa; no equivale a una sesión profesional real ni todos los proveedores. Login válido y Calendar CRUD del 8 siguen siendo evidencia histórica.

Durante casos negativos Auth hubo un email automático de monitorización real mostrado por el usuario. Causa: errores 4xx enviados como CRITICAL; corregido y desplegado en `ee3449c` (solo 5xx notifican). No se han enviado documentos/mensajes clínicos a pacientes ni ejecutado IA con gasto. [Evidencia y límites](design-exploration/reviews/2026-10-13/production.md).

La preparación permite empezar con datos ficticios; el usuario ha pedido primero una segunda auditoría independiente con CloudCode y completar **en local** el agente de citas Telegram si falta. Requisitos confirmados: nuevos/existentes con contacto verificado, reserva/consulta/cambio/cancelación/recordatorio, cambios/cancelaciones con al menos 24 horas, después clínica; WhatsApp futuro. [Prompt completo y recursos](DESIGN_RESOURCES.md), [contrato conversacional](PROMPT_AGENTE_CITAS.txt) y [requisitos](PILOTO_MENSAJERIA.md). No hay resultados comunicados de la primera prueba manual. Este encargo no autoriza mutaciones de datos reales, migraciones Cloud, activaciones, envíos reales o gasto. Las secciones siguientes conservan el cierre y la guía del 8 de octubre; versiones y afirmaciones fechadas son históricas.

## Historia — cierre del 8 de octubre

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
