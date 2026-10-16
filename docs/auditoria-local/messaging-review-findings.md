# Mensajería y automatizaciones — revisión local 15-oct-2026

## Continuidad posterior — 16-oct

Los fixes integrados en 3d4cce7 ya están publicados/desplegados. Los cuerpos de este archivo conservan diagnósticos históricos y límites; no son nuevos fallos del árbol actual. La revisión independiente solicitada ahora parte de [PUNTO_SITUACION_2026-10-16.md](../PUNTO_SITUACION_2026-10-16.md), debe contrastar cada pendiente con fuente y separar hallazgos nuevos/resueltos. No reactivar booking ni repetir escrituras/envíos para reproducirlo.

> Cierre de integración 16-oct: M-01, M-02 para el paciente y M-07 (resumen limitado con aviso de lista abreviada) están corregidos en local. M-02 al propio profesional y M-03/M-04/M-05/M-06/M-08/M-09/M-10 siguen identificados; no se activó ni modificó el bot de citas pausado. Estado y evidencia vigentes en `../AUDITORIA_FINAL_2026-10-16.md`; el cuerpo siguiente conserva el diagnóstico histórico.

> Actualización 16-oct: el hallazgo M-02 siguiente es el diagnóstico previo. Ya se corrigió para `/patient-report/send` con recibo persistido por clínica/recomendación/versión, bloqueo de concurrencia y entrega incierta, timeout y validación del acuse. Doce regresiones nuevas pasan; suite integrada backend 201/201. No se envió a Telegram real. `/physio-report/send` conserva el hallazgo de repetición. Ver `../AUDITORIA_EN_CURSO.md` para el estado vigente; las líneas históricas siguientes no son un informe del diff final.

Alcance: 13 módulos backend asignados y los 24 archivos JS/JSON de `n8n/Fisio_IA_Agent` (13 production JSON, 2 pendiente-activacion JSON, 8 vnext JSON y 1 helper JS). `production` identifica la carpeta fuente: no se consultó la configuración o activación remota. Lista exacta en `tmp/messaging-review-coverage.json`.

## Cambio local autorizado y terminado

**M-01 / P1 corregido: secuestro del chat profesional por primer mensaje.** En `backend/src/routes/telegram.js` el antiguo bloque 2094–2095 resolvía el profesional por defecto y persistía el chat del remitente sin autorización individual. `production/bot-fisio.json` transmite cualquier message como `physio_reports` con credencial interna; autenticar al transporte no autentica al usuario. Un `/informe` con UUID ficticio no existente reemplazó el chat ya guardado antes de fallar la generación, reproducido en VM con dobles de DB/HTTP.

Ahora líneas 1768–1777 comprueban el chat contra `resolvePhysioTelegramTarget` (destino previamente configurado en env/perfil), antes de descargar o transcribir audio. No se vincula automáticamente al primer remitente. Otro chat y ausencia de destino dan 403 sin HTTP, IA, envío ni escritura. El chat legítimo conserva generación de borrador; la simulación custom por texto permanece. Se eliminó `persistPhysioTelegramChatLink` (único consumidor era este flujo). No afecta al agente de citas pausado.

Archivos editados: únicamente `backend/src/routes/telegram.js` y nuevo `backend/test/telegram-professional-security.test.js` (6 casos). `npm run lint` backend pasó; este archivo y `clinical_gating.test.js` pasaron 15/15. El reproducidor privado ahora devuelve 403, 0 escrituras y conserva el destino previo. Sin publicación ni despliegue.

## Hallazgos pendientes fuera del cambio autorizado

**M-02 / P1: PDF Telegram sin recibo persistido antes del envío.** `backend/src/routes/telegram.js:1601–1638`, helper `sendTelegramDocument:646–665`. `/patient-report/send` envía intro y documento antes de guardar estado y no reclama una entrega única por recomendación/versión. El helper tampoco tiene timeout. Si Telegram acepta y se pierde el acuse, la API devuelve 500 y el mismo POST vuelve a enviar ambos mensajes. Repro privado: 500 → 200, dos sendDocument y dos intros, ningún envío real. Incluso después de éxito `getApprovedExerciseReport` admite `enviada`; una recarga evita la memoria local frontend y permite repetir. Es envío clínico iniciado por profesional, distinto del booking pausado. Una corrección completa requiere recibo único persistido, estado incierto y recuperación; agregar solo timeout no lo resuelve. `/physio-report/send` tampoco tiene recibo, aunque el daño allí es repetición al propio profesional.

**M-03 / P1, bot pausado: identidad por últimas nueve cifras.** `backend/src/lib/patient-booking.js:189,222–229`. Un contacto Telegram +49600111222 reconoce y vincula la ficha +34600111222 porque descarta prefijo internacional. Repro usa la misma DB sintética de `booking-agent.test.js`: se creó vínculo del chat ajeno a la ficha Ana. Riesgo: consultar/cambiar citas de otra persona y sustituir su chat. Comparar número internacional normalizado completo; admitir la inferencia +34 solo para un teléfono CRM español de nueve cifras. No modificado por pausa del bot.

**M-04 / P1, avisos del bot pendientes: reintento de entrega incierta.** `pendiente-activacion/avisos-agente-citas.json:39–43,80–84` envía TODOS los errores de Telegram a respuesta `{sent:false}`. Un timeout puede ocurrir tras aceptación. `backend/src/lib/agent-notices.js:53` convierte esa respuesta en `fallido`, y el cron la vuelve a reclamar. Debe distinguir rechazo confirmado de acuse desconocido. Evidencia estática directa de conexiones y clasificación; no se ejecutó n8n real.

