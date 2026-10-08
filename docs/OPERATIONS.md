# Operations

## Estado vigente — 2026-10-08: despliegue y cierre de integraciones

El usuario autorizó fusionar PR #2, aplicar las cinco migraciones ensayadas y configurar/desplegar los servicios existentes. PR #2 fusionado en main (0fce175); frontend/backend desplegados y sanos. Cloud tiene las cinco migraciones, columnas verificadas y RLS preservado. La copia nativa CRM/Auth está restaurada y comprobada; no acredita restauración completa de los internos gestionados.

Se ha ampliado expresamente la preparación para cerrar Calendar, mensajería y cron antes de la primera prueba. Google fue reconectado por el usuario: W5 lee el calendario configurado y W6 lee recursos/páginas completos mediante OAuth. Once workflows existentes actualizados por API: webhooks con Header Auth, llamadas al backend con su clave/secreto, expresiones corregidas y sin reintentos de escritura. Eliminado el atajo del bot que reservaba otra cita cuando fallaba el backend. Exportaciones de producción sin secretos en n8n/Fisio_IA_Agent/production; copias de recuperación con posibles secretos exclusivamente en .env.local.

El backend incorpora comprobación Calendar por OAuth y no acepta una respuesta vacía como calendario vacío. Recordatorios: entrega incierta queda bloqueada, sin reenvío automático; errores SQL no se ocultan. Backend lint/106 pruebas y frontend check/build pasan. Preparación comprobada en local; publicar esta corrección y verificar el nuevo despliegue antes de dar por terminada la primera prueba. El cron Calendar existente sigue cada dos minutos; recordatorios horarios se activarán después de comprobar backend y vista previa.

Pruebas de producción previas: diez controles HTTP/Auth/CSP/proxy pasan; acceso anónimo redirige al login. No acreditan login profesional válido ni entrega real a pacientes. WhatsApp sigue como piloto desactivado; no hay nueva infraestructura. Las entradas siguientes documentan historia: no repetir migraciones, auditorías o despliegues por frases antiguas.


Guía de desarrollo local, validación, despliegue y mantenimiento de Fisio Clinical.

## Sesión HttpOnly del navegador (solo implementada/ensayada en local)

`backend/src/routes/auth.js` monta POST `/api/auth/login`, `/session`, `/logout`, `/reset-request`, `/recovery` y `/password` antes del middleware de API; cada ruta tiene validación/controles propios. Backend sigue necesitando `SUPABASE_URL`, `SUPABASE_ANON_KEY` y service role para su uso acotado existente. Frontend usa `PUBLIC_BACKEND_URL` y cookies, sin SDK Auth ni clave pública en runtime. `PUBLIC_SUPABASE_URL` permanece para el origen CSP/Storage y la limpieza del almacenamiento Auth legado; no retirar/cambiar ese URL al migrar sin revisar las claves antiguas. Build/entrypoint conservan las guardas si se aporta una clave antigua, pero no la publican.

Producción exige HTTPS en la petición interpretada por Express, cookies `__Host-fisio-*` Secure/HttpOnly/SameSite=Lax/Path=/ sin Domain; local HTTP usa `fisio-*`. Web/API deben compartir sitio compatible con Lax: origen frontend HTTPS exacto en `FRONTEND_URL`/`FRONTEND_URLS`, nunca wildcard ni SameSite=None como parche. Verificar proxy real (`trust proxy=1`, forwarded headers y acceso directo al backend) y que ninguna capa cachea API/Set-Cookie; respuestas tienen private/no-store, Pragma y Expires. No se cambió EasyPanel ni dominio, y este ensayo no acredita esa topología.

