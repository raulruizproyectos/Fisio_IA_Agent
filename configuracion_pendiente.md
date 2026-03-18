## Estado actual (2026-03-18, Sesion 105) - Agenda con observabilidad lista, bloqueada por credenciales de Google Calendar en backend.

### Completado sesion 105
- [x] W6 Calendar Sync existe y esta activo en n8n cada 2 minutos.
- [x] El backend expone estado del sincronizador con `GET /api/profesional/appointments/sync-calendar/status`.
- [x] La agenda del CRM ya muestra el estado del sync y su frescura.
- [x] GitHub queda sincronizado en `c651966`.

### Diagnostico confirmado
- El backend desplegado sigue devolviendo `enabled: false` para Google Calendar.
- Por eso la agenda todavia no puede ser espejo real del calendario del profesional.
- El bloqueo actual no es n8n ni frontend: es configuracion pendiente en EasyPanel del backend.

### Acciones requeridas antes de la proxima implementacion
1. Publicar en EasyPanel del backend:
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - opcional: `GOOGLE_CALENDAR_REQUIRED=true`
2. **Redeploy de `fisio-backend` en EasyPanel**.
3. Verificar en produccion que `/api/profesional/appointments/sync-calendar/status` devuelve:
   - `enabled: true`
   - `last_success_at` con valor real

### Siguiente paso exacto
1. Espejo real del calendario clinico.
2. Bloqueos / no disponibilidad desde Google Calendar.
3. Envio real por Telegram desde el copilot.
4. Observabilidad ampliada en agenda con ultimo sync, proximo ciclo y errores recientes.

### Riesgos o bloqueos conocidos
- Sin esas variables, la agenda seguira mostrando `Solo vista` o `idle` aunque W6 exista.
- La discrepancia entre Google Calendar y CRM no se resolvera con mas frontend mientras el backend siga con Calendar desactivado.

---

# Configuracion Pendiente - Fisio_IA_Agent

## Estado actual (2026-03-17, Sesion 103) - CRM profesional completo: 5/9 roadmap completado.

### Completado sesion 103
- [x] Fix FK pagos: filtro pacientes legacy en modal de pago.
- [x] Ficha paciente enriquecida: 13 campos, 4 pestañas (datos, notas, citas, pagos).
- [x] Notas clinicas: timeline con EVA, zona corporal, pruebas. CRUD completo.
- [x] Dashboard KPIs: ingresos mes, sesiones mes, grafico barras apiladas.
- [x] Recordatorios 24h automaticos: endpoint + mensaje Telegram con fecha/hora/motivo.
- [x] Facturacion PDF: tabla crm_facturas, numeracion secuencial, PDF con pdfkit, IVA configurable.
- [x] Benchmarking 7 competidores, plan de mejora de 9 puntos.

### Acciones requeridas antes de probar
1. **Ejecutar migration 009** en Supabase SQL Editor (`database/migrations/009_crm_facturas.sql`).
2. **Rebuild frontend+backend en EasyPanel** (commit `b5cd17f`).
3. Configurar scheduler para recordatorios (n8n Schedule Trigger → POST /api/cron/recordatorios cada hora).
4. Configurar `TELEGRAM_PATIENT_BOT_TOKEN` en EasyPanel si no esta.

### Siguiente paso exacto
1. Ejecutar migration 009 en Supabase.
2. Rebuild en EasyPanel.
3. Probar facturacion: generar factura desde pagos → descargar PDF.
4. Probar ficha paciente: editar datos → crear nota clinica.
5. **Roadmap siguiente**: Firma digital → Bonos → Reserva online.

### Roadmap competitivo (5/9 completado)
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

### Catálogo PROET (estado post sesión 96)
- 179 ejercicios con nombre en español (sin acentos, derivado de `image_filename`)
- 179 ejercicios con `metadata.proet_image_url` → URLs públicas de DO Spaces
- 179 ejercicios con descripción limpia (HTML decodificado, sin entidades)
- 16 ejercicios legacy (sin fuente PROET, sin imagen)

### Estado n8n completo
| ID | Nombre | Estado |
|----|--------|--------|
| ZOarR2hpUUOgm3KC | Router de Mensajes | ON |
| BM9YVm8yDUuRpA55 | W2 Recomendacion Ejercicios | ON |
| dXl8F9jNmTNiafra | W3 Disparador CRM | ON |
| TN1x0kDu03lGBo2a | Puente Error Backend | ON |
| a9pejz5CI7zau52i | Subflujo Pendientes | ON |
| cTp8bORuSL9hsdDk | W1 Agenda de Citas | ON |
| fdBcmetAPoixF6R4 | Bot Fisioterapeuta | ON |
| f1PcLN8s9YiOXj3w | Bot Pacientes | ON |

---

## Estado actual (2026-03-11, Sesion 94) - 8/8 workflows n8n activos. Smoke test 7/7 OK.

### Completado sesion 94
- [x] Fix `httpMethod: POST` en Puente Error Backend capturado en repo y resincronizado. POST 200 confirmado.
- [x] Nombres de todos los JSONs vnext corregidos al convenio `Fisio_IA_Agent / ...`.
- [x] Bot Pacientes (id=f1PcLN8s9YiOXj3w) creado y activado en n8n con credential `citas_fisioterapia_bot`.
- [x] Bot Fisioterapeuta (id=fdBcmetAPoixF6R4) activado con credential `FisioIAAgent` asignada al trigger y reply.
- [x] W1 Agenda de Citas (id=cTp8bORuSL9hsdDk) activado. Credential Google Calendar ya estaba en los 3 nodos Calendar.
- [x] Todos los workflows activos sincronizados con versiones canonicas del repo.
- [x] Smoke test 7/7 OK en produccion.

### Bloqueos pendientes (no bloqueantes para flujo basico)
1. **TELEGRAM_PATIENT_BOT_TOKEN** vacio en backend EasyPanel.
   - El routing y las respuestas via n8n funcionan sin el (default `fisioterapia_CarlaJL`).
   - Necesario solo si el backend tiene que enviar mensajes proactivos via bot de pacientes.
   - Accion: publicar token de `citas_fisioterapia_bot` en `fisio-ia-agent/fisio-backend`.
2. **Google Calendar backend** (GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) vacios.
   - W1 en n8n gestiona Calendar via OAuth2 directamente: citas funcionan.
   - El `calendar_sync` interno del backend sigue skipped (fallback a CRM).
   - Accion: opcional si se quiere calendar sync desde backend tambien.

### Siguiente paso exacto
1. Publicar en EasyPanel `fisio-ia-agent/fisio-backend`:
   - `TELEGRAM_PATIENT_BOT_TOKEN=<token de citas_fisioterapia_bot>`
   - `TELEGRAM_PATIENT_BOT_USERNAME=<username del bot>`
2. Redeploy backend.
3. Test E2E real desde Telegram de paciente: texto libre + nota de voz + cita en CRM + evento Google Calendar.
4. Test E2E desde Telegram fisioterapeuta: comando `/informe <paciente_id>|<sintomas>` + PDF.

### Estado n8n completo
| ID | Nombre | Estado |
|----|--------|--------|
| ZOarR2hpUUOgm3KC | Router de Mensajes | ON |
| BM9YVm8yDUuRpA55 | W2 Recomendacion Ejercicios | ON |
| dXl8F9jNmTNiafra | W3 Disparador CRM | ON |
| TN1x0kDu03lGBo2a | Puente Error Backend | ON |
| a9pejz5CI7zau52i | Subflujo Pendientes | ON |
| cTp8bORuSL9hsdDk | W1 Agenda de Citas | ON |
| fdBcmetAPoixF6R4 | Bot Fisioterapeuta | ON |
| f1PcLN8s9YiOXj3w | Bot Pacientes | ON |

---

## Estado actual (2026-03-11, Sesion 93) - Backend con OPENAI_API_KEY y W1 creado en n8n

### Completado esta sesion
- [x] `OPENAI_API_KEY` publicada en `fisio-backend` (EasyPanel). Voz nativa Telegram ya puede funcionar.
- [x] `N8N_APPOINTMENT_WEBHOOK_URL` publicada en `fisio-backend`.
- [x] `FRONTEND_URL` corregida a `https://fisio-frontend.b5xbaf.easypanel.host` (estaba apuntando a localhost).
- [x] `TELEGRAM_PHYSIO_BOT_TOKEN` y `TELEGRAM_PHYSIO_BOT_USERNAME` publicadas en backend.
- [x] Variables de observabilidad del motor de ejercicios publicadas en backend.
- [x] `fisio-backend` redespliegue con ultimo commit `10d559d` completado.
- [x] Workflow `Fisio_IA_Agent / W1 Appointment Agent` creado en n8n via API (id=cTp8bORuSL9hsdDk).
- [x] Corregido bug en `scripts/sync-n8n-workflow.mjs`: create fallaba con propiedades extra rechazadas por n8n API.
- [x] Nota: W1 queda fuera de la carpeta `Fisio_IA_Agent` en n8n UI (limitacion de API publica con esta licencia).

### Bloqueos pendientes
1. **Google Calendar**: `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` siguen vacios en backend.
   - `calendar_sync.enabled=false` hasta que se publiquen.
2. **W1 inactivo**: El workflow W1 existe en n8n pero no esta activo porque el bot de pacientes aun no existe.
3. **Bot nuevo de pacientes**: Pendiente de crear en Telegram. Cuando exista, publicar `TELEGRAM_PATIENT_BOT_TOKEN` y `TELEGRAM_PATIENT_BOT_USERNAME` en backend y activar W1.

### Punto de partida exacto
1. Obtener credenciales de Google Calendar (service account JSON) y publicar en `fisio-backend`:
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - Decidir si `GOOGLE_CALENDAR_REQUIRED=true`
2. Redeploy de `fisio-backend` para activar calendar sync.
3. Crear nuevo bot de pacientes en Telegram (@BotFather).
4. Publicar `TELEGRAM_PATIENT_BOT_TOKEN` + `TELEGRAM_PATIENT_BOT_USERNAME` en `fisio-backend`.
5. Activar W1 en n8n: `node scripts/sync-n8n-workflow.mjs --workflow=n8n/Fisio_IA_Agent/vnext/w1-appointment-agent.json --workflowId=cTp8bORuSL9hsdDk --activate=true`
6. Validar E2E: texto libre + nota de voz + alta en CRM + evento en Google Calendar.

### Riesgos
- Sin `GOOGLE_CALENDAR_REQUIRED=true`, el sistema sigue funcionando aunque Calendar falle (fallback directo a CRM).
- Hasta que no exista el bot nuevo de pacientes, W1 queda listo pero desconectado de Telegram.
## Estado actual (2026-03-11, Sesion 91) - Citas Telegram validadas en CRM, voz nativa y Calendar pendientes

### Completado esta sesion
- [x] Verificado en produccion GET /api/telegram/link-code/:patientId con respuesta correcta de vinculo Telegram del paciente.
- [x] Verificadas dos altas reales por POST /api/telegram/incoming:
  - texto libre de cita
  - payload con voice_transcript
- [x] Confirmadas filas reales en crm_citas con canal_origen=telegram y estado=pendiente.
- [x] Confirmado rastro en mensajes_ingesta_paciente para la solicitud simulada de voz transcrita.
- [x] Confirmado en crm_comunicaciones que la cita entra por fallback backend y que calendar_sync queda skipped.
- [x] El repo ya corrige la duplicacion de crm_pacientes cuando una cita entra por fallback con paciente legacy sin email.

### Punto de partida exacto (siguiente bloque)
1. Publicar OPENAI_API_KEY en fisio-backend.
2. Publicar GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY y, si procede, GOOGLE_CALENDAR_REQUIRED=true.
3. Redeploy de fisio-backend.
4. Validar con un chat real del bot de pacientes:
   - texto libre de cita
   - nota de voz real de Telegram
   - alta en CRM
   - evento en Google Calendar

### Riesgos o bloqueos conocidos
- Sin OPENAI_API_KEY en backend productivo, la nota de voz nativa seguira contestando que no puede procesar audios.
- Sin credenciales de Google Calendar en backend productivo, las citas seguiran entrando en CRM pero calendar_sync quedara skipped.
- El flujo de voz nativo aun no puede darse por cerrado sin un file_id real de Telegram de una nota de voz real.
- frontend/stitch.zip sigue siendo solo referencia local y no debe trackearse.
## Estado actual (2026-03-11, Sesion 90) - Bot pacientes preparado para citas por texto o voz

