# Punto de continuidad — 8 de octubre de 2026

## Prioridad vigente: GitHub y testing en producción

El usuario acepta por ahora Precisión azul y pide continuar hasta probar en producción, corregir los fallos de testing y actualizar GitHub. Acepta publicar la rama actual `mejoras/auditoria-20260915` y abrir PR hacia `main`; no autoriza por ello fusionar, aplicar SQL ni desplegar. Consultar `docs/PRODUCTION_TESTING.md`: EasyPanel funciona por API HTTPS con el token local existente, servicios y dominios comprobados; Supabase necesita copia nueva verificable y cinco migraciones. Falta la URI PostgreSQL en `.env.local`; no repetir la exportación antigua que excluye Auth. Backend lint/100 pruebas, frontend check/build y regresiones CSP/runtime pasan. Mantener secretos, copias y diagnósticos privados fuera de Git. Los bloques siguientes son históricos.

## Revisión visual local posterior al cierre de las 16:08

- Próxima tarea: aceptación visual del usuario y ajustes concretos que indique sobre Precisión azul. La revisión solicitada está terminada; no reiniciar diseño, auditoría técnica ni Calendar/seguridad.
- Examinadas las 39 capturas. Ajustados saludo sin correo largo, acciones de Pacientes en móvil, icono de búsqueda separado, descripciones de métricas completas y listas/tablas sin duplicados en facturas/bonos/documentos/gestoría. Los estados vacíos, carga y errores mantienen su aviso; contratos DOM y reglas clínicas conservados.
- Frontend check (39 archivos, cero diagnósticos)/build y pruebas de saludo/CSP pasan. Chrome: 45 estados a 375/768/1280, sin overflow, errores JS ni tráfico externo; 24 casos adicionales cubren registros ficticios y fallos de lectura en los cuatro módulos con presentación adaptable. No se repitieron suites backend ni flujos de Calendar/Auth.
- Evidencia: `docs/design-exploration/reviews/2026-10-08/README.md`, `verification.json` y capturas ficticias. Galería de 39 capturas actualizada en las 14 vistas afectadas; originales preservados en `reviews/2026-10-08/before/`. Galería estática local disponible en 127.0.0.1:4323; API/build de ensayo detenidos al terminar. Las demás capturas corresponden al bloque anterior.
- Un ensayo inicial quedó esperando una animación infinita del fixture; se corrigió el helper de QA para esperar solo animaciones finitas. El producto no cambió por ello. Build mantiene aviso de Astro sobre Shiki/CSP; comprobación de los cuatro HTML compilados pasa.
- Solo local, sin SQL Cloud, despliegue, mensajes, credenciales, commits ni push. Proveedores reales, proxy/HTTPS, móvil físico y auditoría WCAG integral siguen sin acreditar. Todos los cambios previos conservados; EasyPanel aparcado.

## Cierre de sesión — 16:08 Europe/Madrid

- Abrir un chat nuevo para continuar: esta conversación acumula mucho contexto. Modelo recomendado por el usuario: **GPT-6.1-sol con razonamiento alto**. Copiar `docs/PROMPT_CONTINUAR.txt` y usar este documento actualizado; el correo de las 09:40 contenía un punto anterior ya superado.
- Punto exacto: Precisión azul elegida y aplicada, con verificaciones locales terminadas. Próxima tarea: revisar visualmente el acabado web/móvil existente y ajustar detalles concretos sobre esta base; aprovechar las 39 capturas ficticias. No reiniciar la auditoría técnica ni repetir Calendar/seguridad completados. Aceptación visual final del usuario pendiente.
- Sesión de trabajo detenida: vista previa estática 48042 cerrada; fixtures/API/SQL de ensayo detenidos. Sin listeners en 4323, 4322, 3002 ni 54339 al comprobar el cierre. No se han cerrado sesiones reales ni tocado servicios del usuario. Para reabrir solo la galería: `node tmp/serve-design-exploration.mjs` desde la raíz y abrir `http://127.0.0.1:4323/precision-blue.html`.
- Árbol modificado/no rastreado conservado íntegramente, sin commit ni push. `CONTINUAR.md` y `PROMPT_CONTINUAR.txt` también están sin rastrear: no usar un clon limpio ni restaurar el árbol. La galería es estática; los ensayos no acreditan módulos con datos reales, Google/Auth/PostgREST, proxy/HTTPS ni móvil físico.
- Este cierre actualiza documentación y prepara el correo autorizado al usuario, con el prompt y este archivo adjuntos. No añade cambios funcionales ni repite suites ya pasadas. Pendientes externos y clínicos descritos abajo siguen pendientes; EasyPanel aparcado, migraciones preparadas solo en local.

