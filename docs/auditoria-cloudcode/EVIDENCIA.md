# Evidencia — segunda auditoría

Fecha de ejecución: 13 de octubre de 2026. Entorno: Windows 11, Node 24.13.0, npm 11.6.2. Repositorio en `ee3449c` con cambios locales sin commit. Sin red hacia Cloud, Telegram, n8n ni proveedores de IA; todos los datos son ficticios.

## Comandos canónicos

| Comando | Momento | Resultado |
| --- | --- | --- |
| `backend: npm run lint` | Antes de cambiar | Sin errores |
| `backend: npm test` | Antes de cambiar | 108/108 |
| `backend: npm run lint` | Final | Sin errores |
| `backend: npm test` | Final | **124/124** (16 nuevas) |
| `frontend: npm run check` | Final | 40 archivos, 0 errores, 0 avisos, 0 sugerencias |
| `frontend: npm run build` | Final | 4 páginas compiladas |

El frontend no se modificó: el cambio de invitación está en el backend, con el mismo contrato de respuesta.

## Pruebas nuevas y qué demuestran

`backend/test/booking-agent.test.js` ejerce la ruta HTTP real `/api/telegram/pilot-incoming` con `authorizeRequest`, el secreto y la deduplicación. Usa un doble en memoria de PostgREST con las restricciones únicas relevantes y un doble de la Bot API.

| Requisito / riesgo | Comportamiento esperado | Prueba | Resultado | Límite |
| --- | --- | --- | --- | --- |
| Límite exacto de 24 h | 24 h exactas se permiten; 24 h − 1 ms, no | `24 horas…` | Pasa | Función pura |
| Cambio horario de octubre y marzo | Se cuentan horas reales, no de reloj | `24 horas…` (25-oct y 29-mar-2026) | Pasa | — |
| Secreto del webhook y update repetido | 401; un solo procesamiento y un solo envío | `webhook…` | Pasa | — |
| Paciente nuevo | Contacto propio verificado, nombre y ficha mínima; sin duplicar ficha | `paciente nuevo…` | Pasa | Doble de BD |
| Contacto ajeno | Rechazado sin crear nada | `paciente nuevo…` | Pasa | — |
| Teléfono de una ficha existente | Ni vincula, ni crea ni revela citas; pide el código | `teléfono de una ficha existente…` | Pasa | — |
| Código de la clínica | Un solo uso, caduca, no se reutiliza desde otro chat | `código de la clínica…` | Pasa | — |
| Identidad no verificada | Sin acceso a citas: pide verificación | `paciente nuevo…`, `BAJA…` | Pasa | — |
| Solo citas propias | No lista las citas de otros pacientes | `consulta…` | Pasa | — |
| Fallo de lectura | No se presenta como «sin citas» ni «sin huecos» | `consulta…`, `selección caducada…` | Pasa | — |
| Reserva | Huecos reales, CONFIRMAR explícito, una sola cita aunque se repita | `reserva…` | Pasa | Calendar desactivado en la prueba |
| Dos pacientes, mismo hueco | El segundo recibe «acaba de ocuparse», sin duplicado | `dos pacientes…` | Pasa | La exclusión SQL no la ejecuta el doble (cubierta por ensayos previos con PostgreSQL) |
| Selección caducada | No confirma | `selección caducada…` | Pasa | — |
| «cancelar» ambiguo | Pregunta, sin mutar nada | `selección caducada…` | Pasa | — |
| Anular con ≥ 24 h / < 24 h | Anula / deriva con el contacto, sin tocar la cita | `anular…` | Pasa | — |
| Cambiar | Misma fila, nueva hora, `reprogramada`, sin anular antes | `cambiar…` | Pasa | — |
| Versión antigua | «ha cambiado desde que empezamos», sin mutar | `cambiar…` | Pasa | — |
| Respuesta perdida | Recuperación por `request_id`; Calendar pendiente se informa; sin recrear la cita | `respuesta perdida…` | Pasa | — |
| Pérdida de respuesta tras más de 5 min | «no llegó a registrarse», sin crear la cita | `respuesta perdida…` | Pasa | — |
| Baja del canal | Desactiva el chat; volver a acceder exige un código nuevo | `BAJA…` | Pasa | — |
| Recordatorio con baja | No envía aunque exista vínculo heredado | `reminders.test.js` (nueva) | Pasa | Arnés vm existente |
| Invitación en la ficha | Código no guardado en claro; estado real del vínculo | `ficha del CRM…` | Pasa | — |
| Flujo n8n preparado | Reenvía el update completo; aviso sin confirmar nada si el backend falla | `n8n-production.test.js` (nueva) | Pasa | Comprueba el JSON, no una instancia n8n |
| Contrato del PATCH de citas tras la refactorización | Mismo comportamiento | Suite existente | Pasa | — |

**Mutaciones** (aplicadas en local y revertidas, comprobado con `grep`):
- cambiar `>=` por `>` en la regla de 24 h → falla 1 prueba;
- eliminar la comprobación de 24 h → falla la prueba de anulación.

Así se comprueba que las pruebas detectan esos fallos.

## Medida de eficiencia de huecos

Script local en el scratchpad de la sesión (no está en el repositorio). Compara `buildPublicBookingSlots` de `HEAD` con la versión actual, sobre los mismos dobles: Calendar vía W5 simulado con 150 ms de latencia, BD con 30 ms, ICS con 150 ms. Día laborable con las franjas por defecto.

| Versión | Huecos | Lecturas BD | Lecturas Calendar | Descargas ICS | Tiempo |
| --- | --- | --- | --- | --- | --- |
| HEAD | 8 | 8 | 8 | 8 | unos 2.767 ms |
| Actual | 8 | 1 | 1 | 0 | unos 152 ms |

Los recuentos son medidas exactas. Los tiempos dependen de las latencias simuladas: son una estimación de la reducción, no del tiempo real en producción.

## Revisión estática y visual

- Lectura de código de `telegram.js`, `patient-booking.js`, `professional.js` (agenda y Calendar), `reminders.js`, `middleware/security.js`, `index.js`, `exercises.js` (motor y trazabilidad) y migraciones de mensajería, aislamiento y aprobación.
- Flujos n8n de `production/` analizados por script (URLs, nodos, credenciales). Sin acceso a la instancia.
- Capturas ficticias de la sesión anterior (`.private-backups/…/2026-10-13/ficha-1280/375.png`), revisadas localmente y no publicadas.
- Los 25 recursos de diseño: evaluación propia más el estudio del 13-oct. **No se volvieron a abrir las 25 webs en esta sesión.**

## No ejecutado (límites)

- La migración `20261013120000_booking_agent_onboarding.sql` no se ejecutó en PostgreSQL ni PGlite (no instalado; no se instaló nada).
- Ni Telegram real, ni importación en n8n, ni Calendar real, ni Supabase Cloud, ni el motor clínico con gasto.
- No se navegó por el CRM en esta sesión con un backend local. La revisión de UX se basa en código, capturas ficticias previas y recorridos descritos.
- No se ha confirmado en Cloud si existen las tablas heredadas (`pacientes`, `telegram_onboarding_pending`) ni si `OPENAI_API_KEY` está configurada.