### Completado esta sesion
- [x] El bot de pacientes ya puede recibir audio/voice de Telegram y transcribirlo a texto antes de enrutar la cita.
- [x] El CRM gana acceso rapido `Telegram` desde la lista de pacientes para llegar al bloque de vinculacion del canal.
- [x] El smoke test incluye un caso simulado de cita por voz transcrita.

### Punto de partida exacto (siguiente bloque)
1. Publicar variables backend para voz: `OPENAI_API_KEY` y, si aplica, revisar `TELEGRAM_PATIENT_BOT_USERNAME` / `TELEGRAM_PATIENT_BOT_TOKEN`.
2. Hacer redeploy de `fisio-backend` y `fisio-frontend`.
3. Validar con un paciente real: texto libre de cita, nota de voz, alta en CRM y sync a Google Calendar.

### Riesgos o bloqueos conocidos
- Sin `OPENAI_API_KEY` en backend productivo, el bot de pacientes seguira aceptando texto pero respondera que no puede procesar audios.
- `frontend/stitch.zip` sigue siendo solo referencia local y no debe trackearse.

## Estado actual (2026-03-11, Sesion 89) - Contrastes finales del Copilot corregidos

### Completado esta sesion
- [x] El selector de paciente del rail ya separa placeholder y valor seleccionado con colores distintos y legibles.
- [x] El rail fuerza modo claro en el control nativo para evitar texto blanco sobre fondo blanco en Chromium.
- [x] npm run build OK en frontend aislado con la version sincronizada desde el repo canonico.

### Punto de partida exacto (siguiente bloque)
1. Hacer redeploy de fisio-frontend desde origin/main.
2. Validar en produccion la seleccion de paciente y los textos del rail.
3. Si el visual queda cerrado, volver al siguiente frente funcional del CRM.

### Riesgos o bloqueos conocidos
- frontend/stitch.zip sigue siendo solo referencia local y no debe trackearse.
- El unico bloqueo inmediato vuelve a ser publicar y validar visualmente en produccion.

## Estado actual (2026-03-11, Sesion 88) - Copilot alineado con referencia Stitch

### Completado esta sesion
- [x] Se usa `frontend/stitch.zip` como referencia real de diseno para el rail del agente.
- [x] El Copilot queda reorganizado con selector superior, chat central y pie de acciones/input mas limpio.
- [x] `npm run build` OK en frontend aislado.

### Punto de partida exacto (siguiente bloque)
1. Hacer redeploy de `fisio-frontend` desde `origin/main`.
2. Comparar produccion con la referencia Stitch en tres estados: vacio, chat libre e informe generado.
3. Si el rail queda validado, volver al siguiente frente funcional pendiente del CRM.

### Riesgos o bloqueos conocidos
- `frontend/stitch.zip` es solo referencia local del usuario y no debe publicarse al repo.
- El bloqueo inmediato vuelve a ser publicar y validar visualmente en produccion.

## Estado actual (2026-03-11, Sesion 87) - Copilot lateral redisenado y pendiente de publicar

### Completado esta sesion
- [x] Redisenado completo del rail del agente para dejarlo coherente con el CRM y sin mezcla de tema oscuro legacy.
- [x] Mensajes, informe, textarea y botones quedan con contraste alto y estilo unico.
- [x] `npm run build` OK en frontend aislado y CSS compilado revisado.

### Punto de partida exacto (siguiente bloque)
1. Hacer redeploy de `fisio-frontend` desde `origin/main`.
2. Verificar en produccion un chat vacio, una consulta libre y un informe generado para confirmar que todo el rail mantiene legibilidad.
3. Si el rail queda bien, volver a CRM -> invitacion Telegram del paciente.

### Riesgos o bloqueos conocidos
- El unico bloqueo inmediato vuelve a ser publicar y validar el frontend en produccion.
- Si tras el redeploy aparece cualquier divergencia, el siguiente paso sera inspeccionar directamente el HTML/CSS servido, no seguir tocando el diseno a ciegas.

## Estado actual (2026-03-11, Sesion 86) - Copilot con una sola superficie conversacional

### Completado esta sesion
- [x] El rail lateral del agente queda reducido a una unica superficie de conversacion e input.
- [x] Se elimina la tarjeta inicial visible que hacia sentir que habia una segunda ventana de texto.
- [x] Selector de paciente y acciones rapidas se mantienen, pero ya no compiten visualmente con el area conversacional.
- [x] `npm run build` OK en frontend aislado.

### Punto de partida exacto (siguiente bloque)
1. Hacer redeploy de `fisio-frontend` desde `origin/main`.
2. Verificar en produccion que el Copilot tenga una unica superficie de texto y que el historial aparezca dentro del mismo plano visual que el compositor.
3. Si el rail ya queda comodo y profesional, volver a CRM -> invitacion Telegram del paciente.

### Riesgos o bloqueos conocidos
- El punto pendiente inmediato vuelve a ser de publicacion y validacion visual en produccion.
- El repo ya refleja el UX final de este bloque; si produccion difiere tras el redeploy, el siguiente paso sera inspeccionar directamente el HTML/CSS servido.

## Estado actual (2026-03-11, Sesion 85) - Copilot lateral simplificado

### Completado esta sesion
- [x] Se simplifica el rail del agente a un layout de uso real: resumen minimo, chat y una unica caja de texto, manteniendo seleccion de paciente, chat libre, generar plan y guardar PDF.
- [x] Se eliminan cards de contexto y shortcuts que estaban generando scrolls redundantes y solapamiento visual.
- [x] npm run build OK en frontend aislado.

### Punto de partida exacto (siguiente bloque)
1. Hacer redeploy de fisio-frontend desde origin/main.
2. Verificar en produccion que el Copilot tenga una sola zona de scroll util y que el textarea quede siempre visible.
3. Si el rail ya es usable, seguir con CRM -> invitacion Telegram del paciente.

### Riesgos o bloqueos conocidos
- El punto pendiente inmediato ya no es de codigo, sino de publicar y validar el nuevo UX del Copilot en produccion.

Estado actualizado para retomar sin perdida.

## Estado actual (2026-03-11, Sesion 84) - Ajuste visual del Copilot lateral

### Completado esta sesion
- [x] Corregido en repo el conflicto visual claro/oscuro del assistant rail.
- [x] Reducida la altura efectiva del composer para que no tape el contenido superior en desktop.
- [x] npm run build OK en frontend aislado.

### Punto de partida exacto (siguiente bloque)
1. Hacer redeploy de fisio-frontend desde origin/main.
2. Verificar en produccion que el rail lateral ya no mezcla tema oscuro/claro ni pisa las cards superiores.
3. Si el visual queda bien, retomar la validacion CRM -> invitacion Telegram del paciente.

### Riesgos o bloqueos conocidos
- El backend ya no es el bloqueo principal; el punto pendiente inmediato es publicar y verificar el fix visual del frontend.

Estado actualizado para retomar sin perdida.

## Estado actual (2026-03-11, Sesion 83) - CRM listo para invitacion Telegram de pacientes

### Completado esta sesion
- [x] Backend endurecido: GET /api/telegram/link-code/:patientId y POST seguro sin reset accidental de chats ya vinculados.
- [x] Historial del CRM ya muestra estado Telegram del paciente.
- [x] Desde CRM ya se puede preparar invitacion, copiar /start, copiar deep link y regenerar codigo si la vinculacion sigue pendiente.

### Punto de partida exacto (siguiente bloque)
1. Si se quiere usar en produccion, hacer redeploy manual de fisio-backend y fisio-frontend.
2. Validar un caso real desde CRM + Telegram: generar codigo en historial, abrir Telegram y completar /start CODIGO.
3. Si queda estable, volver al siguiente frente visible del CRM/EasyPanel.

### Riesgos o bloqueos conocidos
- La UI nueva y el GET /api/telegram/link-code aun no estan en produccion hasta redeploy.
- Sigue pendiente una prueba manual real del flujo CRM -> invitacion -> vinculacion Telegram en canal vivo.

## Estado actual (2026-03-11, Sesion 82) - Bot fisio desbloqueado via crm_perfiles

### Completado esta sesion
- [x] Migracion productiva aplicada sobre crm_perfiles para columnas Telegram.
- [x] /informe del bot fisio ya persiste el chat profesional en crm_perfiles.
- [x] /api/telegram/physio-report/send funciona sin chat_id explicito y resuelve el target desde crm_perfiles.
- [x] Nuevo dry_run local implementado para esa ruta, pendiente redeploy backend.

### Punto de partida exacto (siguiente bloque)
1. Decidir si hacer redeploy del backend para publicar el dry_run nuevo.
2. Si no hacemos redeploy ahora, volver al siguiente frente visible del CRM/EasyPanel.
3. No hace falta seguir invirtiendo tiempo en el cuello de botella del bot fisio: ya esta funcionalmente resuelto.

### Riesgos o bloqueos conocidos
- El dry_run de physio-report/send aun no esta en produccion hasta redeploy.
- Los chats historicos de test siguen obsoletos; el unico target real confirmado sigue siendo el chat vivo ya vinculado.

## Estado actual (2026-03-11, Sesion 81) - Telegram triage validado en chat real

### Completado esta sesion
- [x] Entrega real a Telegram validada sobre el chat vinculado de raulruizdiaz.
- [x] El backend devuelve 200 y el mensaje se persiste en mensajes_ingesta_paciente.
- [x] Queda demostrado que el triage nuevo funciona tambien fuera de dry run.

### Punto de partida exacto (siguiente bloque)
1. Revisar el texto recibido en el chat real y decidir si necesita pulido de copy.
2. Si el copy es valido, cerrar este bloque como DONE.
3. Elegir siguiente frente: bot fisio/crm_perfiles o redeploys pendientes de CRM.

### Riesgos o bloqueos conocidos
- Los chats de test historicos siguen devolviendo chat not found; no sirven como target real repetible.
- crm_perfiles en produccion sigue sin las columnas telegram_chat_id/telegram_username/telegram_linked_at.

## Estado actual (2026-03-11, Sesion 80) - Validacion real controlada Telegram OK, pendiente chat humano

### Completado esta sesion
- [x] Prueba no dry_run sobre POST /api/telegram/incoming con payload custom y paciente de test ya vinculado.
- [x] El backend responde con el copy nuevo de triage para Me duele.
- [x] Se verifica registro real en mensajes_ingesta_paciente para TestE2E con estado=pendiente_revision.
- [x] La prueba evita enviar mensaje real a Telegram porque no entra por webhook nativo.

### Punto de partida exacto (siguiente bloque)
1. Ejecutar prueba manual real desde Telegram con un chat humano ya vinculado.
2. Confirmar recepcion visible del mensaje de triage en el chat real.
3. Si la UX es correcta, cerrar el bloque Telegram triage y pasar al siguiente foco funcional.

### Riesgos o bloqueos conocidos
- Sigue faltando la prueba final con mensaje real entregado por Telegram al usuario.
- La tabla crm_perfiles en produccion aun no expone las columnas telegram_chat_id/telegram_username/telegram_linked_at; por eso el targeting del bot fisio sigue dependiendo de otras rutas o configuracion.
## Estado actual (2026-03-11, Sesion 79) - Triage clinico n8n desplegado y validado por dry run

### Completado esta sesion
- [x] `build-agent-reply-triage.js` versionado en repo como fuente del nodo n8n.
- [x] `fisio-agent-core.json` actualizado con ruta `triage_needed` y extraccion de contexto clinico minimo.
- [x] Corregido el webhook del core a `POST`; el backend ya no cae por `n8n_http_error` en este flujo.
- [x] Nuevo script `scripts/sync-n8n-workflow.mjs` para sincronizar workflows n8n sin depender de PowerShell.
- [x] Workflow remoto `Fisio_IA_Agent / Nucleo Agente` actualizado por API.
- [x] Smoke test remoto Telegram dry run completado: `6/6 OK`, incluyendo `triage_free_text` -> `triage_needed`.

