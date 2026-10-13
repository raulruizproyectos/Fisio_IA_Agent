# Segunda auditoría independiente — Fisio Clinical / Fisio IA Agent

Fecha: 13 de octubre de 2026. Repositorio `Fisio_IA_Agent`, rama `main`, HEAD `ee3449c`. Los cambios de esta auditoría están en local, sin commit, push, despliegue ni operaciones en Cloud, Telegram, n8n o IA con gasto.

## Veredicto ejecutivo

El CRM está en mejor estado que en la primera auditoría: los diez hallazgos del 7 de octubre aparecen corregidos en el código, la CI está en verde y la separación por clínica, la aprobación clínica y la recuperación de citas inciertas están bien resueltas. **Se puede hacer la primera prueba manual del CRM con datos ficticios.**

El punto débil es la **mensajería con pacientes**. El bot de pacientes que hoy está activo en producción (n8n «Bot paciente» → `/api/telegram/incoming`) es la ruta heredada:
- da de alta a desconocidos solo con su nombre;
- se presenta como una persona («nunca menciones que eres IA»);
- usa un horario escrito en el prompt;
- trata cualquier fallo de lectura como «no tienes citas»;
- no aplica la regla de 24 horas.

Antes de dar el bot a pacientes reales, hay que **activar el agente de citas nuevo** o, como mínimo, **retirar las funciones de cita del bot heredado**.

El agente de citas completo queda **implementado y probado en local**:
- verificación de identidad;
- consultar, reservar, cambiar y anular;
- regla de 24 h en el servidor;
- recuperación sin duplicados;
- recordatorios que respetan la baja.

No está desplegado ni activo. Para activarlo hace falta una migración, un despliegue y cambiar el flujo n8n, todo con tu autorización. Ver [AGENTE_CITAS.md](AGENTE_CITAS.md).

## Hallazgos

Prioridades: **P0** bloquea el uso con pacientes reales; **P1** debe resolverse antes de un uso continuado; **P2** mejora importante de fiabilidad o mantenimiento; **P3** acabado. Confianza: alta = código leído y, cuando se indica, reproducido; media = depende de la configuración de producción no consultada.

### P0-1 · El bot de pacientes activo crea fichas sin verificar, finge ser persona e informa citas falsas

- **Ubicación.** `backend/src/routes/telegram.js`:
  - alta automática: `autoLinkFirstContact`, 1065, y rama de alta, 2168–2210;
  - prompt de «Carla»: `callCarlaAgent`, 284–330;
  - consultas internas: `fetchPatientActiveAppointments`, 1312, y `patchAppointmentDirectFallback`, 1345.
  
  El flujo `n8n/Fisio_IA_Agent/production/bot-pacientes.json` envía todos los mensajes del bot de pacientes a esa ruta con `agent_mode=patient_appointments`.
- **Evidencia.**
  - Ante un chat desconocido, pide un nombre y crea un paciente en la tabla heredada `pacientes` más el vínculo del chat, sin verificar el contacto.
  - El prompt del sistema dice «NUNCA menciones que eres IA, asistente virtual o bot» y fija «LUNES A VIERNES, 9:00-13:00 y 15:00-19:00».
  - Las consultas y cambios de cita llaman por `fetch` al propio backend **sin credenciales**. La respuesta 401 se convierte en `[]` y el paciente lee «no veo ninguna cita activa». Si llegara a modificar una cita, no hay comprobación de 24 horas.
- **Consecuencia.**
  - Fichas sin titularidad comprobada.
  - El paciente cree hablar con una persona.
  - Se informan horarios no procedentes de la configuración.
  - Un fallo de lectura se presenta como ausencia de citas.
  - Si hay `OPENAI_API_KEY`, cada mensaje genera gasto.
- **Confianza.** Alta sobre el código. Media sobre la configuración: no se consultó si las tablas heredadas y la clave existen en Cloud.
- **Solución mínima.** Activar el agente nuevo:
  1. aplicar la migración local;
  2. desplegar el backend;
  3. sustituir el flujo n8n por `n8n/Fisio_IA_Agent/pendiente-activacion/bot-pacientes.json`.

  Mientras tanto, se puede desactivar el flujo n8n «Bot paciente». Ambas acciones requieren tu autorización.

### P1-1 · Los códigos de vinculación heredados son reutilizables y no caducan

- **Ubicación.**
  - `telegram.js`: `generateTelegramLinkCode`, 956, que usa 3 bytes (6 hex); `/start`, 2111–2140.
  - Ficha del CRM: `index.astro` 6585, que llama a `POST /api/telegram/link-code`.