## Último bloque: Precisión azul elegida y aplicada

- Galería conservada: `docs/design-exploration/precision-blue.html`, 39 capturas ficticias; servidor estático local detenido al cerrar la sesión. API/datos del ensayo detenidos. API/POST/traversal rechazados en la verificación previa. No contiene una sesión funcional del CRM ni datos privados.
- Última QA adicional: notas a 16 px/guardar accesible, Nueva cita completa en móvil y desktop, PDF bloqueado, Telegram sin vínculo ofrece vinculación. Ensayo completo Auth/PKCE/cierre, Calendar vacío→evidencia→recarga y reserva/recarga bajo CSP pasa. Fixture reiniciado tras alcanzar rate limit; límites de seguridad no modificados. Recibos/capturas privados en `local-validation/blue` y `csp`.

- Usuario eligió la dirección 01, Precisión azul. Shell blanco/azul, tokens v6, agenda/ficha/biblioteca/finanzas/documentos/mensajes/historial/ajustes y acceso/reserva coherentes. Animación discreta 120/220/240 ms y movimiento reducido. Reconciliados DESIGN/AGENTS; historial visual conservado.
- Menú completo web/móvil, ruta superior actual, overlays fuera del flujo, formularios de alta con foco/Escape, notas a 16 px y controles de 44 px. Sin cambios a permisos, Auth, reserva, revisión profesional ni mutaciones Calendar. Todos los contratos DOM estáticos preservados.
- Chrome: 46 estados en 375/768/1280 sin overflow/errores JS/red externa; clínica ficticia y SQL local para pacientes/citas, dobles vacíos explícitos en otros módulos. Frontend check/build, regresiones de reserva/Calendar/Auth/contexto clínico/feedback/diálogos pasan; backend lint y 100 pruebas pasan. Capturas y recibos privados de QA, sin publicar datos privados.
- Siguiente paso: revisión visual del acabado elegido y, si hay ajustes concretos, iterar sobre esta base. No repetir Calendar/seguridad ni comenzar de cero. Pendientes de producción del bloque HttpOnly siguen abiertos: proveedores reales, proxy/HTTPS, Auth y límites monetarios. EasyPanel aparcado; sin SQL Cloud, mensajes reales, dependencias nuevas, commits, push ni despliegue.

Actualizado tras completar Calendar y continuar seguridad local con errores públicos, permisos de trabajos IA, CSP y sesión HttpOnly. El código y las migraciones siguen en el árbol local, con muchos cambios modificados/no rastreados, sin commit ni push. Continuar aquí, no desde un clon limpio de GitHub. Los bloques históricos siguientes conservan el contexto de partida.

## Bloque anterior: sesión HttpOnly local terminada