### Punto de partida exacto (siguiente bloque)
1. Ejecutar prueba manual real del bot Telegram con un chat ya vinculado.
2. Confirmar que el triage en canal real pide contexto suficiente sin sonar robotico.
3. Si la UX es correcta, siguiente paso: ajustar wording final o dejar el triage como baseline estable.

### Riesgos o bloqueos conocidos
- Falta aun la prueba manual E2E real en Telegram; hasta entonces la validacion es fuerte pero sigue siendo `dry_run`.
- El redeploy de frontend/backend en EasyPanel sigue siendo un tema aparte cuando se quiera publicar cambios visibles del CRM.

## Estado actual (2026-03-11, Sesion 78) - Triage clinico n8n preparado, pendiente upload

### Completado esta sesion
- [x] Fix responsive UI del assistant rail verificado en produccion (chat input visible).
- [x] Workflow actual n8n importado y verificado (ruta session_note).
- [x] Nuevo codigo JS para el nodo "Build Agent Reply" creado (`/tmp/build-agent-reply-v2.js` guardado localmente). Incluye deteccion anatomica, factores agravantes y ruta `triage_needed`.

### Punto de partida exacto (siguiente bloque)
1. **Atasco actual:** El script de PowerShell para subir el JSON grande del workflow a la API de n8n se queda colgado.
2. **Accion inmediata:** Importar manualmente el codigo de triage al nodo "Build Agent Reply" en n8n, O probar otro metodo de upload via API.
3. Una vez subido, probar casos de triage en Telegram dry-run ("me duele" -> espera `triage_needed`).
4. Prueba final real E2E en Telegram.

## Estado actual (2026-03-11, Sesion 77) - Fix responsive UI completo, pendiente de redeploy

### Completado esta sesion
- [x] Migracion `crm_async_jobs` aplicada en Supabase (tabla + indices + trigger).
- [x] Frontend: fix critico del assistant rail (chat input visible en cualquier pantalla).
- [x] n8n core: refinamiento de clasificacion con mas keywords y ruta fallback.
- [x] Smoke tests OK: Telegram 5/5, W2 async done, health OK.
- [x] Todos los cambios pusheados a GitHub main (commits 2b72db5, 5d54a40, 2df261a).
- [x] CHANGELOG actualizado a Sesion 77.

### Punto de partida exacto (siguiente bloque)
1. Redeploy frontend y backend en EasyPanel.
2. Importar `fisio-agent-core.json` actualizado en n8n.
3. Verificar visualmente el frontend post-deploy (assistant rail + chat input).
4. Prueba manual del bot Telegram real con chat vinculado.

### Riesgos o bloqueos conocidos
- El frontend en produccion aun muestra la version anterior. Necesita redeploy en EasyPanel.
- El n8n sigue con el workflow anterior hasta que se importe el JSON actualizado.

## Estado actual (2026-03-09, Sesion 70) - Smoke test remoto de Telegram ya automatizado y validado

### Completado esta sesion
- [x] scripts/telegram-dry-run.mjs creado como smoke test reproducible del canal Telegram.
- [x] Validacion remota en produccion completada: 5 de 5 casos OK en dry_run.
- [x] README actualizado con el comando operativo del smoke test.

### Punto de partida exacto (siguiente bloque)
1. Ejecutar prueba manual del bot Telegram real con un chat ya vinculado.
2. Comparar resultado real del bot con la prediccion del dry run.
3. Despues, mejorar el core n8n para reducir la dependencia de fallback y normalizacion backend.

### Riesgos o bloqueos conocidos
- El bot real aun requiere prueba manual con un chat vinculado para cerrar la validacion E2E completa.
- n8n sigue devolviendo respuestas demasiado genericas en algunos casos; backend ya lo compensa, pero el workflow base todavia merece refinado.
## Estado actual (2026-03-09, Sesion 69) - Dry run seguro para Telegram pendiente de deploy backend

### Completado esta sesion
- [x] POST /api/telegram/incoming ya soporta dry_run=true con payload custom para validar clasificacion y respuesta sin efectos laterales.
- [x] El dry run devuelve reply_text, next_action, red_flags y clasificacion prevista para el mensaje o comando.
- [x] Validacion tecnica: node --check OK en telegram.js dentro de la copia aislada del backend.

### Punto de partida exacto (siguiente bloque)
1. Redeploy de fisio-backend.
2. Ejecutar prueba API de dry run sobre /api/telegram/incoming.
3. Despues, lanzar prueba manual del bot Telegram real con un chat ya vinculado.

### Riesgos o bloqueos conocidos
- Hasta el redeploy, produccion no expone aun el dry run nuevo.
- La simulacion local por import directo del router sigue limitada por el acoplamiento actual con src/index.js; la validacion buena pasa por la API desplegada.
## Estado actual (2026-03-09, Sesion 68) - Telegram en modo n8n-first, pendiente de deploy backend

### Completado esta sesion
- [x] Telegram ya no consulta el edge-router legacy de Supabase por defecto; n8n compartido y la heuristica local pasan a ser la ruta normal.
- [x] El edge-router legacy queda solo como escape hatch opcional con TELEGRAM_EDGE_ROUTER_ENABLED=true.
- [x] backend/.env.example actualizado para dejar documentada esa compatibilidad.

### Punto de partida exacto (siguiente bloque)
1. Redeploy de fisio-backend.
2. Ejecutar prueba real del bot Telegram existente.
3. Verificar que el flujo Telegram sigue resolviendo ejercicio, cita y seguimiento sin depender del edge-router legacy.

### Riesgos o bloqueos conocidos
- Hasta el redeploy, produccion sigue usando la version anterior del backend para Telegram.
- Si algun entorno dependia implicitamente del edge-router legacy, ahora solo seguira haciendolo si TELEGRAM_EDGE_ROUTER_ENABLED=true.
## Estado actual (2026-03-09, Sesion 67) - Telegram alineado con el reply compartido del agente, pendiente de deploy backend

### Completado esta sesion
- [x] Telegram ya no responde con el mensaje generico legacy cuando el gateway compartido del agente ya ha generado un reply_text util.
- [x] El flujo mantiene W2 para ejercicios y W1 para citas, pero ahora cae de forma coherente al reply del agente compartido si no entra en esas ramas.
- [x] Validacion tecnica: node --check OK en telegram.js dentro de la copia aislada del backend.

### Punto de partida exacto (siguiente bloque)
1. Redeploy de fisio-backend.
2. Lanzar prueba real al bot Telegram existente.
3. Verificar que Telegram y CRM devuelven el mismo tipo de respuesta base para ejercicio, cita y seguimiento.

### Riesgos o bloqueos conocidos
- Hasta el redeploy, Telegram en produccion puede seguir rematando algunos mensajes con la respuesta generica antigua.
- Queda pendiente la prueba manual real del bot para validar el recorrido completo con un chat ya vinculado.
## Estado actual (2026-03-09, Sesion 66) - Normalizacion backend para respuestas genericas de n8n pendiente de deploy

### Completado esta sesion
- [x] El gateway compartido CRM y Telegram ya corrige rutas genericas de n8n como register_intake y unknown cuando la heuristica local detecta una intencion mas especifica.
- [x] La heuristica se ha afinado para distinguir mejor entre solicitud de ejercicios y descripcion de sintomas o limitacion funcional.
- [x] Validacion aislada completa: ejercicio -> exercise, cita -> appointment, seguimiento -> session_note.

### Punto de partida exacto (siguiente bloque)
1. Redeploy de fisio-backend.
2. Reprobar POST /api/agent/message en produccion con ejercicio, cita y seguimiento.
3. Despues, verificar paridad del mismo comportamiento desde Telegram.

### Riesgos o bloqueos conocidos
- Hasta el redeploy, produccion puede seguir devolviendo register_intake desde el chat CRM aunque el backend ya tenga la correccion en local.
- n8n sigue siendo demasiado generico en su salida actual; la correccion backend evita degradacion, pero el workflow de n8n seguira mereciendo afinado posterior.
## Estado actual (2026-03-09, Sesion 65) - Paridad CRM chat / Telegram pendiente de deploy backend

### Completado esta sesion
- [x] El chat CRM y Telegram ya comparten gateway de agente hacia `n8n` en backend.
- [x] Telegram sigue conservando W1 citas y W2 ejercicios, pero el chat libre ya no arranca desde un criterio totalmente distinto al CRM.
- [x] Validacion tecnica: `node --check` OK en `backend/src/routes/agent.js` y `backend/src/routes/telegram.js`.

### Punto de partida exacto (siguiente bloque)
1. Redeploy de `fisio-backend`.
2. Validar en produccion un `POST /api/agent/message` y un mensaje libre de Telegram.
3. Confirmar que ambos devuelven el mismo tono/intencion base para ejercicio, cita y seguimiento.

### Riesgos o bloqueos conocidos
- Hasta el redeploy, produccion sigue con la divergencia anterior entre CRM y Telegram para chat libre.
- Telegram todavia conserva fallback W0 via edge router si n8n no devuelve ruta suficiente; eso es intencional para no perder robustez.

## Estado actual (2026-03-09, Sesion 64) - Mejora de cobertura W2 y limpieza visual pendiente de deploy

### Completado esta sesion
- [x] El backend ya intenta priorizar y completar ejercicios con imagen cuando existan alternativas equivalentes en catalogo.
- [x] Nueva variable documentada: `EXERCISE_IMAGE_MIN_RATIO` (default `0.75`).
- [x] Nueva observabilidad backend: `image_min_ratio` e `image_coverage_adjusted`.
- [x] El frontend limpia los separadores corruptos visibles del rail y del resumen del agente.
- [x] Validacion tecnica cerrada:
  - `node --check backend/src/routes/exercises.js` OK,
  - `astro build` OK en copia aislada,
  - `astro check` OK en copia aislada.

### Punto de partida exacto (siguiente bloque)
1. Redeploy de `fisio-backend`.
2. Redeploy de `fisio-frontend`.
3. Validar en produccion un caso real desde el copilot y revisar si la cobertura de imagen mejora sin activar fallback innecesario.
4. Si la cobertura sigue corta en ciertas zonas, siguiente escalon: enriquecer el catalogo PROET o marcar ejercicios sin imagen para que el motor los evite desde origen.

### Riesgos o bloqueos conocidos
- Esta mejora todavia no esta en produccion hasta redeploy de backend y frontend.
- La cobertura final sigue dependiendo de que existan alternativas con imagen en el catalogo para esa zona/sintoma.

## Estado actual (2026-03-09, Sesion 63) - Optimizacion W2 pendiente de deploy

### Completado esta sesion
- [x] Se reduce el contexto enviado al motor IA desde `backend/src/routes/exercises.js` mediante shortlist heuristica.
- [x] Nueva variable documentada: `EXERCISE_ENGINE_CANDIDATE_LIMIT` (default `24`).
- [x] Nueva observabilidad backend: `catalog_total`, `candidate_count`, `candidate_limit`.

### Punto de partida exacto (siguiente bloque)
1. Redeploy de `fisio-backend`.
2. Validar si bajan `fallback_used` y `total_duration_ms` en W2 sync/async.
3. Si sigue habiendo timeout frecuente, siguiente escalon: revisar o sustituir el motor remoto (`edge_function`/n8n).

### Riesgos o bloqueos conocidos
- Esta mejora todavia no esta en produccion hasta redeploy del backend.
- El motor puede seguir entrando en fallback si el proveedor remoto esta lento; ahora al menos tendremos metrica clara del recorte de candidatos.

## Estado actual (2026-03-09, Sesion 62) - Fix productivo del agente de ejercicios pendiente de deploy

### Completado esta sesion
- [x] Root cause confirmado del error `Error generando recomendacion` en el copilot rail.
- [x] El backend de ejercicios ya resuelve `patient_id` y `fisioterapeuta_id` del modelo legacy al modelo CRM antes de persistir.
- [x] La ruta async tambien queda corregida para que los jobs no nazcan con IDs legacy incompatibles.
- [x] Se desacopla generacion vs persistencia: si falla el guardado, el informe aun se devuelve con `persistence_warning`.
- [x] Validacion de sintaxis: `node --check backend/src/routes/exercises.js` OK.