Login 10/15 minutos por IP; reset 5/h; sesión 60/15 min; recovery/password 10/15 min, además de 300/15 min general por defecto. Store/coalescencia en memoria para una instancia; reinicios reinician el contador y réplicas requieren revisión. Las rutas Auth nativas de Supabase pueden seguir accesibles directamente: comprobar [límites del proveedor](https://supabase.com/docs/guides/auth/rate-limits), signup, MFA y políticas de contraseña con autorización. El backend no incorpora autoregistro.

Recuperación usa [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow): verifier de 256 bits en cookie HttpOnly de una hora, challenge s256 y redirect construido desde el origen autorizado a `/reset-password`. Configurar/validar allí la [allowlist de redirects](https://supabase.com/docs/guides/auth/redirect-urls) y plantilla existente solo con autorización. Abrir el enlace en el mismo navegador/dispositivo; solo el último enlace es válido para este navegador. Se elimina código/hash de la URL antes de llamar al API. Enlaces antiguos con access_token deben volver a solicitarse; las sesiones localStorage existentes requieren nuevo login. No se importan ni reenvían tokens legados.

Contraseñas nuevas: al menos 10 caracteres y hasta 72 bytes UTF-8; hash del proveedor, nunca guardadas por el CRM. Login acepta hasta 1024 caracteres para validar cuentas existentes. User/clinic/profile IDs extra en cuerpo Auth se rechazan; identidad derivada desde proveedor/perfil. Logout usa revocación local; error de proveedor conserva cookies y muestra aviso. Cambios/reintentos reales del proveedor pendientes: las pruebas usan dobles y no envían email real. Auth/logs globales de estas rutas evitan diagnósticos/cuerpo/query; otros logs históricos siguen pendientes.

Validación: backend lint/test (**100 pruebas**), frontend check/build, `node scripts/test-frontend-auth.mjs`, pruebas de agenda/reserva y guardas/CSP/runtime/scanner. Diez casos nuevos prueban Auth/RLS, Secure/prefix/CSRF, falsificación, expiración/concurrencia, errores/incompletitud, PKCE, logout y límites. Chrome privado `check-connections.mjs` sobre build/runtime generado y SQL de clínica ficticia prueba login/cookies invisibles a JS, limpieza de legado, recuperación/cierre, Calendar/recarga y reserva móvil; red externa bloqueada. Recibo privado `connections-verification.json`, sin SQL Cloud, envíos, dependencias nuevas, commits, push ni deploy.

## CSP del build estático

`security.csp` de [Astro](https://docs.astro.build/en/reference/configuration-reference/#securitycsp) genera la política en los cuatro HTML. Ejecutar `npm run build` en frontend y `node scripts/test-browser-policy.mjs` desde la raíz: comprueba posición antes de scripts, hashes exactos, handlers/eval/objetos/base bloqueados y cabeceras por location. La CSP no se aplica en dev; validar build/preview. `is:inline` no aporta hashes para estos controladores: Layout/reserva se empaquetan desde `src/scripts/`; `runtime-config.js` permanece externo propio y síncrono al principio del body.

Se permiten atributos style para vistas dinámicas e imágenes externas del catálogo. Nginx añade `frame-ancestors 'self'` (la [directiva no funciona en meta](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)), Permissions-Policy y [connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src) en todas las locations. Las conexiones admiten self y los orígenes efectivos backend/Supabase; micrófono propio permitido. El navegador local usó estas cabeceras mediante servidor de ensayo; no equivale a `nginx -t`, contenedor ni proxy real. El aviso de Shiki del build no afecta los flujos actuales sin Markdown.

Build normal `npm run build` genera `frontend/.runtime-defaults.sh`, ignorado y con URLs sin clave. Docker lo copia a `/etc/fisio/runtime-defaults.sh`. El entrypoint elige runtime o build y, si faltan ambos, mantiene fallbacks existentes; genera `connect-sources.conf` y runtime-config antes de arrancar nginx. HTTPS o HTTP literal localhost/127.0.0.1; rutas opcionales, sin credenciales/query/fragmento/comodines/espacios. No ejecutar el entrypoint manualmente en un contenedor servido: requiere un arranque completo para que URLs/cabeceras sean coherentes. Defaults y claves se revalidan con el modo resuelto por Vite. El CLI de modo personalizado no se ensayó; IPv6 no admitido por la guarda actual. No habilita Realtime/WebSocket nuevo.

`node scripts/test-runtime-connections.mjs` comprueba 33 casos usando el entrypoint real con rutas temporales. `test-public-config.mjs` valida también el hook real y restaura el artefacto previo. Git Bash carece de envsubst: un doble sustituye solo los placeholders PUBLIC de URLs, sin evaluación shell; GNU envsubst/nginx/proxy real pendientes. Chrome del ensayo privado `check-connections.mjs` usa el include generado y la cabecera del nginx.conf actual; valida flujos y rechazo de conexión antes del transporte. Recibo privado `connections-verification.json`, servidores detenidos. No equivale a protección universal de exfiltración ni prueba de proveedores reales.

Ensayo privado `.private-backups/local-validation/csp/check-browser.mjs`: Playwright del runtime de Codex, Chrome instalado, build estático y API ficticia del ensayo `--browser-records --calendar`. Login, controles adaptados, validación reset, Calendar/recarga y reserva/recuperación pasan en 1280/375 px. Red externa bloqueada. Inline/handler/eval bloqueados: eval se ejecuta desde script servido por la página, porque [DevTools puede omitir esa restricción](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate). Capturas/recibo privados; servidores detenidos. Sin micrófono físico ni servicios reales acreditados.

## Diagnósticos públicos en producción

Con `NODE_ENV=production`, `public-error.js` oculta mensajes técnicos SQL/proveedor en los manejadores afectados (global, finanzas, readiness, Calendar, ejercicios y Telegram), también en avisos HTTP 200 y trabajos fallidos persistidos. Los estados/códigos y mensajes fijos de negocio permanecen; un error de lectura no equivale a una lista vacía o un recurso ausente. Desarrollo conserva diagnósticos para depurar. La regresión `backend/test/public-errors.test.js` usa errores y sesiones ficticios y comprueba autorización del paciente al consultar trabajos desde caché.

Los mensajes PT400/PT404/PT409 de RPC deben ser constantes; si se añaden valores privados, sustituirlos por un mapeo público explícito. No limpiar automáticamente informes clínicos/resultados históricos ni confundir esta protección con auditoría/redacción de logs. El bloque se ensayó solo en local; comprobar configuración y respuestas reales antes de un despliegue autorizado.

## Escrituras de Calendar con resultado incierto

Con credenciales directas configuradas, el backend usa ese transporte para crear, editar o cancelar; un error nunca autoriza reenviar la misma mutación por W6. Cada llamada directa usa `retry: false` y `timeout: 10000`, opciones de [Gaxios](https://github.com/googleapis/gaxios/blob/main/README.md). Sin cliente directo se usa W6 una sola vez; `ok` debe ser booleano verdadero y creación/edición deben confirmar el identificador esperado. Un borrado directo 404/410 admite un evento ya ausente según los [errores de Calendar](https://developers.google.com/workspace/calendar/api/guides/errors).

CRM se guarda antes de Calendar con `calendar_sync_pending=true`. La API devuelve la cita guardada y `calendar_sync.status: error` si falla Calendar o no se confirma el vínculo posterior: no repetir el alta por ese aviso. Una confirmación válida más el vínculo CRM limpian la marca. `GOOGLE_CALENDAR_REQUIRED` conserva su clasificación de configuración, pero un fallo externo no revierte ni oculta una cita aceptada.

Una modificación pendiente responde 409 `CALENDAR_CHECK_REQUIRED`. Reconciliación no la modifica ni la reconstruye: el evento incluye `CRM Appointment ID` y se consulta la cita existente. Las escrituras sobre lecturas anteriores condicionan el UPDATE a marca y `updated_at` leído ([filtros de actualización Supabase](https://supabase.com/docs/reference/javascript/update)). No asumir rollback por desconexión ni activar otro escritor.

**Comprobar Calendar** invoca POST autenticado `/api/profesional/appointments/:appointmentId/check-calendar` (alias `/professional`) con `updated_at` esperado. Solo lee el calendario directo original. Alta sin ID: búsqueda CRM sin rango, con todas las páginas y cancelados; exige evento único y contenido/horario/operación exactos. Cambio: GET del ID. Cancelación: recurso `status=cancelled` del ID vinculado ([tombstones](https://developers.google.com/workspace/calendar/api/v3/reference/events)). Vacío, 404/410, timeout, datos incompletos/ambiguos o petición en curso mantienen pendiente. W5 no acredita esa evidencia.

Migración CLI `20261008090742_appointment_calendar_verification.sql`, solo local, añade operación, calendario y `calendar_sync_in_flight`. El escritor reclama antes de red y libera la marca en curso al terminar su llamada/registro condicionado; timeout no prueba ausencia remota. Caída o fallo de liberación conserva bloqueo: no borrar a mano ni asumir caducidad. Recuperación administrativa de ese caso todavía no implementada. Readiness exige las columnas; SQL no aplicado en Cloud.

`database/migrations/20261008064542_appointment_calendar_pending.sql` fue creada con CLI y ensayada en SQL local; no aplicada en Cloud. Readiness falla si falta la columna. No elimina citas ni cambia permisos/RLS; filas antiguas parten de `false`, lo que no certifica que sus eventos estén sincronizados. Para una futura actualización autorizada se necesita copia actual y preparar todas las migraciones pendientes antes de desplegar código dependiente de ellas.

`node --test backend/test/calendar-verification.test.js`, `node scripts/test-calendar-action.mjs`, metadatos de agenda y ensayo `--flows` prueban transportes/avisos y handlers reales con SQL restaurado; Calendar/Auth ficticios, adaptador limitado. `scripts/test-appointment-concurrency.mjs` usa PostgreSQL temporal/conexiones independientes para exclusión, unicidad, reclamación/desbloqueo y versiones; detiene su instancia. `--browser-records --calendar` monta clínica independiente y lector ficticio sin red externa, nunca en producción. Google/OAuth/n8n/PostgREST reales pendientes.

## Seguridad del bloque local

Los 16 puntos, evidencia y gaps en `docs/SECURITY_REVIEW_2026-10-08.md`. Producción exige `FRONTEND_URL`/`FRONTEND_URLS` HTTPS; sin staging implícito. `AI_GENERATION_RATE_LIMIT` limita IA/audio por perfil, en memoria/una instancia; no sustituye presupuestos ni Auth externo. Scanner no imprime valores y guardas se prueban con claves ficticias. Frontend ya no publica claves Auth: anon/publishable queda solo en backend y service role conserva su alcance servidor. HttpOnly/CSP están implementados localmente; proxy/proveedores/configuración Auth/topes monetarios siguen sin acreditar. No se rotaron credenciales ni cambió configuración externa por indicación del usuario.

## Protección de altas pendiente de Cloud

`database/migrations/20261007201534_clinic_creation_retries.sql` solo ensayada en local. Antes de desplegar esta aplicación, preparar copia válida del inventario actual y obtener autorización específica para aplicar esta migración y la financiera pendiente. No reutilizar la copia histórica de 31 tablas como copia actual completa.

Pacientes/notas del frontend usan `Idempotency-Key`. Reintentar manualmente conserva la operación, incluso al recargar esta pestaña. Si el contenido cambia, la respuesta 409 `CREATE_ALREADY_SAVED` entrega únicamente el registro autorizado y el formulario pasa a actualizarlo. No limpiar sessionStorage ante un guardado incierto: se perdería la referencia necesaria para comprobarlo. No hay reenvío automático. La recuperación entre dispositivos/browsers no está implementada.

La RPC se limita a sesiones profesionales; deriva identidad/clínica y mantiene recibos internos sin acceso directo. Readiness invoca parámetros nulos con el cliente de servidor: 42501 es el resultado esperado de una función instalada con ejecución denegada; PGRST202/otros errores bloquean readiness. Esta comprobación y los códigos reales de PostgREST deben confirmarse en un entorno Supabase autorizado antes de producción.

Comprobación local adicional: `node scripts/test-creation-recovery.mjs` y `node scripts/test-ficha-save-context.mjs`. `--flows` ensaya la migración y guarda su SHA-256. `--browser-records` admite `dropWrites` en el control exclusivo de ensayo: destruye la respuesta después de ejecutar SQL. No se monta en el servidor de producción. Auth ficticio y adaptador SQL no acreditan PostgREST ni concurrencia entre conexiones reales. Capturas/recibos privados en `.private-backups/local-validation/`. Revisar presentación de avisos en móvil durante el acabado visual.

## Alcance actual: una clínica

Se conserva el VPS existente con EasyPanel y Supabase Cloud. No crear otro servidor, migrar a PostgreSQL independiente ni contratar servicios para este incremento. Se mantienen los permisos y la revisión profesional de los planes; las integraciones globales se configuran para el único centro del usuario.

El 7 de octubre de 2026 se reactivó el proyecto Supabase `Fisio-IA-Agent` (`uewhbaejcouenoufuwlq`) y, con autorización posterior específica, se configuraron cuenta, base V2 y asignación para Fisioterapia Carla JL como única clínica. Estado `ACTIVE_HEALTHY`, región `eu-central-1`, plan Free, PostgreSQL 17.6. EasyPanel todavía no tiene el backend/frontend actualizado.

### Operación Cloud ejecutada y verificada

Historial registrado por Supabase; estos timestamps difieren de los archivos locales. **No volver a aplicarlos por esa diferencia**:

| Contenido local | Versión Cloud / nombre |
| --- | --- |
| `20260901_production_security_hardening.sql` | `20261007141231_production_security_hardening` |
| `20261007091159_clinic_isolation.sql` | `20261007141259_clinic_isolation` |
| `20261007094023_clinical_approval_integrity.sql` | `20261007141319_clinical_approval_integrity` |
| `20261007101248_messaging_pilot.sql` | `20261007141344_messaging_pilot` |
| `database/setup/assign_single_clinic.sql` | `20261007141611_assign_single_clinic` |

Preflight, copia nueva y ensayo completo antes de crear la cuenta. La copia previa está en `.private-backups/2026-10-07T14-06-28-351Z-api/`, con hashes y verificaciones. Auth se creó mediante API administrativa con correo confirmado, sin invitación/correo automático. Contraseña fuerte inicial únicamente en `CLINIC_OWNER_INITIAL_PASSWORD` de la raíz `.env.local`; no imprimirla ni copiarla a documentación. La asignación resolvió el UUID Auth por el correo confirmado y generó la clínica en la transacción; el plan privado conserva después ambos identificadores reales. Nunca insertar cuentas Auth por SQL ni repetir esta operación.

Confirmados login/Auth/PostgREST, una clínica activa, perfil admin, 7 pacientes, 18 citas, 35 informes en revisión y las dos fichas antiguas. La sesión accede también a 6 pagos, 1 documento, 3 notas clínicas, 172 comunicaciones asociadas y 118 ejercicios de recomendaciones; bonos/facturas vacíos accesibles. Las 22 comunicaciones sin paciente permanecen conservadas y ocultas. Tres restricciones de clínica validadas, exclusión de citas instalada y diez eventos de asignación en auditoría. El rol/identidad/clínica no son editables por el cliente; anon no accede a pacientes, el servidor no puede invocar revisión profesional y Vault conserva acceso exclusivo de servidor.

`preservation-verification.json` confirma el contenido original de las 31 tablas fuente mediante JSON canónico PostgreSQL, excluyendo solo cambios autorizados y nuevos campos. `access-verification.json`, `cloud-receipt.json` y una exportación pública posterior documentan el estado actual en la carpeta privada. La exportación posterior tampoco es una copia completa de Auth ni de Supabase. **Ahora existe una cuenta Auth y 35 tablas: el script API previo se detendrá por alcance; no usarlo como copia completa ni quitar sus guardas.** Preparar copia nativa con conexión PostgreSQL o ampliar el mecanismo y su ensayo antes de nuevas migraciones.

Advisors: cinco INFO de tablas deliberadamente internas sin políticas y [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se cambió plan/configuración Auth. No se desplegó, se activaron servicios ni se enviaron mensajes. Preparar la actualización de aplicación y verificar planes históricos/destinos antes de solicitar un despliegue o conectar el piloto.

Aplicada y verificada, con autorización expresa, la corrección `database/migrations/20261007110637_vault_server_only.sql`: revoca ejecución de `public.vault_read_secret(text)` a PUBLIC/anon/authenticated y la conserva para `service_role`. La función permanece disponible para el script de servidor `sync-openai-from-vault.mjs`, que ya usa la clave de servicio. No cambia datos ni el cuerpo de la función. El servicio de gestión la registró como `20261007111313_vault_server_only`; no volver a aplicar el archivo local por la diferencia de timestamp.

La comprobación posterior con `has_function_privilege` devuelve false para `anon`/`authenticated` y true para `service_role`; Advisors ya no señala Vault. La definición conserva su hash anterior. No se invocó la función contra secretos reales. La prueba local con datos ficticios está incorporada a `scripts/test-clinic-isolation.mjs`. La reactivación y esta corrección ya autorizadas no autorizan otras migraciones, despliegues o activaciones de OpenWA/Telegram.

Antes de aplicar las demás migraciones de esquema/datos, conservar una copia de seguridad verificable y ensayarlas en una copia local o de pruebas. La contención de Vault cambia únicamente permisos de ejecución y está probada con datos ficticios. El plan Free no incluye copias automáticas; la exportación debe incluir por separado los archivos clínicos de Storage cuando existan. No enviar claves por chat ni guardar exportaciones con datos de pacientes en Git.

### Copia local previa a las migraciones V2 (inventario histórico)

El comando aprovecha el acceso de gestión existente cuando falta `SUPABASE_DB_URL`. No es necesario cambiar la contraseña para copiar el CRM actual. Solo realiza consultas de lectura mediante la API; no reintenta automáticamente un fallo. Esta vía está limitada al inventario comprobado: 31 tablas públicas, ninguna cuenta Auth y ningún archivo Storage. Si cambia ese alcance, se detiene para evitar una copia incompleta presentada como válida.

Desde la raíz:

```powershell
node scripts/backup-supabase.mjs --self-test
node scripts/backup-supabase.mjs
```

La exportación API guarda `public-snapshot.json` y `manifest.json` con SHA-256 bajo `.private-backups/<fecha>-api/`. Un único SELECT captura datos y metadatos; los registros clínicos no se imprimen. Incluye estructura/datos públicos, funciones, secuencias, restricciones, índices, triggers, RLS/permisos, metadatos del bucket e historial de migraciones. Excluye internos de la plataforma, valores Vault, roles globales, archivos Storage y configuración externa. Mantener esta carpeta privada y fuera de Git o servicios públicos.

Ensayo sin conexión Cloud, desde la raíz y con una instalación existente de PGlite:

```powershell
$env:PGLITE_PACKAGE_DIR = 'C:\ruta\node_modules\@electric-sql\pglite'
node scripts/rehearse-supabase.mjs .private-backups/2026-10-07T13-03-57-819Z-api
```

Verificado sobre esa copia: 31 tablas restauradas y cada fila comparada con la fuente mediante JSON canónico de PostgreSQL; políticas y permisos de Vault conservados. Pasan el endurecimiento `20260901`, aislamiento, revisión clínica y mensajería. Los informes (35) y registros existentes se conservan; perfiles/pacientes sin clínica siguen ocultos. `restore-verification.json`, `migration-verification.json` y el manifiesto dejan constancia del alcance y hashes de los SQL ensayados. Auth/Vault locales son fixtures vacíos de compatibilidad: el ensayo no valida Auth/PostgREST ni integraciones reales y no reemplaza la asignación administrativa.

Si se dispone de `SUPABASE_DB_URL`, el comando usa la copia nativa completa de esquema/datos con PostgreSQL 18 ya instalado (`POSTGRES_BIN` configurable). Guardar la URI real de **Connect → Session pooler**, con contraseña codificada, en `.env.local`. Valida el proyecto, exige TLS y pasa la contraseña por entorno, sin imprimirla ni ponerla en argumentos. `database.dump` lleva listado/checksum; no incluye roles globales, archivos Storage ni configuración externa. `pg_restore --list` solo comprueba estructura; esta copia nativa requiere su propio ensayo antes de marcar restauración verificada.

Nunca restaurar ni aplicar estas migraciones sobre Cloud automáticamente. El endurecimiento antiguo debe preceder a las V2; ejecutarlo después restablecería políticas anteriores. El historial aislado `schema-history.json` no reemplaza ninguna copia: no refleja todas las modificaciones del esquema. Sigue disponible la prueba separada `test-clinic-isolation.mjs` con dos clínicas y datos ficticios para los contratos de seguridad.

### Preparación y ensayo de cuenta/asignación (histórico)

El usuario indicó clínica y correo. El plan de la primera copia contenía esos datos, los IDs exactos de origen y su checksum, con `auth_user_id` en null antes de crear la cuenta. El plan de la copia nueva ya contiene los IDs reales de la operación ejecutada. Nombre de presentación: `Carla JL`; rol administrativo para gestionar la única clínica. No conservar correos o contraseñas personales en archivos destinados a Git.

`database/setup/assign_single_clinic.sql` es una operación administrativa de una sola vez, posterior a las cuatro actualizaciones de esquema, que requiere cuenta Auth existente con el correo indicado. Su llamador debe abrir una transacción, establecer `app.clinic_setup` con JSON mediante `set_config(..., true)`, ejecutar el archivo y confirmar; cualquier fallo exige rollback. No crea usuarios mediante SQL ni contiene credenciales.

Comprueba el inventario esperado y los IDs/propietarios antes de escribir. Crea una clínica, vincula el perfil CRM y el profesional antiguo a la cuenta, prepara el rol admin, asigna siete pacientes y la asignación existente. Cinco pacientes sin creador se asignan explícitamente al perfil; los dos propietarios existentes se conservan. Mantiene citas, informes, datos clínicos y vínculos Telegram. Registra diez cambios en auditoría y valida las restricciones de clínica. Detiene un inventario diferente o una repetición; no reintenta ni reasigna nuevos pacientes por defecto.

Ensayo ejecutable, usando el mismo paquete PGlite existente:

```powershell
node scripts/rehearse-supabase.mjs .private-backups/2026-10-07T13-03-57-819Z-api .private-backups/2026-10-07T13-03-57-819Z-api/clinic-setup-plan.json
```

El segundo argumento activa exclusivamente una cuenta ficticia en memoria. Comprueba lectura de los registros, campos de identidad protegidos, bloqueo de clínica inactiva/sesión no vinculada/anon, rollback ante fallo de auditoría, rechazo de inventario distinto y ausencia de duplicación o modificación del resto de contenido. Resultado en `mapping-verification.json`, con hash del SQL y `auth_login_verified: false`. No crea una cuenta Supabase ni acredita un inicio de sesión real.

Esta operación Cloud ya se autorizó y ejecutó según el apartado actual anterior. Para futuras operaciones distintas, obtener autorización del destino/acción, revisar estado y conservar copia válida; detenerse ante fallo o incertidumbre sin repetir mutaciones. La autorización ejecutada no cubre despliegues ni activaciones de números, bots o workflows. El vínculo Telegram profesional anterior sigue pendiente de verificar.

## Local Development

### Ensayo de escrituras sin conexión Cloud

El ensayo `--flows` aplica además `20261007154552_financial_integrity.sql` **solo en memoria**, después de la asignación. El recibo incluye `finance_migration_sha256`. Esta migración no está aplicada en Cloud: allí requiere nueva copia del alcance actual y autorización específica; no reutilizar la autorización de la configuración inicial. Se detiene si existen facturas históricas, porque vincular cobros por coincidencia de importes sería inseguro. Antes de aplicar, revisar también los bonos existentes y sus fechas/capacidad.

`rehearse-supabase.mjs` admite `--flows` después del archivo de asignación. Usar una copia separada del snapshot previo, su manifiesto y su plan bajo `.private-backups/`; el ensayo actualiza recibos locales. No usar el snapshot posterior con Auth real: sigue vigente la guarda `auth_user_count = 0`.

```powershell
$env:PGLITE_PACKAGE_DIR = 'C:\ruta\node_modules\@electric-sql\pglite'
node scripts/rehearse-supabase.mjs .private-backups/local-validation/flows .private-backups/local-validation/flows/clinic-setup-plan.json --flows
```

Restaura y valida antes de llamar a los handlers reales de citas, pagos, bonos, facturas y revisión. `test-clinic-flows.mjs` bloquea fetch, usa una cuenta Auth ficticia en memoria y un adaptador limitado para consultar el PostgreSQL restaurado. Verifica conflictos de solicitudes, cancelación, céntimos, consumo de sesiones, protección de cobros/facturas, permisos y rollback sobre fixtures técnicos, sin aprobar planes reales. Guarda `flow-verification.json` al pasar. No acredita PostgREST, concurrencia entre conexiones reales, escrituras desde navegador, generación IA ni entrega real.

El ensayo cubre también alta/edición/baja lógica de pacientes y creación/edición/borrado de notas. Incluye 32 notas ficticias para comprobar selección de las últimas 30 y resumen vacío al borrar la última. Autor derivado de sesión; no usa IA externa. Ficha y evolución ignoran la caché longitudinal antigua y calculan al leer con RLS. Auditoría de pacientes/notas sigue separada y tolera errores; no declarar trazabilidad completa de producción.

Para ensayar los formularios, `--browser-records` restaura/asigna la copia y mantiene en memoria un servidor de pacientes/notas en 127.0.0.1:3002 hasta Ctrl+C. Reutiliza `local-query-client.mjs`; bloquea red externa, usa Auth ficticio y devuelve 503 en módulos ajenos al ensayo. Configurar un frontend local separado en 4322 con `PUBLIC_BACKEND_URL` y `PUBLIC_SUPABASE_URL` apuntando a 3002, y `PUBLIC_SUPABASE_ANON_KEY=local-public-fixture`; no modificar `.env` real. Credenciales exclusivamente ficticias del ensayo: `qa-browser@example.invalid` / `local-fixture-only`. Nunca desplegar este servidor de pruebas ni usar sus credenciales fuera de localhost.

Verificados desde navegador: alta/edición, nota EVA 0, edición móvil EVA 3, cancelación/Escape y borrado de esa nota. Comprobar tanto UI como SQL/API; los toasts por sí solos no acreditan persistencia. Evidencia privada en `browser-records-receipt.json` y capturas de `.private-backups/local-validation/`. No equivale a Supabase Auth/PostgREST reales ni a una prueba completa de producción. Regresión ejecutable del diálogo: `node scripts/test-confirm-dialog.mjs`.

### Criterio de facturación: España y Terrassa

Investigación del 7 de octubre de 2026. Se adopta para Carla JL el cobro como **precio final** y la **exención de fisioterapia sanitaria**: diagnóstico, prevención o tratamiento por profesional sanitario. La finalidad del servicio determina la exención; no extenderla automáticamente a estética, bienestar o actividades ajenas al tratamiento. Base legal: [Ley del IVA, art. 20.Uno.3º](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740#a20) y [AEAT: operaciones sanitarias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2021/capitulo-3-entregas-bienes-servicios-profesionales/entregas-bienes-servic-realizadas-empresarios-profesionales/operaciones-exentas/exenciones-operaciones-interiores/exenciones-operaciones-medicas-sanitarias.html).

En Cataluña las tarifas al consumidor deben expresar el precio completo con tributos incluidos. Cobrar 55 EUR por una sesión sanitaria implica factura de 55 EUR exenta; cobrar 121 EUR por un servicio sujeto al 21% implica base 100 EUR y cuota 21 EUR. No añadir el impuesto de nuevo a un cobro ya registrado. [Agència Catalana del Consum](https://consum.gencat.cat/ca/el-consum/abans-de-la-compra/preus-preu-total-i-complet-/).

Referencias públicas, sin pretender una encuesta representativa ni fijar tarifas de la clínica:

| Centro de Terrassa | Primera visita | Seguimiento | Bono de 5 |
| --- | --- | --- | --- |
| [Kion](https://kion.cat/terrassa/) | 60 EUR | 55 EUR | 250 EUR |
| [Physeo Clinic](https://physeoclinic.com/fisioterapeuta-terrassa) | 60 EUR | 55 EUR | 250 EUR |

El programa guarda cobros pendientes de factura por separado y marca la factura como pagada al incluir esos cobros. La exención incluye su referencia legal, como exige el [contenido de facturas de AEAT](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2023/capitulo-10-obligac-formales-suj-registro/obligaciones-materia-facturacion/contenido-general-facturas-ordinarias.html). No mezcla tratamientos fiscales dentro de una factura: seleccionar cobros homogéneos y aplicar su tipo correcto; clasificación por servicio y facturas mixtas quedan pendientes si la clínica ofrece otros servicios.

**No listo para emitir facturas fiscales reales:** faltan identidad/NIF/domicilio del emisor persistidos, rectificativas y adaptación SIF. El PDF y la numeración correlativa no bastan para acreditar cumplimiento. Según la [AEAT](https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2025/diciembre/3/ampliacion-plazo-adaptacion-sistemas-informaticos-facturacion.html), adaptación antes del 1 de enero de 2027 para obligados que presentan Impuesto sobre Sociedades y antes del 1 de julio de 2027 para el resto de obligados. Confirmar encaje fiscal de Carla JL antes de uso real; no se ha declarado ni activado VERI*FACTU.

### Vista previa de lectura de la clínica

La revisión del 7 de octubre utilizó frontend `127.0.0.1:4321` y backend `127.0.0.1:3001`, con `HOST=127.0.0.1`. El backend conserva `0.0.0.0` como valor predeterminado para contenedores. El lanzador privado `.private-backups/preview-local.mjs` elimina las variables de integraciones y restringe fetch a GET/HEAD de PostgREST y lectura del usuario en el proyecto autorizado; bloquea también escrituras de auditoría. No usarlo como configuración de producción ni como prueba de creación/aprobación/envío.

Comprobaciones locales adicionales desde la raíz:

```powershell
node scripts/test-frontend-auth.mjs
node scripts/test-appointment-context.mjs
```

Las lecturas de Calendar fallidas/incompletas conservan las citas CRM; la sincronización explícita responde con error. Una respuesta válida con `events: []` sigue siendo una lectura autoritativa vacía. Verificar configuración y destinos antes de activar Calendar o mensajería.

### Requisitos
- Node.js 20+
- PowerShell (Windows) o Bash (Linux/macOS)
- Archivo `.env.local` en la raíz con las credenciales requeridas.

### Inicio Rápido
```bash
# Frontend (puerto 4321)
cd frontend
npm run dev

# Backend (puerto 3001)
cd backend
npm run dev
```

### Scripts de Apoyo en `scripts/`
- `powershell -ExecutionPolicy Bypass -File scripts/check-secrets.ps1`: Verifica que `.env.local` contiene todas las claves requeridas.
- `powershell -ExecutionPolicy Bypass -File scripts/doctor-windows-workspace.ps1`: Diagnóstico del entorno de desarrollo local.

## Build & Validation

Ejecutar siempre antes de hacer commit o desplegar:

```bash
# Validación Backend
cd backend
npm run lint
npm test

# Validación Frontend
cd ../frontend
npm run check
npm run build
```

Desde la raíz, después de instalar las dependencias del frontend, ejecutar también `node scripts/test-frontend-auth.mjs`. Verifica el módulo real de autenticación con dobles locales de la API, sin peticiones a servicios externos.

## Environment Variables

### Backend (`backend/.env` o variables de hosting)
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
FRONTEND_URL=https://crm.tudominio.com
INTERNAL_API_KEY=<secreto-interno-min-32-chars>
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_BOT_USERNAME=<bot-username>
TELEGRAM_WEBHOOK_SECRET=<webhook-secret>
N8N_BASE_URL=https://n8n.tudominio.com
N8N_API_KEY=<n8n-api-key>
N8N_WEBHOOK_SECRET=<n8n-webhook-secret>
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_EMAIL=<service-account@iam.gserviceaccount.com>
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CALENDAR_ID=<calendar-id>
```

### Frontend (`frontend/.env` o variables de hosting)
```env
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
PUBLIC_BACKEND_URL=https://api.tudominio.com
```

## Database & Migrations

### Migración de Producción
1. Conectar a Supabase Cloud (SQL Editor).
2. Ejecutar los scripts de verificación previa (no destructivos):
   - `database/preflight/preflight_01_tablas_columnas.sql`
   - `database/preflight/preflight_02_estado_entorno.sql`
3. Aplicar el script de endurecimiento:
   - `database/migrations/20260901_production_security_hardening.sql`
   *(Habilita RLS en tablas `crm_*`, crea políticas de aislamiento y tabla `crm_audit_log` restringida a `service_role`).*

## Deployment (EasyPanel / VPS)

### V2: preparación de la migración de clínicas

Este incremento no está listo para producción. Preparar primero una copia de pruebas y una copia de seguridad. No ejecutar automáticamente migraciones ni sustituir datos del proyecto activo.

1. Confirmar que el esquema CRM y `20260901_production_security_hardening.sql` están aplicados. No volver a ejecutar el endurecimiento antiguo después de la migración nueva: reinstalaría políticas anteriores.
2. Aplicar `database/migrations/20261007091159_clinic_isolation.sql` en el entorno de pruebas.
3. Crear los centros y mapear explícitamente `crm_perfiles.clinica_id` y, cuando corresponda, `profesionales.clinica_id` con un rol administrativo del servidor. No se asignan todos los datos existentes a una clínica por defecto.
4. Mapear `crm_pacientes.clinica_id`, con su creador perteneciente al mismo centro; después, `crm_asignaciones_fisio_paciente.clinica_id`. Las claves foráneas rechazan relaciones cruzadas. Revisar también la coherencia de las relaciones clínicas heredadas.
5. Cuando no queden registros pendientes, validar las restricciones `crm_profiles_clinic_required`, `crm_patients_clinic_required` y `crm_assignments_clinic_required` con `ALTER TABLE ... VALIDATE CONSTRAINT ...`. Hasta entonces los registros antiguos sin clínica permanecen ocultos, conservados en la base de datos.
6. Probar la clínica del usuario con sesiones reales: listas, alta de paciente, ficha, agenda y reservas públicas con `professional_id` explícito. Los enlaces antiguos sin profesional requieren actualización. El frontend debe usar una sesión real; `dev-token` ya no autoriza peticiones al backend. Se conservan las pruebas locales de aislamiento entre centros como protección existente.
7. Comprobar los destinos de las integraciones de esa clínica y resolver los bloqueos de `docs/STATUS.md` antes de autorizar un despliegue coordinado de base de datos, backend y frontend.

Prueba local de políticas sin servidor ni credenciales, desde la raíz del repositorio:

```powershell
# Ruta a una instalación existente de @electric-sql/pglite (verificada con 0.3.16).
$env:PGLITE_PACKAGE_DIR = 'C:\ruta\node_modules\@electric-sql\pglite'
node scripts/test-clinic-isolation.mjs
```

El script aplica los SQL reales a PostgreSQL en memoria y verifica también la revisión clínica. No conecta ni modifica Supabase Cloud. No sustituye las pruebas de Auth/PostgREST y de integraciones en el entorno de pruebas.

### Reservas públicas y concurrencia local

`--flows` aplica también `database/migrations/20261007214504_public_booking_retries.sql` y ejecuta `test-booking-retries.mjs` sobre la copia. El POST público exige `Idempotency-Key` UUID v4; backend/frontend y esta migración deben coordinarse antes de desplegar. El hash original se guarda junto a la cita y no se devuelve por la API de reserva. La columna ausente bloquea readiness y la consulta de recuperación ocurre antes de crear paciente/evento. Migración pendiente en Cloud; no ejecutarla sin autorización específica.

Para comprobar restricciones con conexiones independientes, ejecutar `scripts/test-appointment-concurrency.mjs` con `PG_PACKAGE_DIR` apuntando al paquete `pg` ya instalado en la caché y `POSTGRES_BIN` si se usa otra instalación. Por defecto usa PostgreSQL 18 en `C:/Program Files/PostgreSQL/18/bin`, una carpeta nueva en `.private-backups/local-validation/`, usuario ficticio y puerto local 54339. Aplica tabla, índice y exclusión reales de los SQL del proyecto; solo datos sintéticos. Espera bloqueos observados en `pg_stat_activity`, comprueba rechazo de inserción/edición/clave repetida y detiene su instancia al finalizar. No instalar dependencias ni conectar a Cloud para esta prueba. Referencia: [restricciones de rangos de PostgreSQL](https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT).

La recuperación web conserva en sessionStorage una clave UUID por profesional, escrita antes de reservar y eliminada al iniciar explícitamente otra cita. Recargar consulta el POST /public-booking/recovery con Idempotency-Key en cabecera, sin reenviar el guardado. Devuelve solo horario, estado e identificador, sin caché; un resultado desconocido o fallo de lectura no demuestra que otro proceso haya terminado. No usarlo para crear otra cita automáticamente. No persiste contacto ni motivo; cerrar la pestaña, borrar datos o cambiar navegador puede perder la referencia. Véase [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage). Calendar no comparte transacción con PostgreSQL: aunque se proteja una cita guardada de cancelaciones equivocadas, pueden quedar eventos o pacientes sin cita tras fallos/carreras. Comprobar reconciliación y los puentes reales antes de producción. La prueba nativa se hizo con PostgreSQL 18.3 y no certifica versión/índices Cloud. El [aviso actual de Supabase](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) sobre btree_gist concierne a columnas float con NaN; la exclusión de citas de este repositorio utiliza UUID y timestamptz, por lo que no corresponde a ese caso.

### V2: preparación de la revisión clínica

Después de la migración de clínicas, validar en una copia de pruebas `database/migrations/20261007094023_clinical_approval_integrity.sql` con el backend y frontend de este incremento.

- La migración recupera el último informe guardado en comunicaciones como borrador y añade versión. **Todos los planes antiguos aprobados/enviados requieren una revisión nueva**, porque no se puede acreditar que su contenido haya permanecido intacto. Registra el estado y firma anteriores en auditoría; no elimina comunicaciones ni ejercicios.
- Si un plan histórico no tiene informe persistido, debe generarse una propuesta nueva antes de aprobarlo. Comprobar la apertura/revisión de los planes históricos en el flujo real del CRM antes del despliegue.
- `/review` exige sesión de profesional y `report_version` vigente; `/draft` recibe la versión dentro de `report`. Cambios concurrentes responden 409. Las automatizaciones con clave interna no pueden sustituir la revisión humana.
- `/follow-up` rechaza `estado` y `recommendation_state`; registra observaciones, adherencia y dolor. El estado del formulario es de solo lectura.
- `/reports/pdf` requiere `recommendation_id`; el paciente opcional debe coincidir con el registro. `/patient-report/send` exige además `patient_id` y su vínculo Telegram guardado. Ejercicios, pautas, texto al paciente y nombre se obtienen del informe persistido, no de la petición. Los overrides `chat_id` no se admiten para estos envíos.
- Verificar `GET /api/health/readiness`: el control `exercise_approval` comprueba columnas de contenido y revisión. Si falta la migración, responde readiness 503 aunque exista `crm_recomendaciones`.
- Probar primero `dry_run` en el entorno autorizado. Los envíos reales al paciente y los cambios en Supabase/EasyPanel requieren autorización explícita para ese destino.

### Configuración General

Para el piloto OpenWA y las reservas compartidas de Telegram, seguir [PILOTO_MENSAJERIA.md](PILOTO_MENSAJERIA.md). La migración de mensajería ya está aplicada en el proyecto autorizado; en un entorno nuevo se aplica después de las otras dos V2. Los flags siguen desactivados. No cambiar el número, bot o calendario productivos para probarlo.

- **Repositorio**: `git@github.com:raulruizproyectos/Fisio_IA_Agent.git` (usar Deploy Key SSH en EasyPanel).
- **Rama productiva**: `main`.
- **Servicio Frontend**:
  - Nombre: `fisio-frontend`
  - Build Path: `frontend` (sin barra inicial)
  - Método: Dockerfile
  - Puerto: `80`
  - Healthcheck: `/health`
- **Servicio Backend**:
  - Nombre: `fisio-backend`
  - Build Path: `backend` (sin barra inicial)
  - Método: Nixpacks (Node 20)
  - Comando de inicio: `node src/index.js`
  - Puerto: `3001`
  - Healthcheck: `/health` o `/api/health`

### Verificación Post-Despliegue
1. `GET /api/health`: Debe responder `{"status":"ok"}` con código 200.
2. `GET /api/health/readiness`: Requiere Bearer profesional verificado, cookies profesionales con cabecera CSRF/origen válido o `x-internal-api-key: <INTERNAL_API_KEY>`.
3. Smoke visual: Acceder a `/` y verificar que el inicio de sesión o panel de demostración cargan correctamente sin errores de consola.