- Nuevos `backend/src/lib/browser-session.js`, `backend/src/routes/auth.js` y `backend/test/browser-session.test.js`. Auth antes del middleware central, con rutas POST exactas y controles propios: login/session/logout/reset-request/recovery/password. Auth y perfil/clínica comprobados desde servidor, cliente usuario con RLS; sin fallback privilegiado. Bearer interno existente conservado.
- Cookies de acceso/renovación/verifier HttpOnly, host-only, SameSite=Lax; Secure y __Host- obligatorios en producción. API con cookies exige CSRF/origen válido, incluso lecturas; excepción de Origin ausente solo para GET/HEAD same-origin con Sec-Fetch-Site y cabecera propia. No-cache para Auth/respuestas profesionales. Timeout/error/incompletitud no elimina una sesión válida ni inicia otra mutación incierta. Renovación concurrente compartida en una instancia; frontend no reenvía escrituras clínicas.
- Frontend Auth ya no almacena JWT/refresh ni usa Supabase SDK. Limpieza solo de las claves locales Auth del proyecto configurado; requiere nuevo login. Runtime no publica ninguna clave anon/publishable (guardas de configuración antigua preservadas). Recuperación PKCE usa verifier HttpOnly del mismo navegador/último enlace; rechaza enlaces antiguos con tokens. Fallo de logout muestra aviso y mantiene sesión; rechazo de política de contraseña no borra cookies válidas.
- Límites por IP: login 10/15 min, reset 5/h, sesión 60/15 min, recovery/password 10/15 min; signup no añadido. Inputs extra y user_id se rechazan. Hash de contraseña delegado a Supabase. Backend lint/**100 pruebas**, frontend check/build, Auth, agenda/metadatos, 16 regresiones reserva, CSP, 33 casos runtime y scanner pasan.
- Ensayo privado `check-connections.mjs` usa runtime generado real, build y clínica ficticia/SQL restaurado: login/cookies invisibles a JS/token legado eliminado, recuperación/cierre, Calendar/recarga y reserva móvil; red externa bloqueada. Recibo `connections-verification.json`. Auth/Calendar/PostgREST siguen siendo dobles/adaptador limitado; no certificar proveedor real.
- Sin SQL/dependencias nuevos ni efectos externos. EasyPanel aparcado. Antes de desplegar: sitio HTTPS web/API compatible con Lax, CORS/redirect de recuperación, proxy/forwarded headers/cache, Auth/MFA/límites del proveedor y topes monetarios. Cambios de credenciales/configuración externa siguen sin autorización. Pendientes clínicos previos (caída Calendar en curso, alta paciente/cita atómica) conservados.
- Próxima tarea local: auditoría de diseño web/móvil siguiendo DESIGN.md, con fixtures y una clínica. Leer este bloque y el primero de STATUS; no repetir seguridad/Calendar ni arrancar de cero. Mantener todos los cambios locales y restricciones externas.

## Bloque anterior: conexiones CSP runtime/build

- Nginx incorpora `connect-src 'self' $fisio_connect_sources` en todas las locations; el entrypoint genera `/etc/fisio/connect-sources.conf` con orígenes backend/Supabase. Runtime tiene prioridad sobre build; no se conserva el origen sustituido. Build crea `.runtime-defaults.sh` (URLs, sin clave) y Docker lo copia fuera del HTML. Artefacto ignorado por Git y contexto Docker, generado de nuevo en build.
- URLs HTTPS o HTTP literal localhost/127.0.0.1, con ruta opcional; sin credenciales/query/fragmento/comodines/inyección. Rechazo antes de publicar; archivos temporales en startup. No cambia la configuración cliente ni activa nada. Los fallbacks existentes siguen si ambas capas omiten URLs; requerir explícitas en un futuro autorizado.
- `scripts/test-runtime-connections.mjs`: 33 casos de prioridad/rechazo/archivos preservados. `test-public-config.mjs` prueba guardas y el hook real de defaults. Backend lint/90 pruebas, frontend check/build, 16 regresiones de reserva, CSP y scanner pasan. Chrome reutiliza el ensayo ficticio y cabecera real expandida: flujos válidos pasan, conexión a puerto no autorizado bloqueada antes de transporte. Recibo `.private-backups/local-validation/csp/connections-verification.json`; servidores detenidos.
- Sin SQL/dependencias nuevos ni acciones externas. Envsubst es doble local (Git Bash no lo incluye); nginx/proxy no ejecutados. Imágenes externas del catálogo preservadas. No declarar CSP universal contra XSS/exfiltración ni modo CLI personalizado/proveedores/micrófono acreditados; IPv6 no admitido. Pendientes HttpOnly/Auth/topes monetarios, logs históricos, recuperación de caída Calendar en curso y alta paciente/cita atómica.

## Bloque anterior: CSP del navegador

- CSP nativa Astro en los cuatro HTML compilados antes de scripts; hashes para código generado, scripts propios y sin scripts inline arbitrarios/eval/handlers de atributos. Base/objetos/frames/workers bloqueados, formularios propios. Estilos de atributos permitidos; API/Storage runtime aún sin allowlist CSP. No afirmar una política universal contra XSS/exfiltración.
- `frontend/src/scripts/layout.js` y `public-booking.js` contienen la lógica anterior empaquetada; no volver a insertar `is:inline` sin hash. `runtime-config.js` síncrono al inicio del body. Los botones Reintentar/alta vacía usan listeners. Nginx añade frame-ancestors y Permissions-Policy por location; micrófono propio permitido. No desplegado.
- Backend lint/90 pruebas, frontend check (39 archivos, cero errores/avisos/hints)/build, reserva 16 regresiones, agenda/Auth/guardas y scanner 78 archivos pasan. `node scripts/test-browser-policy.mjs` comprueba los bytes del build. `test-public-booking.mjs` ahora ejecuta el controlador JS real.
- Chrome instalado con build y clínica/Auth/Calendar ficticios: acceso, alta vacía, validación reset, Calendar/recarga y reserva/recuperación móviles pasan; una escritura de reserva simulada. Probe eval servido como script propio, para evitar el bypass de DevTools. Recibo/capturas en `.private-backups/local-validation/csp/`; red externa bloqueada. Servidores detenidos.
- Sin SQL/dependencias nuevos ni acciones externas. No ensayados nginx/proxy, Google/Auth/PostgREST reales ni micrófono físico. Pendientes runtime allowlist, sesión HttpOnly/Auth, topes monetarios, logs/objetos históricos, caída Calendar en curso y alta paciente/cita atómica. Mantener EasyPanel aparcado.

## Bloque anterior: errores públicos y trabajos IA

- `backend/src/lib/public-error.js` oculta diagnósticos técnicos en producción; mensajes de negocio fijos PT400/PT404/PT409 y errores locales marcados como públicos conservan su explicación. Global, finanzas, readiness, Calendar, ejercicios y respuestas Telegram afectadas lo reutilizan, incluso dentro de HTTP 200. No afirmar saneamiento universal de cada objeto histórico/log.
- GET de trabajos IA vuelve a autorizar al paciente con RLS en cada consulta, incluso si está en caché. Un cambio de clínica o pérdida de acceso impide recuperar el informe; sin paciente solo su profesional. Fallo de lectura SQL no simula 404/ausencia.
- Diez regresiones añadidas en `backend/test/public-errors.test.js`. Backend lint/90 pruebas, frontend check/build, acción/metadatos de agenda y ensayo SQL restaurado pasan. Sin SQL/dependencias nuevos ni acciones externas. Informes/resultados históricos no se alteraron; logs y objetos históricos requieren revisión aparte.
- El usuario autorizó continuar en local. No repetir Calendar ni toda la auditoría. Pendientes: HttpOnly/sesión servidor, configuración Auth, CSP/proxy, límites monetarios, recuperación administrativa de una petición Calendar que quedó en curso y alta paciente/cita atómica. No hay autorización externa nueva.

## Bloque completado: Calendar y primera revisión de seguridad

- POST profesional `appointments/:appointmentId/check-calendar` verifica permiso/RLS y `updated_at`. Solo lectura directa: ID vinculado o todas las páginas por referencia CRM; evento único, token/contenido/horario exactos. Cancelación requiere recurso cancelado del ID vinculado en calendario original. Vacío, 404/410, timeout, lectura incompleta o petición en curso mantienen bloqueo; no repite mutaciones.
- Migración CLI local `20261008090742_appointment_calendar_verification.sql`: operación/calendario/en curso. Reclamación antes de Calendar y CAS para vínculo/desbloqueo. Caída con `in_flight=true` conserva bloqueo; sin caducidad ni recuperación administrativa automática. W5 no acredita completitud/tombstones y no desbloquea.
- Agenda web/móvil/detalle ofrece «Comprobar Calendar», protege doble clic/versiones/contexto y reemplaza su aviso anterior. QA ficticia 1280/375 px sin desbordamiento, botón 44 px; SQL independiente confirma una sola cita y vínculo recuperado que persiste al recargar.
- Seguridad: guardas de claves públicas en build/runtime, scanner sin secretos reconocidos, CORS HTTPS explícito, límite IA/audio por perfil, inputs e identidad servidor, cabeceras nginx y dependencias sin avisos npm. Astro actualizado a 7.3.7 (major local, contenedor no probado). Matriz y gaps en `docs/SECURITY_REVIEW_2026-10-08.md`; no afirmar los 16 resueltos. HttpOnly/Auth/proxy-CSP/topes monetarios pendientes. Usuario respondió «POR AHORA NINGUNA» a rotación GitHub/configuración externa; no ejecutar esas acciones.
- Backend lint/80 pruebas, frontend check/build y regresiones pasando. Ensayo restaurado con `calendar_verification: true`, `public_rls_coverage: true`, `cloud_changes: false`; PostgreSQL independiente prueba recuperación/CAS y quedó detenido. Transportes/Auth ficticios y adaptador limitado; Google/PostgREST reales no acreditados.
- El objetivo exacto de recuperación abajo está terminado localmente. Mantener EasyPanel aparcado y todas las restricciones externas; los pendientes vigentes están en el último bloque de arriba.

Comprobaciones añadidas: `node scripts/test-calendar-action.mjs`, `node scripts/test-public-config.mjs`, `node scripts/check-client-secrets.mjs`, `backend/test/calendar-verification.test.js`, `backend/test/http-security.test.js`, `backend/test/security-inputs.test.js`. El ensayo `--flows` ejecuta `scripts/test-calendar-verification.mjs`; navegador opcional `--browser-records --calendar` usa clínica y lector ficticios, sin red externa. Capturas privadas `calendar-pending-mobile.jpg`/`calendar-verified-desktop.jpg`.

## Proyecto y decisiones vigentes

- Carpeta de trabajo: `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`; la carpeta superior es el workspace.
- CRM para **Fisioterapia Carla JL**, cuenta prevista `carlajl1985@gmail.com`. Por ahora una única clínica. Conservar el aislamiento existente sin ampliar a una plataforma comercial en este bloque.
- Continuar la V2 actual: pacientes, historial/evolución, citas, cobros, bonos/facturas y planes de ejercicios con revisión profesional obligatoria antes de PDF/envío. No empezar de cero.
- Mantener Supabase y el VPS/EasyPanel existentes. Telegram y WhatsApp comparten la reserva; **OpenWA solo para piloto**. No conectar números ni enviar mensajes reales.
- Acabado premium web/móvil: Precisión azul elegida, DM Sans y tokens v6; decisiones y referencias en `DESIGN.md`. El bloque visual está aplicado en local.
- Antes de cada tarea, comunicar modelo y razonamiento. Para retomar este bloque: **GPT-6.1-sol, razonamiento alto**. Responder en español y sintetizar.
- Preferir soluciones pequeñas, reutilización y verificación proporcional. No introducir colas, servicios, dependencias ni abstracciones por previsión.

## Autorización y límites

Solo desarrollo, edición y ensayos **locales**. EasyPanel está aparcado por decisión del usuario. No desplegar, activar servicios externos, aplicar SQL en Cloud, enviar mensajes, crear commits ni hacer push sin autorización explícita para ese destino/acción. Las autorizaciones históricas de operaciones concretas no autorizan una nueva actualización.

Secretos exclusivamente en `.env.local`: comprobar lo necesario sin imprimir valores. No mostrar copias de pacientes ni diagnósticos privados de `.private-backups`. No borrar/revertir el trabajo existente ni formatear archivos ajenos al cambio. La instancia PostgreSQL temporal del último ensayo fue detenida; no había listener en 54339 al guardar este punto. No detener otros servidores del usuario.

Leer `AGENTS.md`, el primer bloque de `docs/STATUS.md` y lo pertinente de OPERATIONS/ARCHITECTURE. **«Precisión azul elegida y aplicada»** es el último bloque; **«Recuperación verificada de Calendar y seguridad local»** conserva el contrato vigente de Calendar. Los demás bloques son históricos.

## Bloque anterior: CRM antes de Calendar (histórico)

- Altas públicas, agenda interna, reservas del agente y edición/cancelación guardan `crm_citas` antes de mutar Calendar. Una nueva columna `calendar_sync_pending boolean not null default false` mantiene una operación sin comprobar.
- `syncSavedAppointmentToCalendar` solo limpia la marca cuando Calendar confirma y el vínculo CRM se confirma mediante UPDATE condicionado a marca y `updated_at` leído. Fallo de contexto, escritura externa, vínculo o respuesta perdida conserva la cita y devuelve datos/aviso. `GOOGLE_CALENDAR_REQUIRED=true` no revierte la cita aceptada.
- La creación pública requiere UUID en `Idempotency-Key`, conserva el hash original y recupera la fila en reintentos sin crear otro evento. `/public-booking/recovery` consulta el estado sin escribir. La página conserva solo la clave en sessionStorage y recupera al recargar la misma pestaña.
- Una cita pendiente rechaza otra modificación con 409 **`CALENDAR_CHECK_REQUIRED`**. La recuperación descrita arriba permite comprobarla; nunca limpiar a ciegas.
- Reconciliación ignora pendientes y condiciona sus escrituras a la versión leída. La descripción del evento incluye `CRM Appointment ID: <id real de crm_citas>`; backfill consulta esa fila y no crea otra cita tras perder la respuesta.
- Eliminada la compensación antigua: si INSERT/UPDATE SQL es rechazado, no se crea, edita ni cancela ningún evento. El escritor directo no cambia a W6 tras un resultado incierto; las mutaciones directas llevan `retry: false` y timeout de 10 segundos. W6 exige confirmaciones completas.
- Agenda/ficha y avisos diferencian «guardada en CRM» de «Calendar pendiente». El estado global de sincronización prioriza el contador pendiente; no simula sincronización completa.

## Objetivo solicitado y completado localmente

**Implementar una comprobación verificada de las sincronizaciones pendientes que permita recuperar el vínculo y desbloquear la cita sin duplicar eventos ni repetir mutaciones inciertas.**

Empezar reproduciendo los casos con los ensayos existentes. Trazar lector directo, W5, escritor compartido y todos los llamadores antes de modificar el contrato. No empezar reenviando Calendar ni añadiendo un job automático.

Criterios del próximo bloque:

1. Comprobar el evento existente con permisos de la clínica/profesional. Para una creación cuyo ID no se guardó, usar la referencia CRM y validar correspondencia, horario y datos esperados; múltiples coincidencias o lecturas incompletas no autorizan a elegir una ni a desbloquear.
2. Cubrir alta, cambio y cancelación. Un evento que no aparece en una lista/rango, una petición todavía en curso o un fallo de lectura **no prueban** que la operación no ocurrió. Conservar el estado incierto en esos casos.
3. Recuperar el vínculo y liberar la marca únicamente con evidencia suficiente y una escritura condicionada al estado/versionado actual. Una respuesta vieja no puede liberar o sobrescribir otra operación.
4. Dar una acción/resultado comprensible en la agenda, manteniendo el bloqueo cuando no se puede confirmar. No exponer contactos o datos de otros pacientes ni usar una clave privilegiada en frontend.
5. Dejar regresión ejecutable y repetir las comprobaciones afectadas; no afirmar Google/Auth/PostgREST reales con transportes ficticios.

La implementación y límites actuales se describen arriba. No inventar una operación «segura» basándose solo en que transcurrió un timeout.

## Archivos relevantes

- `backend/src/routes/professional.js`: `syncAppointmentToGoogleCalendar`, `syncSavedAppointmentToCalendar`, `buildCalendarEventPayload`, `fetchCalendarEventById`, lectores W5, `persistCalendarBackfillAppointment`, `reconcileAppointmentsWithCalendar`, alta pública, `createCrmAppointment` y PATCH de citas.
- `backend/src/lib/patient-booking.js`: reserva compartida de Telegram/WhatsApp; bloquea confirmación incierta, no reenvía a ciegas.
- `backend/src/lib/supabase.js` y `backend/src/middleware/security.js`: contexto de sesión/RLS y límites de endpoints públicos. No introducir fallback privilegiado.
- `backend/src/lib/readiness.js`: exige nueva columna; devuelve estado no listo si falta.
- `frontend/src/pages/index.astro`: metadatos y avisos de agenda; conservar IDs/data-*.
- `frontend/src/pages/reserva.astro`: recuperación pública existente. No convertir «Comprobar reserva» en otro alta.
- `n8n/Fisio_IA_Agent/production/w5-calendar-reader.json` y `w6-calendar-writer.json`: contratos actuales. W6 crea con ID generado por Google; todavía no proporciona creación idempotente con ID determinista. Workflows no modificados/activados en este bloque.
- `scripts/test-calendar-persistence.mjs`: handlers y SQL reales, Calendar ficticio, pérdida de respuesta/vínculo, cambios/cancelaciones, lectura posterior y solapes tardíos.
- `scripts/test-appointment-concurrency.mjs`: PostgreSQL nativo temporal, conexiones independientes; exclusión/unicidad, reclamación de Calendar y versiones obsoletas.
- `scripts/rehearse-supabase.mjs`, `scripts/local-query-client.mjs`, `scripts/test-booking-retries.mjs`: infraestructura de ensayo existente; el adaptador SQL es limitado, no PostgREST.
- `backend/test/calendar-writer.test.js`, `clinic-dashboard.test.js`, `readiness.test.js`, `scripts/test-appointment-context.mjs`, `scripts/test-public-booking.mjs`: regresiones actuales.

## Migraciones y evidencia

Preparadas y ensayadas solo en local, pendientes de Cloud:

- `database/migrations/20261007154552_financial_integrity.sql`.
- `database/migrations/20261007201534_clinic_creation_retries.sql`.
- `database/migrations/20261007214504_public_booking_retries.sql`.
- `database/migrations/20261008064542_appointment_calendar_pending.sql` (CLI).
- `database/migrations/20261008090742_appointment_calendar_verification.sql` (última, CLI).

Consultar OPERATIONS para las migraciones históricas ya aplicadas: sus timestamps Cloud pueden diferir. No volver a aplicarlas por esa diferencia. Una futura actualización necesita copia actual válida y autorización específica.

Última verificación: backend lint y **80/80 pruebas**, frontend check/build correctos, **16 regresiones de reserva**, metadatos/acción de agenda y guardas públicas pasando. Recibo `.private-backups/local-validation/flows/flow-verification.json` con `calendar_persistence`, `calendar_verification`, `public_rls_coverage` verdaderos y `cloud_changes: false`. PostgreSQL 18.3 con conexiones independientes pasó y quedó detenido. Sin afirmar resultados de Supabase/Google reales.

Aviso/acción probados en navegador con clínica independiente, Auth/Calendar ficticios. Sin escrituras Google/Supabase Cloud; adaptador limitado. No certificar OAuth/n8n/Google/PostgREST reales ni toda la aplicación.

Comandos usados desde la carpeta del repositorio, en PowerShell:

```powershell
# Backend y frontend, cada bloque en su carpeta
cd backend
npm run lint
npm test
cd ../frontend
npm run check
npm run build
cd ..
node scripts/test-appointment-context.mjs
node scripts/test-public-booking.mjs

# Ensayo restaurado, sin Cloud
$env:PGLITE_PACKAGE_DIR='C:/Users/raulr/AppData/Local/npm-cache/_npx/da5c1b6ea715e8b4/node_modules/@electric-sql/pglite'
node scripts/rehearse-supabase.mjs .private-backups/local-validation/flows .private-backups/local-validation/flows/clinic-setup-plan.json --flows

# PostgreSQL temporal nativo: utiliza 127.0.0.1:54339 y detiene su instancia
$env:PG_PACKAGE_DIR='C:/Users/raulr/AppData/Local/npm-cache/_npx/da5c1b6ea715e8b4/node_modules/pg'
node scripts/test-appointment-concurrency.mjs
```

Los paths del cache pueden cambiar: comprobar su existencia antes de reutilizarlos. PostgreSQL instalado en `C:/Program Files/PostgreSQL/18/bin`. Algunas pruebas HTTP/nativas requirieron ejecución local fuera del aislamiento por EACCES; eso no autoriza conexiones o mutaciones externas.

Otros pendientes: alta paciente/cita atómica, recuperación del alta interna tras acuse SQL perdido, Auth/PostgREST e integraciones reales autorizadas, gaps de seguridad indicados, facturación fiscal completa y acabado visual restante. Calendar completado dentro de los límites descritos; no iniciar una nueva operación externa sin autorización.