### Punto de partida exacto (siguiente bloque)
1. Commit y push del fix a `main`.
2. Redeploy de `fisio-backend` en EasyPanel.
3. Validar en produccion desde navegador:
   - seleccionar paciente,
   - pedir plan desde el rail,
   - confirmar que ya no aparece `Error generando recomendacion`,
   - revisar si llega con imagenes o solo con cobertura parcial.
4. Repetir smoke test por terminal usando el `PROF_ID` bruto del frontend para confirmar que el backend lo resuelve solo.

### Riesgos o bloqueos conocidos
- La API TRPC de EasyPanel responde `401 UNAUTHORIZED` desde esta sesion; con solo la URL no basta para redeploy automatico.
- No hay token EasyPanel cargado en variables de entorno de esta shell ni localizado en `.env.local`/`backend/.env`.
- `npm run lint` en la copia sincronizada de Google Drive sigue sin ser fiable por dependencias locales incompletas.




## Estado actual (2026-03-08, Sesion 60) - Checkpoint exacto con copilot rail y CRM ampliado

### Completado esta sesion
- [x] El asistente deja de vivir en el dashboard y pasa a rail lateral persistente para todas las paginas.
- [x] El prompt del agente ya no desaparece al lanzar la accion.
- [x] Se deja el CRM con mas piezas funcionales listas para uso:
  - alta de pacientes,
  - buscador superior,
  - notas de seguimiento,
  - creacion de citas,
  - copilot lateral fijo.
- [x] `CHANGELOG.md`, `README.md` y checkpoint de continuidad actualizados.
- [x] Frontend validado de nuevo con `scripts/frontend-local-build.ps1`.

### Punto de partida exacto (siguiente sesion)
1. Retomar desde este commit/checkpoint exacto.
2. Probar manualmente en navegador:
   - generar plan con paciente seleccionado,
   - exportar PDF,
   - preguntar en chat,
   - abrir/usar copilot desde varias paginas.
3. Si el agente de ejercicios sigue tardando demasiado:
   - implementar flujo asincrono/polling para `POST /api/exercises/recommend`.
4. Solo despues valorar despliegue final o nuevos pulidos visuales.

### Riesgos o bloqueos conocidos
- La ergonomia del frontend queda resuelta, pero el cuello de botella del motor IA puede seguir existiendo si el webhook tarda demasiado.
- En la ruta sincronizada `G:\Mi unidad\...` puede seguir siendo preferible validar frontend en `C:\Temp`.
## Estado actual (2026-03-07, Sesion 59) - Checkpoint seguro tras crash y validacion limpia

### Completado esta sesion
- Ã¢Å“â€¦ Revision repo/Git/GitHub completada para reconstruir el estado tras el crash.
- Ã¢Å“â€¦ Corregida incoherencia en `frontend/src/pages/index.astro`:
  - `Timeouts/Reintentos IA` sin doble conteo entre reintentos locales y `engine_observability`.
  - `Informes IA archivados` solo sube cuando el PDF se archiva con exito.
  - eliminado helper TS sin uso para dejar `astro check` limpio.
- Ã¢Å“â€¦ Validacion segura completada:
  - `node --check` backend OK.
  - JSON n8n OK.
  - `scripts/frontend-local-build.ps1` OK en `C:\Temp\Fisio_IA_Agent_frontend_local`.
  - `npm run check` OK (`0 errors`, `0 warnings`, `0 hints`).

### Punto de partida exacto (siguiente decision)
1. Decidir si continuar hoy con pulido UI de la Sesion 58:
   - hover/focus states finos,
   - pequenos ajustes responsive,
   - revision visual manual con backend/API levantados.
2. O cerrar por hoy desde este checkpoint documentado y retomarlo manana.
3. Si se retoma manana:
   - abrir este repo tal como queda tras el commit/push de este checkpoint,
   - validar frontend con `scripts/frontend-local-build.ps1`,
   - continuar en `frontend/src/pages/index.astro` sin tocar de nuevo las metricas ya estabilizadas.

### Riesgos o bloqueos conocidos
- En la ruta sincronizada `G:\Mi unidad\...` `npm install` del frontend puede bloquearse; usar validacion temporal en `C:\Temp`.
- Falta aun validacion funcional manual con backend/API vivos tras el rediseÃƒÂ±o de UI.

## Estado actual (2026-03-07, Sesion 58) - Cierre para continuar manana

### Completado esta sesion
- Ã¢Å“â€¦ Cambio global de Theme a Light Clinical Theme (`Layout.astro`).
- Ã¢Å“â€¦ ReesctructuraciÃƒÂ³n del Dashboard (`index.astro`) a formato vertical.
- Ã¢Å“â€¦ MÃƒÂ³dulo central de IA posicionado full-width desplazando el sidebar antÃƒÂ­guo.
- Ã¢Å“â€¦ MenÃƒÂº de navegaciÃƒÂ³n reordenado para flujo clÃƒÂ­nico.

### Punto de partida exacto (siguiente sesion)
1. Terminar ajustes visuales CSS en `index.astro` (responsive breakpoints finos, hover states).
2. Aplicar "Empty states" y "Loading states" limpios y profesionales.
3. Refinar Copywriting (textos mÃƒÂ¡s clÃƒÂ­nicos y directos).
4. Levantar servidor entorno dev para comprobar que los layouts, modales y APIs heredadas funcionan en el nuevo DOM sin romper funcionalidad.

## Estado actual (2026-03-05, Sesion 57) - Punto de control previo

### Completado esta sesion
- Ã¢Å“â€¦ CRM chat con selector de paciente obligatorio para informe de ejercicios.
- Ã¢Å“â€¦ Eliminado bloqueo funcional `patient_required` en UX (validacion previa en frontend).
- Ã¢Å“â€¦ Panel/chat ajustado para small desktop + movil (evita cortes y desestructuracion).
- Ã¢Å“â€¦ Doble bot Telegram consolidado en codigo/documentacion:
  - `fisioterapia_CarlaJL` para citas.
  - `FisioIA_Agent_bot` para informes PDF de ejercicios.
- Ã¢Å“â€¦ `CHANGELOG.md` actualizado con resumen completo y arranque de siguiente sesion.

### Punto de partida exacto (siguiente sesion)
1. Deploy backend y frontend en EasyPanel con el ultimo commit de `main`.
2. Test CRM:
   - seleccionar paciente en chat,
   - generar ejercicios,
   - exportar PDF,
   - verificar historial.
3. Test bot citas (`fisioterapia_CarlaJL`):
   - `/start CODIGO`,
   - `/cita <inicio_iso> <fin_iso>`,
   - validar CRM + Google Calendar.
4. Test bot fisio (`FisioIA_Agent_bot`):
   - `/informe <paciente_id> | <sintomas>`,
   - validar PDF recibido.
5. Si algo no cuadra visualmente: limpiar cache y verificar hash de build desplegado.

## Estado actual (2026-03-05, Sesion 56) - Exportacion PDF de informe implementada

### Completado esta sesion
- Ã¢Å“â€¦ Dashboard CRM con nuevo boton `PDF` en el panel del agente.
- Ã¢Å“â€¦ Exportacion de informe de ejercicios a PDF estructurado (jsPDF en frontend):
  - resumen clinico,
  - ejercicios con pauta y motivos,
  - mensajes de paciente/fisio,
  - IDs de trazabilidad (`request_id`, `recommendation_id`).
- Ã¢Å“â€¦ Estilos y comportamiento responsive del boton PDF aÃƒÂ±adidos.

### Pendiente inmediato para cierre operativo
1. Redeploy de `fisio-frontend` para publicar boton PDF en produccion.
2. Prueba manual en navegador:
   - generar recomendacion,
   - pulsar PDF,
   - validar archivo descargado y legibilidad.
3. Si se desea incluir imagen embebida (no solo URL), evaluar mejora v2 con render de imagen en PDF.

## Estado actual (2026-03-05, Sesion 55) - Observabilidad W2 endurecida y documentada

### Completado esta sesion
- Ã¢Å“â€¦ `backend/src/routes/exercises.js`:
  - fallback explicito `engine_target_not_configured` cuando no hay target IA valido.
- Ã¢Å“â€¦ `frontend/src/pages/index.astro`:
  - metrica `Timeouts/Reintentos IA` ahora incorpora observabilidad backend por `request_id` (sin doble conteo).
- Ã¢Å“â€¦ Configuracion/documentacion alineada:
  - `backend/.env.example` incluye `EXERCISE_ENGINE_TIMEOUT_MS` y `EXERCISE_ENGINE_MAX_ATTEMPTS`.
  - `README.md` documenta observabilidad de `POST /api/exercises/recommend`.
  - script `scripts/w2-smoke-observability.mjs` para smoke test rapido de observabilidad.

### Pendiente inmediato para cierre operativo
1. Redeploy backend/frontend en EasyPanel.
2. Repetir smoke test E2E desde CRM con caso de timeout controlado.
   - verificacion previa (sin redeploy): `fisio-backend` responde `200` pero sin `engine_observability.attempts/retries_used`.
3. Ajustar en produccion (si aplica):
   - `EXERCISE_ENGINE_TIMEOUT_MS`
   - `EXERCISE_ENGINE_MAX_ATTEMPTS`

## Estado actual (2026-03-05, Sesion 54) - Observabilidad timeout/reintentos implementada

### Completado esta sesion
- Ã¢Å“â€¦ Backend robustecido en `backend/src/routes/exercises.js`:
  - llamada al motor IA con retries y backoff (`callEngineWithRetry`).
  - retry en timeout/red y HTTP transitorios (`429/5xx`).
  - metrica `engine_observability` en respuesta de `/api/exercises/recommend`.
- Ã¢Å“â€¦ Frontend actualizado en `frontend/src/pages/index.astro`:
  - metrica nueva `Timeouts/Reintentos IA` visible en dashboard.
  - reintento automatico en timeout para recomendaciones de ejercicios.
  - reporte visual incluye intentos/reintentos y aviso de fallback activo.
- Ã¢Å“â€¦ Verificacion tecnica local:
  - `node --check` OK en rutas backend principales.

### Pendiente inmediato para cierre operativo
1. Redeploy backend/frontend en EasyPanel para publicar cambios de observabilidad.
2. Ejecutar E2E real con latencia alta del motor IA (forzar timeout controlado) y validar:
   - incremento de `Timeouts/Reintentos IA` en CRM.
   - `engine_observability` en respuesta backend.
3. Revisar si conviene ajustar entorno productivo:
   - `EXERCISE_ENGINE_TIMEOUT_MS`
   - `EXERCISE_ENGINE_MAX_ATTEMPTS`

## Estado actual (2026-03-04, Sesion 52) - Agente ejercicios estabilizado

### Completado esta sesion
- Ã¢Å“â€¦ Root cause identificado del fallo reportado en chat:
  - timeout frontend (8s) menor que latencia real del motor IA (~12s).
- Ã¢Å“â€¦ Fix aplicado en `frontend/src/pages/index.astro`:
  - `fetchJson(url, opts, timeoutMs)` configurable.
  - flujo de ejercicios con timeout `45000ms`.
  - mensajes de error diferenciados (timeout vs error HTTP).
  - eliminado falso "sin conexion" por timeout puntual del flujo de ejercicios.
- Ã¢Å“â€¦ Build local validado (`scripts/frontend-local-build.ps1` OK).

### Pendiente inmediato para manana
1. Subir cobertura de imagenes en recomendaciones (priorizar `metadata.proet_image_url` y media principal).
2. AÃƒÂ±adir metrica operacional para timeout/reintentos del agente en frontend y backend.

## Estado actual (2026-03-04, Sesion 51) - Build valido sin video, produccion aun legacy

### Completado esta sesion
- Ã¢Å“â€¦ Normalizados archivos criticos a `UTF-8 sin BOM` para evitar roturas de parseo en scripts/JSON.
- Ã¢Å“â€¦ Build frontend validado en entorno local no sincronizado (`scripts/frontend-local-build.ps1`).
- Ã¢Å“â€¦ Verificado `dist/index.html` local:
  - no contiene seccion `Videos`.
  - no contiene textos `generar video`.
- Ã¢Å“â€¦ Endpoint robustecido:
  - `POST /api/exercises/recommend` genera informe aun sin `patient_id`.
  - persistencia en DB condicionada a `patient_id` disponible.