- **Evidencia.**
  - Al vincular no se borra `codigo_vinculacion` ni se exige `telegram_chat_id` nulo. Otro chat que envíe después `/start CÓDIGO` sobrescribe el vínculo.
  - El código no caduca y se muestra en el CRM y en el enlace.
- **Consecuencia.** Quien obtenga o adivine el código recibe los recordatorios y los **planes aprobados en PDF** del paciente. `patient-report/send` y los recordatorios usan ese chat.
- **Confianza.** Alta (código).
- **Solución.** Implementada en local para cuando el agente esté activo. La ficha usa invitaciones de 96 bits, de un uso, con hash y caducidad de 30 min (`bookingAssistantLinkState` y `POST /link-code` en `telegram.js`). Si se mantuviera el flujo heredado, la solución mínima es exigir `telegram_chat_id is null` y borrar el código al vincular.

### P1-2 · El agente de citas estaba incompleto y podía afirmar confirmaciones sin evidencia (resuelto en local)

- **Ubicación.** `backend/src/lib/patient-booking.js` y `/pilot-incoming` en `HEAD`.
- **Evidencia en HEAD.**
  - Solo reservaba pacientes ya invitados.
  - No consultaba, cambiaba ni anulaba citas.
  - Respondía «Cita confirmada» sin mirar `calendar_sync_pending`.
  - Un fallo de lectura de huecos lanzaba una excepción: el evento quedaba en `revision_manual` y **el paciente no recibía respuesta**.
  - `processing:true` quedaba bloqueado hasta intervención manual, sin recuperación por lectura.
- **Solución.** Implementada y probada en local ([AGENTE_CITAS.md](AGENTE_CITAS.md)).

### P1-3 · Trazabilidad del agente clínico incompleta

- **Ubicación.**
  - `backend/src/routes/exercises.js` 236–260, que llama a n8n o a la Edge Function `exercise-recommend`, y 395, `model_name: process.env.OPENAI_MODEL || 'n8n-managed'`.
  - `supabase/` no contiene funciones versionadas.
- **Evidencia.**
  - El código del motor que genera el plan (Edge Function y flujo n8n «Ejercicios») no está en el repositorio.
  - El modelo registrado es una variable de entorno o el literal `n8n-managed`, no lo que devuelve el motor.
  - El `system_prompt` se envía, pero no consta que el motor lo use.
- **Consecuencia.** No se puede reconstruir qué modelo, prompt y versión produjeron un informe concreto. La aprobación profesional sigue protegiendo al paciente, pero la auditoría clínica posterior queda incompleta.
- **Confianza.** Alta sobre el repositorio; media sobre lo desplegado, que no se consultó.
- **Solución mínima.** Versionar el código de `exercise-recommend` en `supabase/functions/` y guardar en `report_snapshot` el modelo, la versión del motor y el `prompt_version` que el motor confirme. No se llamó al motor: tiene coste.

### P1-4 · Los recordatorios ignoraban la baja del canal y las citas cambiadas (resuelto en local)

- **Ubicación.** `backend/src/routes/reminders.js`.
- **Evidencia en HEAD.**
  - Solo leía `vinculos_telegram_pacientes`, así que una baja del agente no detenía los recordatorios.
  - Excluía las citas `reprogramada`.
  - El texto invitaba a «cancelar o cambiar por aquí», en contra de la regla de 24 h.
- **Solución.** Implementada: el vínculo del agente prevalece, la baja elimina el destino, se incluye `reprogramada` y el texto menciona la regla. Prueba nueva en `test/reminders.test.js`.

### P2-1 · Cálculo de huecos con N lecturas por día (resuelto en local)

- **Ubicación.** `buildPublicBookingSlots`, `professional.js`.
- **Evidencia.** En cada franja se repetían una consulta CRM, una lectura de Calendar y la descarga completa del ICS público de festivos, que después se descartaba porque los festivos no bloquean.
- **Medida con dobles y latencias simuladas.** De 8 BD + 8 Calendar + 8 ICS a 1 + 1 + 0 por día; unos 2,8 s → unos 0,15 s ([EVIDENCIA.md](EVIDENCIA.md)).
- **Beneficio.** Aplica a la reserva web y al agente.

### P2-2 · Horario de reserva por defecto inventado si falta configuración

- **Ubicación.** `parsePublicBookingWindows`, `professional.js` 198–218.
- **Evidencia.** Sin `PUBLIC_BOOKING_WINDOWS` se usan 09–13 y 15–19.
- **Consecuencia.** Un error de configuración publica horarios que la clínica no ha definido.
- **Solución mínima.** Exigir la variable en readiness cuando la reserva o el agente están activos.

### P2-3 · Los festivos no bloquean la reserva