**M-05 / P2, bot pausado: el validador de redacción no conserva la negación.** `backend/src/lib/booking-ai.js:124–141`. `rejectComposition` acepta convertir «su calendario aún no la ha confirmado» en «su calendario ya la ha confirmado» porque compara conjuntos de palabras/números. Contraejemplo directo devuelve null. También puede omitir «No la repitas». Datos operativos y estados deben conservarse determinísticamente, usando IA solo para texto no factual. No modificado.

**M-06 / P2, fuente legacy: W1 confirma solo por tener ID.** `production/w1-agenda-citas.json:166` (nodo Respuesta OK), equivalente vnext. Payloads CRM `{id, estado:'pendiente', calendar_sync_pending:true}` y `{id, estado:'confirmada', calendar_sync_pending:true}` dan ambos `status:'confirmed'`. Backend legacy `/incoming` transforma ese status en «tu cita queda confirmada». Repro VM directo. Reutilizar los estados canónicos CRM y conservar calendar_pending; no resucitar el guardrail duplicador de `vnext/telegram-chat.json`.

**M-07 / P2, resúmenes profesional: longitud Telegram no limitada.** `backend/src/lib/clinic-digests.js:58–72` y `production/resumenes-fisio.json:198`. La lista de facturas/bonos/reactivaciones crece sin límite; el sender usa `$json.text` íntegro. 120 facturas sintéticas producen 4513 caracteres (>4096), por lo que el envío completo falla. Limitar filas y añadir totales/enlace al CRM o dividir en fragmentos seguros. No se envió nada. Carpeta production no prueba que esté activo.

**M-08 / P2, recordatorios existentes: reprogramación pierde el siguiente recordatorio.** `backend/src/routes/reminders.js:101–125`; índice `database/migrations/20260901_production_security_hardening.sql:53–64`. Clave única `(cita_id,tipo,canal)` sin versión de inicio. Tras un recordatorio sent, reprogramar la misma cita a otra semana conserva la clave y se omite siempre (`already_processed`). No se limpia ni versiona en otro código (búsqueda de todas las referencias). No proponer borrar entregas inciertas: hace falta diferenciar cita/horario.

**M-09 / P2, avisos pendientes: 20 avisos caducados bloquean los nuevos.** `backend/src/lib/agent-notices.js:158–162`. La query limita primero a los 20 más antiguos y luego salta los ya pasados sin cerrar o excluir esas filas. Con 20 caducados y 1 vigente, cada ejecución vuelve a seleccionar los 20 antiguos. Repro privado con DB sintética: 0 fetch y 0 entregas aunque hay aviso vigente. Filtrar por `inicio_en > now` antes del limit o cerrar los vencidos. No modificado por pausa.

**M-10 / P2, seguimiento ausencias: revisión manual se presenta como enviado.** `backend/src/lib/no-show-followup.js:94–98,112–115`. `sentIds` incluye todos los eventos de la sesión sin distinguir estado, también `revision_manual` tras fallo/timeout. La consulta siguiente muestra «seguimiento ya enviado» y el comando responde «Ya enviaste» aunque el anterior indicó envío sin confirmar. No reintentar automáticamente está bien; falta estado visible `incierto/revisión` distinto de enviado. Evidencia estática y test existente que persiste revision_manual; no envío real.

## Verificación y cobertura

- `node --test backend/test/reminders.test.js backend/test/clinic-digests.test.js backend/test/no-show-followup.test.js backend/test/booking-ai.test.js backend/test/n8n-production.test.js`: 33/33.
- Tras el fix, `node --test backend/test/telegram-professional-security.test.js backend/test/clinical_gating.test.js`: 15/15.
- `npm run lint` en backend: verde.
- `node tmp/messaging-readonly-review.mjs`: repros de guardia profesional, duplicación de PDF, núcleo router correcto, W1 prematuro, teléfono internacional, resumen largo, negación IA y atasco de avisos. Todo VM/dobles, sin sockets.
- Leídos también `booking-agent.test.js` completo y `messaging-pilot.test.js` completo; no ejecutados por este agente porque levantan servidores localhost y root asume la suite integrada.
- No hallazgo material adicional confirmado en openwa (HMAC sobre raw body, redirect bloqueado, sin replay incierto, recibos tempranos reconciliados), clinic-calendar (DST/fiestas compartidas) ni núcleo n8n (VM clasifica appointment/exercise/session_note correctamente).
- Mantenibilidad: telegram.js mezcla aproximadamente 2800 líneas de legados, onboarding, NLP, transporte, informes y citas. Separar por dominio al reanudar el bot, conservando contratos y pruebas; no hacer una extracción mecánica durante la pausa. Hay copias vnext/production deliberadas: no borrar ni activar por parecer redundantes.

No se inspeccionaron secretos ni datos reales, no se cambió ningún workflow o flag, no se hicieron llamadas reales, migraciones, envíos, IA con gasto, commit/push o deploy. La revisión no demuestra estado actual de producción. El ledger PDF y los pendientes de recordatorios/resúmenes siguen siendo riesgos operativos hasta corregirse y validarse.