- Ã¢Å“â€¦ Redeploy ejecutado por API EasyPanel:
  - `fisio-frontend` y `fisio-backend` en commit actualizado.
  - frontend productivo validado sin modulo `Videos`.
- Ã¢Å“â€¦ Corregido bug backend detectado tras deploy:
  - `exercises.js` usaba variable no definida en `composeClinicalReport` y devolvia `500`.
  - fix aplicado para usar `symptom_summary`.

### Pendiente inmediato para cerrar funcionamiento real
1. Endurecer calidad de recomendacion:
   - aumentar cobertura de `imagen_url` en ejercicios recomendados (faltan URLs en algunos items).
2. Mejorar observabilidad:
   - aÃƒÂ±adir metrica/alerta cuando `persistence_skipped=true` para distinguir uso sin paciente seleccionado.

## Estado actual (2026-03-04, Sesion 50) - Video eliminado y flujo centrado en informe de ejercicios

### Completado esta sesion
- Ã¢Å“â€¦ Frontend sin mÃƒÂ³dulo de video:
  - eliminadas secciÃƒÂ³n/pÃƒÂ¡gina de videos.
  - agente CRM orientado a informe clÃƒÂ­nico con procedimiento + imagen.
- Ã¢Å“â€¦ Backend adaptado:
  - `agent.js` sin copy/intents de video.
  - `exercises.js` devuelve `informe_clinico` + campos de pauta (`series/repeticiones/duracion`) + `imagen_url`.
  - `telegram.js` genera respuesta desde `/api/exercises/recommend` (sin pipeline de video).
  - endpoints `video-jobs*` bloqueados por defecto (`410`) salvo `ENABLE_VIDEO_WORKFLOWS=true`.
- Ã¢Å“â€¦ n8n limpio de video:
  - repo: eliminados `orquestador-intake-video` + `subflujo-crear-render-video` + `subflujo-revision-video`.
  - remoto: workflows de video borrados por API.
  - verificaciÃƒÂ³n remota: `0` workflows con Ã¢â‚¬Å“videoÃ¢â‚¬Â en nombre.
- Ã¢Å“â€¦ ValidaciÃƒÂ³n:
  - `node --check` backend OK.
  - JSON de workflows (`production` + `vnext`) OK.
- Ã¢Å“â€¦ Base de datos nutrida desde PROET:
  - script nuevo `scripts/proet-sync-supabase.mjs`.
  - ejecuciÃƒÂ³n real completada: `72` dolencias insertadas y `179` ejercicios `PROET-*` upsertados en `crm_ejercicios_catalogo`.
  - imÃƒÂ¡genes PROET registradas en `metadata.proet_image_url` para consumo del agente.
- Ã¢Å“â€¦ Robustez obligatoria formalizada:
  - `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`.
  - fallback operativo en `POST /api/exercises/recommend` cuando falla el motor IA externo.

### Pendiente inmediato para cerrar funcionamiento real
1. Validar build frontend en entorno con red estable (`npm install` en esta sesiÃƒÂ³n expira por timeout).
2. Configurar secreto `OPENAI_API_KEY` en Supabase Edge Function `exercise-recommend`.
3. Redeploy backend/frontend y validar E2E que Telegram + chat CRM devuelven informe con imÃƒÂ¡genes usando el catÃƒÂ¡logo PROET nutrido.

## Estado actual (2026-03-04, Sesion 49) - W2/W3 activos con bloqueos de produccion detectados

### Completado esta sesion
- Ã¢Å“â€¦ W2/W3 recreados en n8n con `POST` y activos.
- Ã¢Å“â€¦ Ajustados workflows para evitar `$env` en expresiones (bloqueadas por la instancia n8n).
- Ã¢Å“â€¦ Corregido body JSON de nodos HTTP en W2/W3 (error previo de parseo).

### Bloqueos confirmados
1. Frontend productivo sin redeploy:
   - sigue sirviendo build antiguo (aun aparece `<script lang="ts">` en HTML remoto).
2. Backend productivo sin redeploy:
   - `POST /api/exercises/recommend` devuelve `404`.
   - CORS sigue en `Access-Control-Allow-Origin: http://localhost:4321`.
3. Supabase Edge Function `exercise-recommend`:
   - error `OPENAI_API_KEY not configured`.

### Pendiente inmediato para cerrar funcionamiento real
1. Redeploy manual o por API de `fisio-frontend` y `fisio-backend` en EasyPanel.
2. Configurar secreto `OPENAI_API_KEY` en Supabase para la funciÃƒÂ³n `exercise-recommend`.
3. Mover en UI de n8n W2/W3 a carpeta/tag `Fisio_IA_Agent` y revalidar inventario.

## Estado actual (2026-03-04, Sesion 48) - Norma obligatoria n8n carpeta/tag

### Completado esta sesion
- Ã¢Å“â€¦ Norma formal y obligatoria creada:
  - `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Ã¢Å“â€¦ Enlaces aÃƒÂ±adidos en documentaciÃƒÂ³n principal:
  - `README.md`
  - `n8n/README.md`
- Ã¢Å“â€¦ Regla operativa fijada:
  - cualquier workflow creado/modificado debe quedar dentro de carpeta/tag `Fisio_IA_Agent` antes de cerrar sesiÃƒÂ³n.

### Pendiente para proxima sesion
1. Mover manualmente en UI los workflows que aparezcan fuera de carpeta cuando falle API de tags.
2. Revalidar inventario visual en n8n tras cada alta/edicion de workflow.

## Estado actual (2026-03-04, Sesion 47) - UI modo oscuro aplicada

### Completado esta sesion
- Ã¢Å“â€¦ RediseÃƒÂ±o a modo oscuro en CRM frontend:
  - `frontend/src/layouts/Layout.astro`: variables globales dark theme.
  - `frontend/src/pages/index.astro`: sidebar, topbar, cards, tablas, inputs y selectores ajustados al nuevo esquema.
- Ã¢Å“â€¦ Se mantiene compatibilidad responsive (desktop y movil) sin cambiar la estructura funcional.
- Ã¢Å“â€¦ n8n remoto:
  - creados `Fisio_IA_Agent / W2 Exercise Agent` y `Fisio_IA_Agent / W3 CRM Trigger` (inactivos).
  - eliminados duplicados temporales de W3 de pruebas API.

### Pendiente para proxima sesion
1. Redeploy de `fisio-frontend` para publicar el tema oscuro en produccion.
2. Validacion visual final en navegador (contraste, legibilidad, hover/focus states).

## Estado actual (2026-03-04, Sesion 46) - Fix frontend prod + CORS + W2/W3

### Completado esta sesion
- Ã¢Å“â€¦ Diagnostico de produccion:
  - frontend entregaba TypeScript sin transpilar en HTML (`<script lang="ts">` con tipos `as HTML...`).
  - backend devolvia CORS restringido a `http://localhost:4321`.
- Ã¢Å“â€¦ Correcciones aplicadas:
  - `frontend/src/pages/index.astro`: `<script>` procesable por Astro.
  - `backend/src/index.js`: CORS con allowlist robusta (localhost + dominio frontend prod + env `FRONTEND_URLS/FRONTEND_URL`).
- Ã¢Å“â€¦ vNext n8n completado en repo con nuevos workflows:
  - `n8n/Fisio_IA_Agent/vnext/w2-exercise-agent.json`
  - `n8n/Fisio_IA_Agent/vnext/w3-crm-trigger.json`
- Ã¢Å“â€¦ Documentacion sincronizada:
  - `README.md`
  - `n8n/README.md`
  - `CHANGELOG.md`
  - este archivo

### Pendiente para proxima sesion
1. Redeploy de `fisio-frontend` y `fisio-backend` en EasyPanel para publicar fixes de script y CORS.
2. Importar/activar en n8n remoto los workflows vNext W2/W3.
3. Ejecutar test E2E real desde CRM (boton ejercicios) y Telegram.

## Estado actual (2026-03-04, Sesion 45) - Orden n8n por entorno (production/vnext)

### Completado esta sesion
- Ã¢Å“â€¦ Sincronizacion remota de workflows activos n8n a repo:
  - `n8n/Fisio_IA_Agent/production/` con los `6` flujos activos actuales.
- Ã¢Å“â€¦ Reordenacion de flujos canonicos en desarrollo:
  - `n8n/Fisio_IA_Agent/vnext/` con `telegram-chat`, `fisio-agent-core`, `w1-appointment-agent`, `sw-fisio-pending-intakes`.
- Ã¢Å“â€¦ Verificacion tecnica:
  - `telegram-chat.json` en `vnext` mantiene `Telegram Trigger` nativo.
  - CI ajustada para validar JSON recursivo en `n8n/Fisio_IA_Agent/**`.
- Ã¢Å“â€¦ Documentacion sincronizada:
  - `CHANGELOG.md`
  - `n8n/README.md`
  - `docs/n8n/workflow_audit_20260304.md`
  - `docs/data/n8n/workflows_summary_20260304.json`

### Pendiente para proxima sesion
1. Migrar gradualmente de `production/` (video legacy) a `vnext/` (W0/W1/W2/W3) en n8n remoto.
2. Resolver error servidor n8n en `POST/PUT /api/v1/workflows*` para habilitar despliegue por API.
3. Ejecutar E2E Telegram con trigger nativo + backend y validar logs de trazabilidad (`request_id`, `channel`, `status`).

## Estado actual (2026-03-04, Sesion 44) - Plantillas + clonado implementado

### Completado esta sesion
- Ã¢Å“â€¦ Backend:
  - `GET /api/profesional/program-templates` (agregacion de plantillas desde `planes/items_plan`)
  - `POST /api/profesional/program-templates/clone` (clonado real de plan + items al paciente destino)
- Ã¢Å“â€¦ Frontend:
  - nueva secciÃƒÂ³n SPA `Plantillas`
  - selector de paciente destino
  - acciÃƒÂ³n `Clonar` conectada a backend
  - estilos responsive para controles de plantillas
- Ã¢Å“â€¦ Documentacion:
  - `README.md` con endpoints nuevos
  - `CHANGELOG.md` y este archivo actualizados

### Estado de validacion
- `node --check backend/src/routes/professional.js` OK
- `npm run build` frontend pendiente en este entorno:
  - error local: `astro` no disponible en PATH/dependencias

### Pendiente para proxima sesion
1. Ejecutar build frontend en entorno con dependencias instaladas y validar UI de Plantillas.
2. Redeploy backend en EasyPanel para publicar cambios (incluye W1 appointments y nuevas rutas de plantillas).
3. Validar E2E de clonado: plantilla -> paciente destino -> visibilidad en historial/plan.

## Estado actual (2026-03-04, Sesion 43) - Analisis completo PROET (frontend + backend)

### Completado esta sesion
- Ã¢Å“â€¦ Analisis de secciones del frontend profesional (sidebar):
  - Inici
  - Crear programa
  - Meus programes
  - Plantilles
  - Meus exercicis
  - Pacients
  - Contacte
  - Meu calendari
  - Meu perfil
- Ã¢Å“â€¦ Inventario API backend PROET por escaneo de bundles:
  - `148` endpoints unicos detectados.
  - mayor volumen en: `programs (29)`, `exercises (23)`, `authentication (11)`, `users (11)`, `clients (10)`.
- Ã¢Å“â€¦ Documentacion de analisis versionada:
  - `docs/proet/platform_analysis_20260304.md`
  - `docs/proet/sections_endpoints_20260304.json`
  - `docs/proet/api_groups_20260304.json`

### Oportunidades priorizadas para Fisio_IA_Agent (derivadas de PROET)
1. **Plantillas + clonacion** de programas terapeuticos con metrica de uso.
2. **Onboarding pacientes** por invitacion y trazabilidad de estado.
3. **Calendario terapeutico** con estados de cumplimiento.
4. **Prescripcion exportable** (PDF y envio por canal).
5. **Taxonomia avanzada de ejercicios** (zona/material/objetivo/tipo) para mejorar W2.

### Pendiente para proxima sesion
1. Implementar en Fisio_IA_Agent el bloque de mayor ROI: `Plantillas + clonacion`.
2. DiseÃƒÂ±ar el flujo `Invitacion paciente` en CRM (UI + backend + eventos).
3. Mantener pendiente infra: redeploy backend EasyPanel para publicar rutas W1 (`/api/profesional/appointments` en prod sigue `404`).