- **Ubicación.** `findCalendarBusyConflicts` (filtro `!isHolidayCalendarEvent`) y `blocksBooking: !isHoliday`.
- **Evidencia.** Es una decisión explícita del código: los festivos son solo «referencia».
- **Consecuencia.** Web y agente ofrecen huecos en festivos salvo que la clínica bloquee su calendario.
- **Decisión de negocio que te corresponde.** Confirmar si la clínica trabaja en festivos.

### P2-4 · Un único cubo de límite por IP para todo el tráfico de n8n

- **Ubicación.** `backend/src/index.js` 68–74: global, 300 cada 15 min por IP, aplicado antes que el límite de webhooks.
- **Evidencia.** Todos los mensajes de Telegram reenviados por n8n, la sincronización de Calendar cada 2 min y los recordatorios comparten la IP de n8n.
- **Consecuencia.** Un chat que envíe muchos mensajes puede agotar el cupo y retrasar la sincronización y los recordatorios.
- **Confianza.** Media: depende de la IP que vea el proxy.
- **Solución.** Excluir del limitador global las rutas autenticadas por secreto, que ya tienen su propio límite, o limitar por chat.

### P2-5 · Módulos muy grandes que mezclan responsabilidades

- `telegram.js` (2.900 líneas) mezcla el bot heredado de pacientes, el bot profesional y el agente.
- `professional.js` (3.400 líneas) mezcla agenda, Calendar, reserva pública, plantillas y vídeo.
- `index.astro` (unas 10.000 líneas).

No es un defecto funcional, pero cada cambio exige mucha lectura. Propuesta: tras activar el agente, eliminar la rama `patient_appointments` heredada de `/incoming` (unas 1.000 líneas) y extraer agenda y Calendar a `lib/`. No hace falta reescribir.

### P3 · Acabado y textos

- Textos sin tildes en la ficha y el CRM: «Sin telefono registrado», «Aun no hay una evolucion clinica», «Todavia», «invitacion», «codigo».
- Importes como «0.00 EUR» en lugar de «0,00 €».
- Un recordatorio enviado antes de un cambio de cita impide recordar la hora nueva, porque `unique(cita_id,tipo,canal)`.
- Detalle en [PROPUESTA_PRODUCTO.md](PROPUESTA_PRODUCTO.md).

## Estado de los hallazgos de la primera auditoría

| # | Hallazgo 7-oct | Estado en `ee3449c` | Evidencia |
| --- | --- | --- | --- |
| 1 | Seguimiento salta la revisión | Corregido | `exercises.js` 733 rechaza `estado`; triggers `guard_exercise_recommendation/items` |
| 2 | Autoasignación de pacientes | Corregido | política `crm_assignments_all` exige `can_access_crm_patient` y clínica |
| 3 | Datos demo sustituyen reales | Corregido | `DEMO_PATIENTS` solo con `import.meta.env.DEV` |
| 4 | PDF/envío no usan lo aprobado | Corregido | `getApprovedExerciseReport` usa `report_snapshot` y versión |
| 5 | Resumen omite evolución reciente | Corregido | notas ordenadas de más reciente a más antigua |
| 6 | Numeración de facturas | Corregido | RPC `issue_clinic_invoice` |
| 7 | Bonos concurrentes | Corregido | RPC `consume_clinic_bono` |
| 8 | Supresión con falso éxito | Corregido | errores comprobados; anonimización bloqueada con 409 explícito |
| 9–10 | Confianza de pruebas / «preparado» | Mejorado | CI con 108 pruebas, recibos de ensayo; sigue sin acreditarse un recorrido real completo |

La verificación es por lectura de código y de las pruebas existentes, no por una ejecución contra Cloud.

## Lo que funciona y conviene conservar

- RLS con aislamiento por clínica; identidad y autoría tomadas de la sesión; cookies HttpOnly con CSRF.
- Recuperación de Calendar sin repetir escrituras (`calendar_sync_pending/in_flight`, comprobación por evidencia).
- Aprobación profesional obligatoria antes del PDF o el envío; justificación ante alertas clínicas; contenido aprobado con versión.
- Deduplicación persistida de webhooks; exclusión SQL de solapamientos; `request_id` único por cita.
- Precisión azul aplicada con coherencia; controles de 44 px; foco y Escape gestionados; movimiento reducido.

## Defectos frente a preferencias

Defectos: P0-1, P1-1 a P1-4, P2-1, P2-2 y P2-4. Decisiones de negocio: P2-3 (festivos), el estado inicial de las citas de pacientes nuevos y los datos de contacto. Las propuestas visuales de [PROPUESTA_PRODUCTO.md](PROPUESTA_PRODUCTO.md) son oportunidades, no bloqueos clínicos.