## Estado actual (2026-03-04, Sesion 42) - Ingesta PROET para W2

### Completado esta sesion
- Ã¢Å“â€¦ Nuevo script `scripts/proet-export.mjs` para extraer catalogo desde PROET.
  - Endpoints usados: auth + programas usuario + detalle programas + ejercicios por programa + templates mas usados.
  - Salida normalizada: perfil origen, templates, programas y ejercicios unicos.
- Ã¢Å“â€¦ Snapshot real generado y versionado:
  - `docs/data/proet_snapshot_20260304.json`
  - Volumen actual:
    - `20` programas de usuario
    - `59` templates top
    - `309` registros programa-ejercicio
    - `179` ejercicios unicos
- Ã¢Å“â€¦ `README.md` actualizado con comando de exportacion:
  - `node scripts/proet-export.mjs --email=<tu_email> --locale=val`

### Estado de produccion verificado
- Backend health: `200` (`/api/health`)
- Backend citas W1 en produccion: `404` (`/api/profesional/appointments`)

### Pendiente para proxima sesion
1. **EasyPanel backend**: redeploy forzado de `fisio-backend` para publicar rutas W1 de citas.
2. **W2 catalogo real**: conectar snapshot PROET con carga a `crm_ejercicios_catalogo` y `crm_ejercicio_media`.
3. **E2E**: repetir prueba Telegram + CRM tras redeploy backend y confirmar flujo cita/recomendacion.

## Estado actual (2026-03-04, Sesion 41) - W1 Telegram en progreso

### Completado esta sesion
- Ã¢Å“â€¦ `backend/src/routes/telegram.js`: W1 de citas ya no queda en mensaje placeholder.
  - Si W0 clasifica `appointment` con confianza >= 0.6, backend dispara `N8N_APPOINTMENT_WEBHOOK_URL`.
  - Se envÃƒÂ­a payload con `request_id`, `patient_id`, `professional_id`, `chat_id`, `message_text`, `timestamp`.
  - Se mantiene fallback seguro para paciente si n8n no responde.
- Ã¢Å“â€¦ Trazabilidad W1: log tÃƒÂ©cnico en `crm_comunicaciones` (si tabla disponible).
- Ã¢Å“â€¦ `backend/src/routes/exercises.js`: fix de runtime (`crypto` import).
- Ã¢Å“â€¦ `.github/workflows/ci.yml`: aÃƒÂ±adida validaciÃƒÂ³n sintÃƒÂ¡ctica para `src/routes/exercises.js`.
- Ã¢Å“â€¦ `.github/workflows/ci.yml`: aÃƒÂ±adido job `n8n_json_validate` para validar workflows JSON de `n8n/Fisio_IA_Agent/`.
  - incluye limpieza de BOM UTF-8 para evitar fallos de parseo en archivos heredados.
- Ã¢Å“â€¦ `.env.example`: aÃƒÂ±adida variable `N8N_APPOINTMENT_WEBHOOK_URL`.
  - con ejemplo local preconfigurado: `http://localhost:5678/webhook/fisio/w1/appointment`.
- Ã¢Å“â€¦ `backend/src/routes/professional.js`: API de citas W1 implementada.
  - `GET /api/profesional/appointments`
  - `POST /api/profesional/appointments`
  - `PATCH /api/profesional/appointments/:appointmentId`
  - con validaciones de estado/canal/fechas, control de conflictos y mapeo de IDs legacy -> CRM.
- Ã¢Å“â€¦ `n8n/Fisio_IA_Agent/w1-appointment-agent.json`: workflow W1 versionado para intake de citas desde Telegram.
- Ã¢Å“â€¦ `backend/src/routes/telegram.js`: comando `/cita <inicio_iso> <fin_iso> [nota]` aÃƒÂ±adido para solicitud directa de cita.
- Ã¢Å“â€¦ `frontend/src/pages/index.astro`: nueva secciÃƒÂ³n SPA `Citas` conectada a API W1 (`GET/PATCH /api/profesional/appointments`).
- Ã¢Å“â€¦ Docs actualizadas (`README.md`, `n8n/README.md`, `n8n/telegram-bot.md`) con rutas/workflow W1 y comando `/cita`.

### Pendiente para prÃƒÂ³xima sesiÃƒÂ³n
1. **Config producciÃƒÂ³n**: definir `N8N_APPOINTMENT_WEBHOOK_URL` en EasyPanel/backend.
2. **W1 n8n**: conectar credenciales Google Calendar y completar confirmaciÃƒÂ³n automÃƒÂ¡tica.
3. **E2E**: test Telegram de intenciÃƒÂ³n cita y validaciÃƒÂ³n en `crm_comunicaciones`.

## Estado actual (2026-03-04, Sesion 39) - PIVOTE CRM + AGENTES IA

### Completado esta sesion
- Ã¢Å“â€¦ 12 tablas CRM creadas en Supabase (27 total) con RLS + triggers + policies service_role
- Ã¢Å“â€¦ 16 ejercicios migrados a `crm_ejercicios_catalogo` con metadata
- Ã¢Å“â€¦ Bucket privado `ejercicios` en Storage (10MB, JPEG/PNG/GIF/WebP/MP4)
- Ã¢Å“â€¦ W2: `exercises.js` (4 endpoints) + Edge Function `exercise-recommend` (gpt-4o-mini)
- Ã¢Å“â€¦ W0: Edge Function `intent-router` + integracion Telegram auto-routing
- Ã¢Å“â€¦ W3: Boton CRM Ã°Å¸Ââ€¹Ã¯Â¸Â en frontend Ã¢â€ â€™ `/api/exercises/recommend`
- Ã¢Å“â€¦ `OPENAI_API_KEY` almacenada en Supabase Vault + funciÃƒÂ³n `vault_read_secret`
- Ã¢Å“â€¦ Fix security advisory: search_path en `crm_set_updated_at`

### Pendiente para proxima sesion
1. **W1**: Citas + Google Calendar (requiere OAuth config manual)
2. **E2E**: Prueba completa multicanal Telegram + CRM + Supabase
3. **Deploy backend**: Push codigo actualizado a EasyPanel (nuevas rutas: exercises.js, telegram.js W0)
4. **Deploy frontend**: Push index.astro con boton ejercicios (W3)
5. **Seguridad**: Rotar `OPENAI_API_KEY` (expuesta en chat) Ã¢â€ â€™ actualizar Vault
6. **RLS policies**: Granulares para auth de usuarios (actual: solo service_role)

### URLs produccion
- Backend: `https://fisio-backend.b5xbaf.easypanel.host/api/health`
- Frontend: `https://fisio-frontend.b5xbaf.easypanel.host/`
- Supabase: `https://uewhbaejcouenoufuwlq.supabase.co`
- Edge Functions:
  - `intent-router` v2 (ACTIVE)
  - `exercise-recommend` v2 (ACTIVE)

## Estado actual (2026-03-03, Sesion 33)
- Frontend redisenado con look&feel mas profesional/moderno (tipografia, paleta, jerarquia visual, microinteracciones).
- Inspiracion funcional tomada de referencia publica `fisiomap-ia`:
  - prevencion
  - continuidad asistencial
  - interoperabilidad
  - gobernanza de datos
- Prompt de Agente IA de Ejercicios ajustado con triage de 4 preguntas para Telegram.
- Nota tecnica local:
  - `npm run build` falla por `astro` no disponible en PATH del host local actual.
  - Requiere revisar entorno de build/dependencias antes de validar compilacion local.

## Estado actual (2026-03-04, Sesion 34)
- Hardening aplicado para despliegue frontend:
  - `index.astro` usa `<script lang="ts">` (coherencia con tipado usado en el script cliente).
  - `package.json` frontend: `build` pasa a `astro build` y `astro check` queda como script separado.
- Se lanzan redeploys por endpoint API de EasyPanel para recuperar `fisio-frontend`.

## Estado actual (2026-03-04, Sesion 35)
- Validacion local fuerte del frontend completada:
  - `scripts/frontend-local-build.ps1` -> build correcto en copia limpia (`astro build` OK).
- Infraestructura remota:
  - `fisio-backend` sigue en `200`.
  - `fisio-frontend` sigue en `502` despues de redeploys por API.
- Diagnostico:
  - El bloqueo actual es de servicio EasyPanel (runtime/config/task), no de compilacion frontend.
- Necesidad para cierre definitivo:
  - acceso a logs/error de servicio en EasyPanel (UI o API autenticada) para aplicar fix exacto y dejar `200`.

## Estado actual (2026-03-04, Sesion 36)
- API token de EasyPanel validado y operativo para TRPC.
- `inspectProject` confirma:
  - backend OK
  - frontend en despliegue correcto pero sin tarea viva (`actual=0`, `desired=1`).
- Mitigacion aplicada en codigo:
  - eliminado `HEALTHCHECK` del contenedor frontend para evitar posibles reinicios por chequeo runtime.

## Estado actual (2026-03-04, Sesion 37) - CIERRE OPERATIVO OK
- Frontend recuperado y estable en EasyPanel:
  - `https://fisio-frontend.b5xbaf.easypanel.host/health` -> 200
  - `https://fisio-frontend.b5xbaf.easypanel.host/` -> 200
- Backend sigue correcto:
  - `https://fisio-backend.b5xbaf.easypanel.host/api/health` -> 200
- Monitor infraestructura:
  - `fisio-ia-agent_fisio-frontend` -> `actual=1`, `desired=1`
- Causa probable confirmada por mitigacion efectiva:
  - inestabilidad runtime asociada al `HEALTHCHECK` previo del contenedor frontend.

## Estado actual (2026-03-03, Sesion 25)
- Migracion SQL productiva aplicada y validada en Supabase.
- Workflows Fisio activos y alineados en n8n.
- Backend productivo desplegado en EasyPanel:
  - Servicio: `fisio-backend` (proyecto `n8n`)
  - URL: `https://fisio-backend.b5xbaf.easypanel.host`
  - Health: `GET /api/health` -> 200
- Backend productivo ampliado con rutas:
  - `/api/profesional/*`
  - `/api/telegram/*`
  - `/api/agent/message`
- Validaciones realizadas:
  - Telegram incoming (custom payload) -> OK + ingesta creada
  - Agent message -> OK (`source: n8n_agent`)
  - Ciclo video crear/review -> OK, estado final `enviado`
- Validacion adicional (2026-03-02):
  - `POST /api/agent/message` en produccion devuelve `data` vacio cuando n8n responde body vacio.
  - Se implemento fallback en backend (`fallback_used`) para no devolver respuesta funcional vacia al cliente.
  - Se detecto tambien error `fetch failed` cuando el webhook n8n no responde.
  - Se amplio fallback con control de disponibilidad n8n: `n8n_unreachable` + `fallback_reason`.
  - Cobertura adicional: si n8n responde `4xx/5xx`, backend tambien devuelve fallback con `fallback_reason = n8n_http_error` y `n8n_status`.
  - Correccion de plataforma aplicada:
    - `fisio-backend` migrado a fuente Git (`main`, `/backend`) en EasyPanel.
    - Build actualizado a `nixpacks`.
    - Redeploy forzado ejecutado por API.
  - Integracion agente validada en produccion:
    - `/api/agent/message` devuelve respuesta funcional con `fallback_used = false`.

## Workflows Fisio (estado)
- `Fisio_IA_Agent / Nucleo Agente` -> ACTIVO (`ZOarR2hpUUOgm3KC`)
- `Fisio_IA_Agent / Orquestador Intake-Video` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Pendientes` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Crear y Render Video` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Revision Video` -> ACTIVO
- `Fisio_IA_Agent / Puente Error Backend` -> ACTIVO

## Supabase (estado)
Tablas necesarias confirmadas:
- `profesionales`
- `pacientes`
- `dolencias`
- `ejercicios`
- `planes`
- `items_plan`
- `sesiones`
- `vinculos_telegram_pacientes`
- `mensajes_ingesta_paciente`
- `notas_seguimiento_paciente`
- `trabajos_video_ejercicio`
- `eventos_visualizacion_video`

## Pendiente inmediato (actual)
1. Ejecutar E2E Telegram completo con comandos reales:
- `/start CODIGO`
- `/plan`
- `/dolor <0-10> [nota]`
2. Rotar credenciales usadas/compartidas en sesiones tecnicas:
- API key n8n
- token EasyPanel
- secretos sensibles de entorno

## Riesgos abiertos
- Riesgo operativo reducido: backend y Nucleo Agente ya estan alineados en produccion.
- Si no se rotan credenciales, hay riesgo de seguridad.

## Como retomar rapido
1. Verificar backend `fisio-backend` en EasyPanel y health (`/api/health`).
2. Probar agente web y confirmar `data.reply_text` no vacio.
3. Revisar flags de diagnostico:
- `fallback_used`
- `n8n_unreachable`
- `fallback_reason`
4. Confirmar estado esperado:
- `fallback_used = false`
- `n8n_unreachable = false`
5. Ejecutar prueba real Telegram y revisar escritura en `mensajes_ingesta_paciente`.
6. Mantener prueba de regresion de video (`crear` + `review`).

## Repositorio GitHub (2026-02-27)
- URL: `https://github.com/raulruizproyectos/Fisio_IA_Agent`
- Rama principal: `main`
- CI base: configurada en `.github/workflows/ci.yml`
- Plantillas y gobernanza: ISSUE/PR templates, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`

## Punto de SituaciÃƒÂ³n (Checkpoint - Fin SesiÃƒÂ³n 40)

### Ã¢Å“â€¦ Lo que ya estÃƒÂ¡ funcionando / Terminado
1. **Frontend Responsive**: Interfaz adaptada a mÃƒÂ³vil/tablet/desktop con sidebar colapsable, mÃƒÂ©tricas en grid fluido y diseÃƒÂ±o mobile-first.
2. **Seguridad (RLS)**: Bases de datos protegidas. Las 27 tablas en Supabase tienen polÃƒÂ­ticas RLS granulares habilitadas. Service Role backend intacto. Advisor de seguridad en 0 alertas.
3. **Backend APIs y Subflujos n8n**: Backend en EasyPanel (`fisio-backend`) respondiendo a n8n. Flujo de video E2E probado vÃƒÂ­a API interna.
4. **Reglas de Agente**: AÃƒÂ±adidas reglas estrictas sobre el Frontend Responsive obligatorio y la ReutilizaciÃƒÂ³n de Workflows en n8n.

### Ã¢ÂÂ³ Lo que falta hacer (Siguiente sesiÃƒÂ³n)

#### Bloque 1: Despliegues y Validaciones Inmediatas
- [ ] **[MANUAL] Redeploy en EasyPanel**: Entrar al panel y hacer deploy de `fisio-frontend` y `fisio-backend` para que los cambios responsive y de cÃƒÂ³digo subido a GitHub se reflejen en la URL pÃƒÂºblica.
- [ ] **Test E2E Completo Multicanal**: Probar flujo desde mensaje de Telegram -> webhook backend -> n8n -> Supabase -> Respuesta en CRM Frontend.

#### Bloque 2: Nuevas Funcionalidades (Roadmap original)
- [ ] **W1: Citas y Calendario (Google Calendar)**: ConfiguraciÃƒÂ³n manual OAuth requerida para conectar el agente con la creaciÃƒÂ³n de citas reales.
- [ ] **W3: BotÃƒÂ³n Trigger CRM**: AÃƒÂ±adir en el frontend el botÃƒÂ³n para disparar recomendaciones de ejercicios manualmente desde la interfaz web.

#### Bloque 3: AuditorÃƒÂ­a Final y Seguridad
- [ ] Rotar `OPENAI_API_KEY` (actualmente en cÃƒÂ³digo/clear text en algunos puntos histÃƒÂ³ricos).
- [ ] Pruebas exhaustivas de concurrencia.

## Nota de terminologia
- Se reemplazo la expresion `expresion anterior (deprecated)` por `centraliza la introduccion de sintomas` en la descripcion principal del proyecto.


## Cierre de verificacion global (2026-02-27)
- GitHub sincronizado y operativo: `main` al dia.
- n8n/EasyPanel/backend verificados y en estado funcional.
- Webhook Telegram en produccion confirmado.
- Nota tecnica: build frontend pendiente de validar en entorno con `astro` disponible.

## Arranque recomendado para la proxima sesion
1. Ejecutar E2E Telegram de extremo a extremo y revisar resultado clinico en ingestas.
2. Ajustar contenido de respuesta del agente n8n en `/api/agent/message`.
3. Activar branch protection en GitHub.
4. Rotar credenciales sensibles.
5. Iniciar rediseno frontend con `Google Stitch` y trasladar propuesta a Astro.

## Bloqueo local detectado (frontend)
- `npm install` en `frontend/` queda colgado en este host y rompe instalacion de `astro` (`invalid`).
- El resto de plataformas productivas (n8n, EasyPanel, backend, Telegram, GitHub) queda operativo.

### Paso 1 al retomar
- Liberar proceso npm colgado (o reiniciar equipo) y repetir instalacion limpia de frontend.

## Actualizacion de cierre (2026-03-02)
- Se reintento la recuperacion local de frontend y el bloqueo persiste:
  - `npm ping` OK
  - procesos `npm install` colgados detectados y finalizados
  - nuevas instalaciones vuelven a colgarse en este host
- Decision UX/UI ya registrada:
  - usar `Google Stitch` para ideacion/prototipo frontend
- Decision adicional para video IA:
  - plataforma candidata `Google Labs Flow` (usuario Pro Gemini)
  - URL: `https://labs.google/fx/es/tools/flow`
- Decision de IA conversacional en n8n:
  - implementar normalmente con nodo `OpenAI` (o agente con modelo OpenAI)
## Punto de situacion actualizado (2026-03-09, cierre estable)
- Alcance activo confirmado:
  - CRM web,
  - agente de citas,
  - agente de ejercicios,
  - video fuera del flujo activo.
- Estado tecnico confirmado:
  - W2 asincrono implementado en backend y frontend,
  - tabla objetivo `crm_async_jobs` anadida a `database/schema_vnext.sql`,
  - frontend validado con `astro build` y `astro check` en copia local no sincronizada,
  - backend validado con `npm run lint` y `node --check` en copia local no sincronizada,
  - script `scripts/backend-local-validate.ps1` anadido para repetir esa validacion.
- Riesgo residual acotado:
  - la ruta sincronizada `G:\Mi unidad\...` puede dejar `node_modules` incompletos;
  - la validacion fiable debe ejecutarse en `C:\Temp` hasta resolver ese host.
- Siguiente bloque exacto antes de seguir desarrollando:
  1. aplicar migracion `database/migrations/2026-03-09_crm_async_jobs.sql` en Supabase,
  2. redeploy backend/frontend,
  3. prueba E2E manual del rail CRM con plan, polling y PDF,
  4. confirmar persistencia del job tras reinicio.

## Punto de situacion para continuar rapido
1. Ejecutar `frontend/npm install` en entorno alternativo y validar `npm run build`.
2. Si falla otra vez, capturar log con `--verbose` y revisar ultimo paquete antes del cuelgue.
3. Empezar rediseno de `frontend/src/pages/index.astro` con base Stitch.
4. Preparar evaluacion de integracion de Flow para generacion de video en pipeline n8n/backend.

## Punto de situacion actualizado (2026-03-02, cierre rapido)
- Diagnostico confirmado:
  - `npm install` se bloquea en la ruta sincronizada del proyecto (`G:\Mi unidad\...`).
  - El mismo install en `C:\Temp` completa correctamente.
- Frontend:
  - aplicado fix TypeScript en `frontend/src/pages/index.astro` para errores de null/typing en script cliente.
- Validacion tecnica:
  - en `C:\Temp\Fisio_IA_Agent_frontend_local`, `npm run build` -> OK
  - `astro check` sin errores (0)
- Decision operativa temporal:
  - ejecutar install/build del frontend en ruta local no sincronizada hasta cerrar bloqueo del host actual.

## Siguiente sesion (pasos exactos)
1. Copiar `frontend/` a `C:\Temp\Fisio_IA_Agent_frontend_local`.
2. Ejecutar:
   - `npm install --no-audit --no-fund`
   - `npm run build`
3. Si build OK, continuar el rediseno con Google Stitch y aplicar cambios en repo principal.

## Cierre de hoy (2026-03-02)
- Estado frontend:
  - bloqueo de `npm install` persiste solo en ruta sincronizada (`G:\Mi unidad\...`).
  - solucion operativa validada en esta sesion: build por ruta local no sincronizada.
- Script disponible y probado:
  - `scripts/frontend-local-build.ps1`
  - comando: `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1`
  - resultado validado: `astro check` OK + `astro build` OK.
- Ajuste de limpieza:
  - `.gitignore` incluye `frontend/node_modules_stuck*/`.
- Regla aplicada a partir de ahora:
  - usar skills disponibles en `.agents` cuando aplique, con constancia breve en seguimiento.

## Arranque minimo recomendado (siguiente sesion)
1. **[Infra Manual]**: Crear App `fisio-frontend` en EasyPanel desde GitHub repo, usando `Dockerfile` y path `/frontend`.
2. **[Infra Manual]**: Asegurar branch protection de `main` en configuraciÃƒÂ³n web de GitHub.
3. Ejecutar testing funcional manual en Telegram (`/start`, `/plan`, `/dolor`) desde un mÃƒÂ³vil real.
4. Validar llegada a base de datos en Supabase.
5. Continuar desarrollo de lÃƒÂ³gicas del Agente IA y vÃƒÂ­deos de seguimiento.

## Decision UX/UI registrada (2026-03-03)
- Frontend rediseÃƒÂ±ado completamente en sesion 24.
- Dashboard profesional dark mode con sidebar, metricas, tabla de intakes, chat del agente IA.
- Proyecto Stitch de referencia: ID 8185935624241829024.
- Paleta: #0f1419 / #1a2332 / #0d9488 (teal).
- Tipografia: Inter + Material Symbols Rounded.

## Docker frontend hardening (2026-03-03, Sesion 25)
- `Dockerfile`: HEALTHCHECK con `wget` contra `/health` cada 30s.
- `nginx.conf`: bloque `location /health` retorna 200 sin access_log.
- Build local validado: 0 errores, 0 warnings.

## Guia despliegue frontend (EasyPanel)
1. EasyPanel Ã¢â€ â€™ Proyecto `n8n` Ã¢â€ â€™ **+ Create Service** Ã¢â€ â€™ **App**.
2. Nombre: `fisio-frontend`.
3. Source: GitHub Ã¢â€ â€™ `https://github.com/raulruizproyectos/Fisio_IA_Agent.git` Ã¢â€ â€™ `main` Ã¢â€ â€™ Root: `/frontend`.
4. Build: Dockerfile.
5. Domains: asignar dominio (ej. `fisio-frontend.b5xbaf.easypanel.host`).
6. Puerto: `80`.
7. Deploy.

## Arranque minimo (siguiente paso)
1. Push a GitHub y crear App en EasyPanel (7 pasos arriba).
2. Verificar `https://fisio-frontend.b5xbaf.easypanel.host/health` Ã¢â€ â€™ 200.
3. Probar dashboard y chat agente IA desde el frontend desplegado.
4. Ejecutar E2E Telegram (`/start`, `/plan`, `/dolor`).
5. Configurar branch protection en `main`.
6. Rotar credenciales sensibles.

## Actualizacion (2026-03-03, Sesion 27)
- Pendiente de sesion 26 "Frontend Backend Hooks" completado en codigo:
  - Backend:
    - Nuevo endpoint `GET /api/profesional/video-jobs` en `backend/src/routes/professional.js`.
  - Frontend:
    - `frontend/src/pages/index.astro` ya no usa `alert()` para acciones principales.
    - Botones activos:
      - Dashboard/Intakes: `Revisar` -> abre Historial del paciente.
      - Pacientes: `Ver` -> abre Historial del paciente.
      - Videos: `Historial` -> abre Historial del paciente.
    - SecciÃƒÂ³n Videos conectada a datos reales de backend.
    - SecciÃƒÂ³n Historial conectada a:
      - `GET /api/pacientes/:id`
      - `GET /api/profesional/patients/:patientId/history`

## Pendiente inmediato actualizado
1. **[Manual EasyPanel]** crear/desplegar `fisio-frontend` desde `/frontend` y validar `/health`.
2. **[Manual E2E Telegram]** ejecutar flujo real `/start`, `/plan`, `/dolor`.
3. **[Manual GitHub]** activar branch protection en `main`.
4. **[Seguridad]** rotar credenciales sensibles (n8n, EasyPanel, secretos entorno).

## Actualizacion (2026-03-03, Sesion 28)
- Infraestructura reorganizada en EasyPanel:
  - Proyecto `openclaw` eliminado.
  - Proyecto nuevo `fisio-ia-agent` creado.
  - Servicios movidos de `n8n` -> `fisio-ia-agent`:
    - `fisio-backend`
    - `fisio-frontend`
- Backend confirmado operativo:
  - `https://fisio-backend.b5xbaf.easypanel.host/api/health` -> 200.
- Frontend:
  - Dominio corregido a `fisio-frontend.b5xbaf.easypanel.host`.
  - Build configurado en EasyPanel como `dockerfile` (`file: Dockerfile`).
  - Deploy actualizado al commit `c3a8aae`.
  - Estado actual: sigue en `502`.
  - SeÃƒÂ±ales tÃƒÂ©cnicas:
    - `monitor.getDockerTaskStats`: `fisio-ia-agent_fisio-frontend` -> `actual=0`, `desired=1`.
    - `projects.getDockerContainers`: sin contenedor corriendo para frontend.
    - `services.common.getServiceError`: `null` (sin detalle).

## Pendiente inmediato (nuevo)
1. **[Manual EasyPanel UI]** abrir logs/historial de deploy de `fisio-frontend` para capturar causa exacta del task fail.
2. **[Manual Host/Docker Swarm]** revisar reason del servicio `fisio-ia-agent_fisio-frontend` (si hay acceso a consola del nodo).
3. **Aplicar fix de runtime/build** segÃƒÂºn log y redeploy.
4. Confirmar estado final:
   - `https://fisio-frontend.b5xbaf.easypanel.host/` -> 200
   - `monitor.getDockerTaskStats` frontend -> `actual=1`, `desired=1`.
5. Mantener pendientes ya abiertos:
   - E2E Telegram real.
   - branch protection en `main`.
   - rotaciÃƒÂ³n de credenciales.

## Corte tecnico actualizado (2026-03-03, antes de nueva arquitectura)
- Infra:
  - Proyecto de trabajo consolidado: `fisio-ia-agent`.
  - `openclaw` eliminado.
  - `fisio-backend` y `fisio-frontend` ya migrados al nuevo proyecto.
- Estado operativo:
  - Backend: OK (200 en `/api/health`).
  - Frontend: KO (502 en dominio principal).
- Repositorio:
  - `main` sincronizada con commits de fix y documentaciÃƒÂ³n.
  - ÃƒÅ¡ltimos commits clave:
    - `cd47cba` (documentaciÃƒÂ³n de migraciÃƒÂ³n y estado actual)
    - `c3a8aae` (fix Dockerfile frontend sin lockfile obligatorio)
- Bloqueo activo para retomar:
  - frontend no llega a levantar task/contendor en runtime de EasyPanel.

## Prioridad de arranque tras nuevo prompt
1. Revisar y decidir nueva arquitectura objetivo (componentes, contratos y despliegue).
2. Definir plan de migraciÃƒÂ³n por fases sin romper backend actual operativo.
3. Replantear frontend dentro de la nueva arquitectura y resolver bloqueo 502 durante la transiciÃƒÂ³n.

## Actualizacion (2026-03-03, Sesion 30)
- Limpieza aplicada para nueva arquitectura:
  - removidos workflows legacy de video del repo.
  - removido archivo temporal `create.lazy.tmp.js`.
  - removida carpeta residual `frontend/node_modules_stuck_20260302_202222`.
- Estado operativo:
  - backend sigue estable.
  - foco de desarrollo pasa a CRM + citas + ejercicios.
- Artefactos clave nuevos:
  - `ARCHITECTURE.md`
  - `.agents/AGENT_RULES.md`
  - `.agents/skills/*`
  - `database/schema_vnext.sql`

## Proximo paso recomendado inmediato
1. Definir contratos JSON finales W0/W1/W2/W3 en n8n.
2. Crear bucket privado `ejercicios` (si no existe) y validar object_keys.
3. Cablear trigger web CRM para recomendaciones de ejercicios.
4. Implementar logging completo por `request_id` en DB.

## Cierre diario definitivo (2026-03-03)
### Estado operativo real al cierre
- Backend: OK (`200`).
- Frontend: KO (`502`) en dominio productivo.
- Arquitectura objetivo ya fijada y documentada (CRM + Citas + Ejercicios).

### Lo que SI esta listo
- Repositorio limpio para nueva etapa.
- Reglas y skills de agente creadas en `.agents/`.
- Prompt maestro de ejercicios listo para nodo OpenAI n8n.
- Propuesta SQL aditiva disponible en `database/schema_vnext.sql`.

### Lo que queda para primera hora de manana
1. EasyPanel: extraer causa exacta de `fisio-frontend` (task fail) y dejarlo en 200.
2. Supabase Storage: validar bucket `ejercicios` en privado.
3. n8n: definir contratos y montar W0/W1/W2/W3.
4. CRM trigger: conectar boton de ejercicios a W3.
5. Logging: asegurar trazabilidad por `request_id` y `patient_id`.

### Regla de continuidad
- Cualquier avance de manana debe registrarse primero en `CHANGELOG.md` y luego en este archivo.

## Ajuste ultimo minuto (Sesion 32)
- Prompt del Agente IA de Ejercicios ya adaptado a canal Telegram (igual que agente de citas en n8n).
- Mantiene estrategia de imagenes desde Supabase Storage por `object_key` + signed URL JIT en n8n.
- Modo actual: 1 ejercicio maximo por respuesta.

## Actualizacion (2026-03-04, Sesion 33)
- Limpieza local aplicada para evitar duplicados/basura:
  - eliminada carpeta vacia `n8n/workflows/`.
  - eliminado duplicado legacy `docs/architecture.md`.
- Canonico del proyecto:
  - Arquitectura: `ARCHITECTURE.md`.
  - Workflows versionados: `n8n/Fisio_IA_Agent/*.json`.

## Pendiente inmediato (orden en instancia n8n)
1. Listar workflows en n8n remoto y detectar duplicados por nombre + contenido.
2. Renombrar con convenciÃƒÂ³n W0/W1/W2/W3 donde aplique.
3. Mover/etiquetar todos los workflows del proyecto bajo carpeta/tag `Fisio_IA_Agent`.
4. Desactivar/eliminar duplicados remotos no canonicos tras backup JSON.
5. Exportar snapshot final de n8n y versionarlo en `n8n/Fisio_IA_Agent/`.

## Actualizacion (2026-03-04, Sesion 34)
- Auditoria remota ejecutada sobre todos los workflows de n8n.
- Snapshot y resumen guardados en:
  - `docs/data/n8n/workflows_snapshot_20260304_raw.json` (local, no versionado)
  - `docs/data/n8n/workflows_summary_20260304.json`
- Limpieza aplicada en instancia:
  - desactivados 8 workflows activos fuera de `Fisio_IA_Agent / ...`.
  - eliminado 1 duplicado exacto de `Fisio_IA_Agent / Nucleo Agente`.
- Estado remoto tras consolidacion:
  - total workflows: 52
  - activos: 6
  - activos dentro de `Fisio_IA_Agent / ...`: 6 (100%)
- Backups de seguridad de flujos desactivados:
  - `docs/data/n8n/backup_before_deactivate_20260304/` (local, no versionado)

## Pendiente inmediato actualizado
1. Revisar manualmente en UI n8n los 8 flujos desactivados y decidir si alguno debe migrarse a version canonica W0/W1/W2/W3.
2. Resolver con logs de servidor n8n el error `500` en API para `create/update/tags` (ahora solo operan activate/deactivate/delete).
3. Versionar workflows canonicos vNext (W0/W1/W2/W3) dentro de `n8n/Fisio_IA_Agent/` con control de errores estandar.
4. Re-activar solo workflows vNext despues de validacion E2E Telegram + backend.

## Verificacion final (2026-03-04, Sesion 35)
- Comprobacion post-orden manual en n8n completada:
  - `total=52`, `active=6`, `active_outside_fisio=0`.
  - sin colisiones de `webhook path` entre activos.
  - `POST /webhook/agent/core` probado en vivo con `200`.

## Siguiente bloque de desarrollo (inmediato)
1. Implementar version canonica robusta de W1 (citas) reutilizando patrones de `Sub_Agente_Citas` + `create_booking` + `search_booking`.
2. Implementar control de errores transversal (retry/backoff + notificacion) en W0/W1/W2/W3.
3. Conectar y validar trazabilidad de `request_id` end-to-end (Telegram -> n8n -> backend -> DB).

## Actualizacion (2026-03-04, Sesion 36)
- Hardening aplicado a workflow versionado W1:
  - `n8n/Fisio_IA_Agent/w1-appointment-agent.json`
- Mejoras principales:
  - parseo/validacion robusta de slots (`slot_start`, `slot_end`, ventana valida).
  - request backend con `channel` dinamico + `timeout` 15000ms.
  - control de errores backend con salida estructurada (`status`, `backend_error`).
  - mensajes de respuesta normalizados sin caracteres corruptos.

## Pendiente inmediato actualizado
1. Publicar en instancia n8n la version endurecida de `W1` (siempre desde JSON canonico del repo).
2. Ejecutar prueba E2E de cita:
   - payload valido -> `status=confirmed`.
   - payload incompleto -> `status=needs_slot_data`.
   - error backend simulado -> `status=error`.
3. Avanzar hardening equivalente en W0/W2/W3 con mismo patron de observabilidad y manejo de fallos.

## Actualizacion (2026-03-04, Sesion 37)
- Hardening aplicado en repo:
  - `n8n/Fisio_IA_Agent/telegram-chat.json` (W0 entrada Telegram robusta).
  - `n8n/Fisio_IA_Agent/fisio-agent-core.json` (router core con rutas estructuradas y `request_id`).
- Nota de operacion n8n:
  - En UI de carpeta/tag `Fisio_IA_Agent` siguen visibles 5 porque `Nucleo Agente` esta activo pero sin tag.
  - La API `PUT /workflows/{id}/tags` devuelve `500`, por eso el ajuste de tag debe hacerse manual en UI.

## Pendiente inmediato (operativo)
1. En UI n8n: anadir tag `Fisio_IA_Agent` a `Fisio_IA_Agent / Nucleo Agente` para que aparezcan 6/6 en carpeta.
2. Importar/publicar desde repo los workflows endurecidos (`telegram-chat` y `fisio-agent-core`).
3. Validar E2E W0->backend->reply y en paralelo preparar hardening W2/W3.
## Actualizacion (2026-03-17, Cierre de sesion frontend/copilot)
- GitHub queda sincronizado en `origin/main` hasta el commit `7b9bf04`.
- El frontend publicado ya refleja el cockpit nuevo; el ultimo ajuste del rail del agente queda listo para verse tras redeploy de `fisio-frontend`.
- Validacion cerrada fuera de Google Drive:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1` -> OK
  - `npm run check` en `C:\Temp\Fisio_IA_Agent_frontend_local` -> `0 errors`, `0 warnings`, `11 hints`
- Repo y n8n quedan mejor alineados:
  - versionado `n8n/Fisio_IA_Agent/vnext/w5-calendar-reader.json`
  - documentado drift en `docs/n8n/live_vs_repo_sync_20260317.md`

## Pendiente inmediato actualizado (2026-03-17)
1. Redeploy de `fisio-frontend` para publicar el ajuste final del rail del agente.
2. Validar visualmente en la URL publica:
   - contraste del titulo del copilot,
   - badge `Conectado`,
   - composer mas compacto,
   - rail usable en portatil.
3. Si el rail queda bien en produccion, retomar desarrollo funcional en este orden:
   - agente de ejercicios,
   - agenda online,
   - intake/paciente y automatizacion administrativa.