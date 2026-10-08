# Changelog

## 2026-10-08 — Preparación de GitHub y testing en producción

- Precisión azul aceptada por ahora. EasyPanel/API HTTPS y dominios actuales comprobados; servicios aún en la versión del 20 de septiembre. Pendientes: copia nativa actual y cinco migraciones, configuración/deploy autorizados y pruebas con proveedores reales.
- Docker frontend excluye archivos `.env*` y usa instalación estricta del lockfile. CI elimina una clave placeholder incompatible con las guardas actuales, usa `npm ci` y verifica CSP/runtime/saludo y ausencia de secretos cliente.
- Backend lint/100 pruebas, frontend check/build y regresiones CSP/configuración/runtime pasan. Estado y recorrido operativo en `PRODUCTION_TESTING.md`; actualización GitHub mediante rama/PR, sin fusionar ni desplegar automáticamente.

## 2026-10-08 — Precisión azul elegida e implementada

- Dirección visual seleccionada por el usuario: tokens, shell, navegación y superficies comunes; acceso/reserva en azul; animaciones discretas y movimiento reducido. Formularios de pacientes fuera del flujo, controles táctiles y notas a 16 px, menú sobre el dock, encabezados adaptables y ruta superior actual.
- Contratos DOM preservados; controles Auth/reserva/Calendar/aprobación sin modificación. Chrome 46 estados a 375/768/1280, sin overflow/JS/red externa; fixtures aislados y dobles vacíos documentados. Frontend check/build y regresiones afectadas pasan; backend lint/100 pruebas pasan.
- DESIGN/AGENTS reconciliados y exploración histórica conservada. Sin dependencias nuevas, SQL Cloud, despliegue, mensajes reales, commit ni push. Proveedores reales y revisión completa en dispositivo físico pendientes.

## 2026-10-08 — Sesión HttpOnly y recuperación en backend

- Login/renovación/cierre/reset pasan por rutas Auth con límites, cookies HttpOnly/Secure/SameSite/host-only, CSRF y no-cache. Auth/perfil/clínica verificados en servidor bajo RLS; Bearer de integraciones conservado. Lecturas incompletas/fallos no acreditan sesión ni se repiten escrituras clínicas; renovación concurrente acotada a una instancia.
- Recuperación PKCE con verifier HttpOnly y código eliminado de URL; cambio de contraseña valida en servidor y no elimina sesión ante rechazo de política. Logout incierto conserva cookies y muestra aviso. Frontend elimina el token legado del proyecto, usa cookies y deja de publicar incluso la clave pública Supabase.
- Backend lint/100 pruebas, frontend check/build, regresiones Auth/agenda/reserva, CSP/runtime/scanner y Chrome sobre build/SQL local pasan. Clínica/Auth/Calendar ficticios, red externa bloqueada. Sin SQL/dependencias nuevos, Cloud, envíos, commits, push ni despliegue. Web/API deben compartir sitio HTTPS; proxy, provider Auth/límites y presupuesto siguen pendientes de verificación autorizada.

## 2026-10-08 — Conexiones CSP con prioridad runtime/build

- Nginx limita connect-src a self y orígenes backend/Supabase efectivos. Build guarda defaults de URLs fuera del HTML; runtime los sustituye. URLs inseguras y claves públicas con comillas/prefijo vacío rechazadas antes de publicar.
- 33 casos runtime, hook del build, guardas, backend lint/90 pruebas, frontend check/build, reserva 16 regresiones y scanner pasan. Chrome con clínica ficticia verifica flujos y bloqueo de una conexión ajena antes del transporte.
- Solo local, sin dependencias/SQL nuevos ni acciones externas. Envsubst doble local; nginx/proxy/proveedores reales pendientes. Imágenes externas/fallbacks conservados y modo CLI personalizado sin ensayo e IPv6 no admitido.

## 2026-10-08 — CSP del build y permisos del navegador

- CSP nativa antes de scripts en cuatro páginas; hashes/código propio sin eval/handlers inline, objetos/base/frames/workers bloqueados. Controladores Layout/reserva empaquetados y dos botones usan listeners. Estilos dinámicos conservados; destinos API/Storage runtime aún sin allowlist.
- Nginx complementa con frame-ancestors y Permissions-Policy en cada location, permitiendo micrófono propio. Backend lint/90 pruebas, frontend check/build, 16 regresiones de reserva, agenda/Auth/guardas, scanner y nueva regresión del HTML pasando.
- Chrome con clínica/Auth/Calendar ficticios verifica login, alta vacía, validación reset, Calendar/recarga, reserva/recuperación y ataques bloqueados en build; móvil 375 px sin desbordamiento. Solo local, sin SQL/dependencias nuevos ni acciones externas. Nginx/proxy, servicios reales y micrófono físico no acreditados.

## 2026-10-08 — Ocultar diagnósticos públicos y autorizar trabajos desde caché

- Mensajes seguros de producción en errores técnicos globales, financieros, readiness, Calendar, ejercicios y respuestas Telegram afectadas, incluso HTTP 200/4xx. Conservados estados/códigos y mensajes de negocio controlados; fallos SQL de lectura no simulan ausencia.
- Poll de trabajos IA verifica paciente con RLS en cada consulta, también desde caché y tras cambios de clínica; sin paciente exige su profesional. Diez regresiones reproducen filtraciones y cubren denegaciones/fallos.
- Backend lint/90 pruebas, frontend check/build, acción/metadatos de agenda y ensayo SQL restaurado pasan. Solo local, sin SQL/dependencias nuevos ni acciones externas; logs/objetos históricos y despliegue real pendientes.

## 2026-10-08 — Recuperar Calendar con evidencia y reforzar seguridad local

- Lectura profesional de altas con ID perdido, cambios/cancelaciones. Evidencia exacta/única y CAS recuperan vínculo; ausencia, lectura incompleta, errores o peticiones en curso conservan bloqueo. Migración local token/calendario/en curso, sin replay.
- Acción/aviso en agenda web/móvil/detalle; 44 px, doble clic, versión y contexto protegidos. Navegador ficticio y SQL independiente verifican bloqueo y vínculo persistido sin duplicados.
- Guardas de claves públicas, CORS explícito, límites IA/audio, inputs e identidad servidor, cabeceras nginx y dependencias sin avisos npm tras Astro 7.3.7. Los 16 puntos y gaps en `SECURITY_REVIEW_2026-10-08.md`.
- Backend lint/80 pruebas, frontend check/build, regresiones y SQL/concurrencia pasando. Solo local; sin Google/PostgREST/Cloud ni contenedor acreditados, mensajes, commits, push o despliegue.

## 2026-10-08 — Guardar citas antes de sincronizar Calendar

- Migración local de `calendar_sync_pending`; altas públicas/internas/agente y cambios guardan CRM antes de Calendar. Fallos externos o del vínculo posterior conservan la cita y muestran aviso. Otra modificación queda bloqueada hasta comprobar el evento; la recuperación verificada todavía está pendiente.
- Reconciliación protegida por marca y versión leída; referencia al ID real evita backfill duplicado tras respuesta perdida. Eliminada compensación de eventos: un INSERT/UPDATE rechazado no toca Calendar. Readiness exige la nueva columna.
- Backend lint/69 pruebas y frontend check/build correctos; regresiones de agenda/reserva, handlers con SQL restaurado y Calendar ficticio, y concurrencia PostgreSQL con conexiones independientes pasando. Solo local; sin prueba de Google/PostgREST ni despliegue.

## 2026-10-08 — Calendar no repite una escritura incierta por otro transporte

- Eliminado el failover automático de cuenta de servicio a W6 tras una mutación fallida/incompleta. Reintentos SDK desactivados y timeout de 10 segundos en las tres acciones; ausencia 404/410 admite cancelación ya realizada.
- Validación estricta de confirmaciones W6 y del identificador de creación directa. Dos regresiones reproducen el fallo anterior y cubren ambos transportes sin red externa; backend lint/68 pruebas y frontend check/build correctos.
- Solo local, sin migraciones ni cambios n8n. Pendientes coherencia transaccional CRM/Calendar, operaciones simultáneas y comprobación de integraciones reales.

## 2026-10-08 — Recuperar una reserva después de recargar

- Clave temporal en `sessionStorage`, sin datos personales; endpoint de consulta acotado a profesional/clave pública, sin escritura y sin caché. «Comprobar reserva» consulta en vez de reenviar; recargar confirma el horario guardado o mantiene bloqueada otra reserva si el resultado es incierto/cambiado.
- Fallos de almacenamiento impiden perder una solicitud pendiente; el inicio explícito de otra cita limpia la clave de una confirmación. Dieciséis regresiones de interfaz, ensayo SQL, backend lint/66 pruebas y frontend check/build correctos; recarga probada en navegador móvil/escritorio con API ficticia.
- Sin nueva migración ni despliegue. Cerrar/borrar almacenamiento puede perder la clave; Calendar, solicitudes simultáneas aún en curso y pruebas reales de Auth/PostgREST siguen pendientes.

## 2026-10-07 — Reservas públicas recuperables y concurrencia PostgreSQL comprobada

- Clave UUID por solicitud pública, hash del cuerpo persistido con la cita y recuperación antes de generar efectos. Respuesta perdida o incompleta conserva formulario/clave y ofrece comprobación manual; cambios/cancelaciones anteriores no generan otra cita. Conflictos tardíos responden 409 y no exponen citas de otros pacientes.
- Reutilizados exclusión de horarios e índice único; prueba con conexiones PostgreSQL independientes verifica inserciones/ediciones, límites contiguos y cancelación. Compensación Calendar compartida no cancela ante transporte incierto ni borra eventos ya vinculados. Backend lint/65 pruebas, nueve regresiones de interfaz, ensayo SQL y frontend check/build correctos.
- SQL nuevo solo local; pendiente migrarlo con autorización y validar PostgREST/Calendar reales, eventos/pacientes huérfanos y recuperación entre recargas. EasyPanel sigue aparcado.

## 2026-10-07 — Reserva pública: estados de fecha y envío coherentes

- Respuestas de horarios fuera de orden no cambian la fecha activa; fallos de consulta no simulan un día sin disponibilidad. Selección explícita de hora y controles bloqueados durante el envío impiden dobles peticiones en curso. Confirmación del horario enviado, foco accesible y reinicio sin datos anteriores.
- Aviso de conflicto conservado tras actualizar horarios, formulario preservado ante rechazo y estilos de botones dinámicos recuperados con selectores globales limitados al contenedor. Regresiones del script real y navegador local a 1280/375 px con API ficticia; backend lint/63 pruebas y frontend check/build correctos.
- Sin cambios del backend ni de Cloud. Pendientes persistencia/Calendar reales, concurrencia SQL y recuperación de citas tras respuesta perdida; esta mejora de interfaz no acredita idempotencia de reservas.

## 2026-10-07 — Notas clínicas legibles y feedback visible en móvil

- Resumen, tendencia EVA e historial con superficies claras y texto clínico de 16 px que conserva párrafos. Editor ampliado, acciones de 44 px, foco visible y guardado coral con texto oscuro; formulario adaptable sin alterar sus IDs ni comportamiento.
- Estilos globales de avisos recuperados tras la extracción de componentes: quedan sobre el dock, con cierre accesible. Errores/advertencias persisten hasta cierre; éxito/información caducan. Regresión ejecutable del feedback real y validación visual de 1280/375 px, historial vacío y respuesta perdida con reintento sin duplicados en SQL local.
- Backend lint/63 pruebas, frontend check/build y regresiones de ficha/recuperación correctos. Referencias Sleek y páginas oficiales de CRM orientan jerarquía y lectura; no se instala REA ni se añaden dependencias. Sin despliegue ni cambios Cloud.

## 2026-10-07 — Recuperación de altas tras perder la respuesta

- Identificadores por operación conservados en la pestaña permiten reintentar pacientes/notas sin duplicar filas ni auditoría, incluso tras recargar. Cambios del borrador recuperan el registro original para editarlo; no se recrean notas eliminadas. Alta y auditoría comparten transacción; no hay fallback a INSERT al fallar la RPC.
- Nueva migración local pendiente de Cloud; readiness detecta su ausencia. Navegador a 1280/375 px con respuesta destruida después de persistir y verificación SQL independiente; regresiones de helpers/handlers reales. Backend lint/63 pruebas, frontend check/build y ensayo SQL correctos. Auth/PostgREST reales y conexiones independientes pendientes; auditoría de ediciones y altas antiguas no cambia.
- Desempate por creación/ID para notas a la misma hora; resumen, tendencia e historial coherentes. Referencias Sleek/REA documentadas; REA no instalado. EasyPanel aparcado, sin efectos externos.

## 2026-10-07 — Guardados protegidos frente a cambios de ficha y recargas fallidas

- Respuestas de guardado conservan paciente/versión y respetan borradores abiertos después; recargas de notas fuera de orden no sustituyen datos más recientes. Voz invalida captura/transcripción/síntesis anteriores al cerrar o cambiar de ficha; mapa limpia su selección al cambiar de paciente.
- Escritura confirmada con lectura fallida muestra notas como pendientes de recarga, sin resumen/tendencia antiguos y con aviso de no repetir el guardado. Datos personales usan campos devueltos por el servidor, conservan el resumen clínico y actualizan el nombre visible sin otra lectura obligatoria.
- Regresión ejecutable de handlers reales y prueba de navegador/HTTP/SQL local con fallos controlables: un guardado con recarga fallida y otro con respuesta retenida pertenecen a A, mientras B conserva su borrador. Backend 61/61, lint y frontend check/build correctos. Prueba EasyPanel aparcada; sin despliegue ni cambios Cloud. Desconexión antes de confirmar escritura e idempotencia siguen pendientes.

Registro consolidado de checkpoints técnicos y funcionales del proyecto Fisio Clinical.

## 2026-10-07 — Guardados de interfaz en copia local

- Alta/edición de paciente y creación/edición/borrado de notas probados desde navegador con routers reales, SQL/RLS y Auth ficticio. EVA cero, autor, persistencia, cancelación y resumen vacío verificados con consulta independiente; PostgREST real sigue pendiente.
- Corregidos botones cubiertos por navegación móvil y eventos de confirmación sin receptor. Diálogo compartido abre/cierra, conserva foco, restringe Tab y admite Escape; acciones de notas con nombres accesibles y fecha/hora coherente.
- Adaptador SQL reutilizado en `--flows` y `--browser-records`, sin red externa ni servicios nuevos. Backend lint/61 pruebas, frontend check/build, regresión de diálogo y ensayo SQL pasando. Sin cambios Cloud, despliegue o mensajes.

## 2026-10-07 — Pacientes y notas: integridad de guardado local

- Corregido fallo RLS de INSERT/RETURNING en alta: UUID de servidor, alta sin representación inmediata y ninguna eliminación compensatoria ante fallo de asignación adicional. Validación de edición y baja lógica con errores comprobados; anonimización parcial bloqueada, sin modificar datos.
- Autor de notas derivado de sesión, EVA/fechas/texto validados y 404 para cambios inexistentes. Resumen determinista leído con RLS de las últimas 30 notas; edición/borrado se reflejan al consultar y la última nota borrada vacía el resumen. Retirado trabajo privilegiado en segundo plano.
- Formularios de datos/notas visibles, bloqueo de doble clic, protección frente a respuestas antiguas y recarga compartida con aviso específico si persistencia funciona pero refresco falla.
- Backend lint y 61/61 pruebas, frontend check/build y ensayo SQL sobre copia local. Sin escrituras Cloud, despliegue ni mensajes. Auditoría atómica, anonimización completa y guardado de navegador/PostgREST pendientes.

## 2026-10-07 — Bonos y facturas corregidos en local

- Consumo de sesiones y emisión de facturas trasladados a operaciones SQL atómicas. Cobros vinculados una sola vez, numeración anual serializada, registros emitidos protegidos y auditoría con rollback. Migración financiera pendiente de autorización/aplicación Cloud; readiness detecta su ausencia.
- Fisioterapia sanitaria exenta por defecto y cobros tratados como importes finales; para servicios sujetos se extrae el IVA incluido. Selección muestra solo cobros sin facturar y PDF incluye motivo de exención. Investigación primaria AEAT/Consum y tarifas publicadas en Terrassa documentadas en OPERATIONS; no se fijaron precios de Carla JL.
- Backend lint y 56/56 pruebas; ensayo de handlers/SQL/RLS sobre copia local con conflictos, céntimos, permisos y rollback. Frontend check/build correctos. Sin facturas reales, cambios Cloud ni despliegue. Datos fiscales del emisor, rectificativas y SIF todavía pendientes.

## 2026-10-07 — Flujos de escritura comprobados en una copia local

- Handlers reales de citas, pagos y revisión ejecutados contra PostgreSQL/RLS restaurado con fixtures locales. Alta/cancelación, concurrencia, céntimos persistidos, versión/alertas, auditoría e inmutabilidad comprobados; ningún cambio clínico Cloud ni mensaje.
- Pagos validan importe, fecha y método tanto al crear como al editar; pago inexistente devuelve 404. Resumen y gestoría suman en céntimos. Calendar fallido/incompleto bloquea nuevas confirmaciones sin impedir consultar las citas CRM.
- Ensayo opcional `--flows` y recibo privado separados de las copias originales. Backend lint y 50/50 pruebas, frontend check/build y aislamiento SQL correctos. La prueba utiliza un adaptador de consultas y Auth ficticio: escritura desde navegador, IA y entregas reales siguen pendientes.

## 2026-10-07 — Acceso y lecturas de la clínica validados en local

- Cuenta real comprobada en la interfaz, agenda y ficha, en escritorio y móvil. Vista previa con escrituras/integraciones bloqueadas; sin cambios clínicos Cloud, despliegue o mensajes.
- Total de informes independiente de la paginación, nombre de clínica autenticada, EVA ausente explícita y exclusión de citas demo/pasadas en sesión real. Próximas citas calculadas con el mismo criterio en panel, directorio y ficha.
- Calendar sin configurar se muestra como desconectado; errores o respuestas incompletas del lector conservan las citas CRM y rechazan la sincronización en lugar de cancelarlas. Backend admite HOST para limitar la vista previa a localhost.
- Backend lint y 47/47 pruebas; frontend check/build y comprobaciones ejecutables de autenticación/próximas citas. Validación de escritura, integraciones y acabado visual completo pendientes.

## 2026-10-07 — Cuenta y base de la única clínica configuradas

- Autorización explícita ejecutada en `Fisio-IA-Agent`: cuenta Auth admin confirmada sin envío de correo, cuatro actualizaciones SQL y asignación a Fisioterapia Carla JL. Contraseña inicial exclusivamente en `.env.local`; sin commit, push, despliegue, cambio de plan o activación de mensajería.
- Copia nueva y ensayo completo previos. Conservación posterior de las 31 tablas fuente comprobada con JSON canónico PostgreSQL. Se mantienen 7 pacientes, 18 citas, 35 informes y fichas antiguas; diez eventos de auditoría y tres restricciones de clínica validadas.
- Login real y permisos Auth/PostgREST comprobados para pacientes, agenda, planes, pagos e historial. Identidad/rol/clínica protegidos y anon bloqueado; 22 comunicaciones sin paciente conservadas, ocultas por RLS. Advisors conserva cinco INFO de tablas internas y aviso de protección de contraseñas filtradas.
- Backend lint y 44/44 pruebas; frontend check/build correctos. Historial Cloud y recibos privados en OPERATIONS. Pendientes actualización de aplicación en EasyPanel y validación integral de interfaz e integraciones.

## 2026-10-07 — Preparación y ensayo de la cuenta/clínica

- Clínica y correo confirmados por el usuario; plan privado para administradora `Carla JL`. Cuenta Auth real todavía sin crear y ninguna asignación aplicada en Cloud.
- Preparada operación administrativa de una sola vez: conserva los IDs de perfiles/pacientes y propietarios existentes, asigna explícitamente cinco pacientes sin creador, vincula perfil CRM/profesional antiguo y valida restricciones. Diez eventos de auditoría dentro de la misma transacción; inventario diferente o repetición se rechazan.
- Ensayo sobre copia real: lectura de 7 pacientes, 18 citas, 35 planes y las fichas antiguas, conservación del resto del contenido, protección del perfil y bloqueo de sesiones sin vínculo/centro inactivo/anon. Verificado rollback total al fallar auditoría. Auth ficticio en memoria; login real y PostgREST pendientes. Comprobación Cloud de solo lectura confirma inventario sin cambios.

## 2026-10-07 — Copia del CRM y ensayo con datos reales completados

- Usado el acceso de gestión ya guardado para una exportación de solo lectura; no se cambió ninguna contraseña. Copia privada con SHA-256: estructura/datos de las 31 tablas públicas, permisos/políticas, funciones, secuencias, restricciones, índices/triggers, metadatos del bucket e historial. Excluye internos de Supabase, valores Vault y configuración externa; no hay cuentas Auth ni archivos Storage.
- Restauración local verificada fila por fila y políticas/permisos restaurados. Endurecimiento `20260901` y las tres migraciones V2 pasan sobre la copia real; se conservan registros y se recuperan los 35 informes. Comprobada exclusión de citas y conservación/ocultación de datos pendientes de asignación a clínica.
- Scripts reutilizables `backup-supabase.mjs` y `rehearse-supabase.mjs`; manifiesto y comprobaciones guardan el alcance y hashes ensayados. Auth/Vault locales son fixtures vacíos; Auth/PostgREST y flujos externos siguen pendientes. Sin cambios Cloud, instalación de dependencias ni despliegue.

## 2026-10-07 — Preparación de copia y preflight de datos

- Consultas agregadas de solo lectura: 7 pacientes, 18 citas, 35 recomendaciones con informe guardado, un perfil sin cuenta Auth existente y ningún solapamiento detectado. 34 planes siguen en el estado antiguo `generada`; uno requiere revisión, ninguno está aprobado/enviado.
- Preparado backup nativo con PostgreSQL ya instalado, validación del destino y TLS, checksum/listado y exportaciones excluidas de Git. Prueba de validación pasando; el comando se detiene al faltar `SUPABASE_DB_URL`. Solo se guardó el historial de migraciones, que no es una copia de datos.
- Copia completa y ensayo de restauración/migraciones pendientes de la conexión PostgreSQL. Sin escrituras Cloud, despliegues, cambios de plan ni instalaciones.

## 2026-10-07 — Restricción de Vault autorizada y verificada en Cloud

- Aplicado exclusivamente `vault_server_only` en `Fisio-IA-Agent`, registrado por Supabase como versión `20261007111313`; contenido local revisado en `20261007110637_vault_server_only.sql`.
- Verificación SQL: ejecución denegada a `anon`/`authenticated`, permitida a `service_role`; hash de la definición sin cambios. Advisors ya no incluye avisos de Vault; los avisos restantes siguen pendientes.
- Repetida prueba SQL local con datos ficticios antes de aplicar. No se leyeron secretos, no se modificaron registros clínicos ni se desplegó la aplicación; organización confirmada en plan Free. Las tres migraciones funcionales V2 continúan sin aplicar.

## 2026-10-07 — Reactivación autorizada de Supabase y revisión de solo lectura

- Reactivado `Fisio-IA-Agent`; estado final `ACTIVE_HEALTHY`, organización todavía Free. Sin cambios de plan, datos, claves o despliegues.
- SQL y Advisors confirman el esquema anterior, 14 migraciones registradas, V2 pendiente, ausencia de exclusión de citas y permisos incompletos. No se consultaron registros clínicos ni valores de Vault.
- Confirmado acceso `anon`/`authenticated` a `vault_read_secret(text)` sin validación de sesión. Preparada corrección mínima `20261007110637_vault_server_only.sql`, aún sin aplicar. Conserva el acceso de servidor requerido por el script existente.
- Añadida prueba SQL con secreto ficticio: reproduce el acceso previo, deniega ambos roles tras la corrección y mantiene `service_role`. El parche no requiere las tablas opcionales ausentes del preflight antiguo.

## 2026-10-07 — Alcance simplificado: clínica del usuario

- Se conserva el CRM actual para una sola clínica, con sus permisos y aprobación profesional. Se aplaza la comercialización y la configuración de varios centros; no se sustituye Supabase ni se reconstruye el producto.
- Consulta de metadatos Supabase: `Fisio-IA-Agent`, organización Free, proyecto `INACTIVE`, PostgreSQL 17.6 declarado. Sin acceso a tablas de pacientes ni SQL ejecutado.
- Actualizados STATUS, OPERATIONS, arquitectura y guía del piloto con el orden de recuperación, copia de seguridad y comprobaciones. Añadidas variables vacías y flags del piloto desactivados a `.env.example`.
- Ningún servicio reactivado, cambio de plan, migración aplicada, commit/push, despliegue o conexión de números/bots.

## 2026-10-07 — Piloto OpenWA y reservas compartidas (local)

- Seleccionado OpenWA solo para piloto. Conector sin dependencias nuevas, apagado por defecto, con clínica/profesional/sesión explícitos. Webhook HMAC sobre cuerpo original, sin bypass por clave interna.
- Invitaciones temporales de un uso, consentimiento, baja y teléfono WhatsApp tomado del paciente. Tablas de vínculos/eventos/envíos con RLS de lectura y escritura reservada al servidor.
- Reservas guiadas de pacientes registrados por Telegram y WhatsApp: mismos horarios/creador de citas, selección con versión, confirmación explícita, deduplicación persistida y fechas relativas de Madrid. No se añade conversación libre IA ni alta/cambios/cancelaciones automáticos en esta fase.
- Planes aprobados en PDF vía WhatsApp y botón en el resumen del paciente. Aceptación separada de entrega; recibos adelantados reconciliados, estados sin regresión y operaciones inciertas bloqueadas para revisión manual.
- Preparada migración `20261007101248_messaging_pilot.sql`; probado SQL real con aislamiento, claves foráneas, deduplicación, confirmación con versión y exclusión entre canales. Guía de montaje en `PILOTO_MENSAJERIA.md`.
- Backend lint y 44 pruebas pasando. Frontend check/build. Sin validación visual ni contra proveedores reales; ninguna migración aplicada, servicio desplegado, número conectado o mensaje real enviado.

## 2026-10-07 — Revisión clínica y entrega de contenido persistido (local)

- Cerrada la modificación de estado mediante seguimiento y la aprobación directa de Supabase. RPC con permisos, versión, ejercicios/alertas y auditoría atómica; informe y ejercicios aprobados inmutables.
- El borrador completo y sus pautas editadas se guardan en la recomendación. PDF y Telegram leen ese contenido y la identidad del paciente del servidor; no aceptan ejercicios, mensaje ni destino sustituidos desde el navegador.
- Solo se registra entrega después de confirmar el documento en Telegram. Fallo de registro posterior se devuelve como aviso de entrega confirmada, sin repetir el envío. Borradores del bot profesional quedan como texto pendiente de revisión, sin PDF.
- Imágenes del catálogo/media con firma renovada; fetch de PDF evita enviar claves a dominios que solo coinciden por prefijo y no sigue redirecciones.
- Preparada migración `20261007094023_clinical_approval_integrity.sql`: exige nueva revisión de aprobaciones antiguas y conserva su traza anterior. Readiness detecta columnas ausentes.
- Verificado: backend lint y 33/33 pruebas; SQL real en PGlite con aislamiento de clínicas, revisión, inmutabilidad y rollback si falla la auditoría; frontend check/build. No aplicada en Supabase Cloud ni desplegada; ningún envío real.

## 2026-10-07 — Base local de V2 con aislamiento por clínica

- Plataforma compartida: clínica activa en sesión, RLS por centro, administrador limitado a su centro y protección de asignaciones/propietarios con claves foráneas compuestas.
- Conservación de registros anteriores sin asignar automáticamente su propiedad. Desactivado el acceso privilegiado de desarrollo mediante `dev-token`.
- Alta de pacientes y reservas públicas con clínica derivada del profesional; búsqueda de pacientes y contacto del centro sin selección global por defecto.
- Catálogo real de pacientes sin sustitución por datos demo ante listas pequeñas o errores. Demostración únicamente en desarrollo y con activación explícita.
- Reparación de la versión bundled de `@emnapi/wasi-threads` en el lockfile; `npm ci --offline` vuelve a completar una instalación limpia.
- Corregidos tipos y selección de los filtros clínicos y del orden por EVA del directorio existente, sin cambiar sus contratos DOM.
- Verificado: backend lint y 26/26 pruebas; SQL real en PostgreSQL en memoria con dos clínicas; frontend Astro sin errores/avisos/hints y build de cuatro páginas. Prueba del módulo real de autenticación: demo bloqueada en producción, localhost exige sesión y clínica recibida del backend.
- Migración no aplicada en Supabase Cloud; ningún despliegue realizado.
- Pendientes de producción registrados en `docs/STATUS.md`; los checkpoints anteriores son históricos y no acreditan la seguridad actual.

## [checkpoint-2026-09-19-p0-recovery] — P0 Product Recovery & Release Hardening (Supersedes 0188ec4 & 1b570b0)

### Fixed & Restored
- **Runtime & Autenticación Local**: Solucionado el error 401 Unauthorized en llamadas locales permitiendo `dev-token` en `backend/src/middleware/security.js` cuando `NODE_ENV` está indefinido o en desarrollo/test.
- **Alineación de ID Profesional**: Actualizado `DEFAULT_PROFESSIONAL_ID` en `.env.local` al ID real de `crm_perfiles` (`6dae4ef6-b6b3-4cb0-91d9-0320d10db255`).
- **Eliminación de Loaders Infinitos**: Resuelto el bloqueo de peticiones de agenda, citas, bandeja de entrada y KPIs. El Dashboard renderiza datos reales: 9 pacientes activos, 0 citas hoy (sábado), 1 plan clínico, 50 EUR facturados y foco del día ("Libre").
- **Copiloto Clínico con Contexto Real**: En `index.astro`, `handleAssistantChat` envía ahora `patient_id` y `profesional_id` a `/api/agent/message`, permitiendo a OpenAI (`gpt-4o-mini`) responder con contexto longitudinal y de notas recientes.
- **Notas de Sesión por Voz**: Corregido crash `TypeError: s.tratamientos?.join is not a function` en `backend/src/lib/clinical-voice.js`.
- **Accesibilidad (WCAG AA & Astro Audit)**: Corregidos labels sin `for` asociado en `FichaPacienteView.astro` (`voiceTranscriptInput`, `painEvaSlider`, `painZoneNotes`), `PatientsView.astro` y `PagosView.astro`.
- **Coherencia Visual en Ficha de Paciente**: Sustituido el contenedor oscuro rígido (`#090e17`) de `FichaPacienteView.astro` por superficies tonales clínicas coherentes con la paleta de la aplicación (`#f8f7f4`, `#faf7e8`, `#ffffff`).

### Quality & Verification
- Backend: 21/21 tests unitarios e integrados pasando (`npm test`).
- Frontend: `npx astro check` limpio con 0 errores y 0 warnings.
- Build estático exitoso: `npm run build` genera las 4 páginas en 2.74s.
- Verificación visual y funcional real mediante subagente de navegador con capturas registradas en el brain de la sesión.

---

## [checkpoint-2026-09-19-recovery] — Recuperación Funcional P0 & Superación de Checkpoint a96c502 [SUPERSEDED]

### Added / Restored
- Recuperación de conectividad real con Supabase en `backend/.env` (`SUPABASE_ANON_KEY`) resolviendo fallo de readiness (`missing_core: 0`).
- Tablas y columnas creadas en Supabase: `crm_asignaciones_fisio_paciente`, `crm_audit_log`, `crm_recordatorio_envios` y columnas de auditoría/idempotencia en `crm_recomendaciones`.
- Verificación funcional E2E real en navegador (Playwright) y endpoints sin `?demo=true`: Pacientes, Agenda, Ficha, Prescripción Clínica, Finanzas y Documentos con firma/PDF.

### Fixed
- Backend `patients.js`: corrección de consulta `/ficha` (`inicio_en, fin_en` en vez de `fecha_hora`) y manejo robusto de asignación de pacientes.
- Backend `professional.js`: eliminación de columna inexistente `nombre_completo` en la consulta a `crm_pacientes` en `/program-library`.
- Frontend `index.astro`: desvinculado `localhost` de `isDevMode` para prevenir la inyección silenciosa de mocks demo ante errores o listas vacías.
- Alineación de perfil activo (`DEFAULT_PROFESSIONAL_ID` = `6dae4ef6-b6b3-4cb0-91d9-0320d10db255`).

### Quality & Gates
- Backend: 18/18 tests unitarios e integrados pasando (`npm test`).
- Frontend: `astro check` con 0 errores y build estático exitoso (`npm run build`).

---

## [checkpoint-2026-09-19] — Reconstrucción Visual & Quality Gate (v4.0) [SUPERSEDED]

### Added
- Sistema de tokens y primitivas editoriales clínicas (*Turn.io style*): `frontend/src/styles/design-tokens.css`, `editorial-primitives.css`, `editorial-shell.css` y `editorial-views.css`.
- Tipografía unificada `@fontsource-variable/dm-sans` con `font-feature-settings: "ss03" 1`.
- Habitaciones clínicas cromáticas: Lavender Mist (Inicio), Mint Wash (Pacientes), Cream (Agenda), Peach Wash (Finanzas), Sky Wash (Mensajes), Sand Canvas (Ajustes) y Canopy Green (Copiloto Clínico y Sidebar).
- Estado de carga clínico (*light clinical shimmer*) y estados empty con bordes punteados suaves.

### Changed
- Abandonado por completo el esquema de dark dashboard genérico (`#0d1522`) en favor de lienzos claros y tarjetas blancas puras sin sombras pesadas.
- Reconstruido el Topbar como barra de comandos editorial con buscador `⌘K`, contexto temporal y acceso rápido a Agenda y Copiloto.
- Reorganizada la sección Ajustes (`ConfigView`) en 6 bloques estructurados temáticos con diagnóstico técnico colapsable en `<details>`.
- Reorganizado el Copiloto Clínico (`AssistantRail`) a una altura de `calc(100dvh - 64px)` con compositor sticky y margen seguro inferior.

### Fixed
- Finanzas: Eliminado el renderizado doble de cobros en escritorio ocultando `#pagosMobileList` en `>= 768px`.
- Mensajes: Corregido el error crítico de texto blanco sobre fondo claro mediante tokens semánticos de contraste alto (`--color-charcoal`, `--color-ink-black`).
- Agenda: Sustituidos los gradientes oscuros en estados de carga por shimmer claro.

### Security & Quality
- Batería de 18/18 tests unitarios e integrados pasando en backend (`npm test`).
- Verificación estática limpia de Astro (`npx astro check`: 0 errores, 0 warnings).

---

## [checkpoint-2026-09-15] — Auditoría Técnica, Seguridad y Gating Clínico

### Added
- Módulo de auditoría y trazabilidad médica `backend/src/lib/audit.js` registrando en `crm_audit_log` (R-2).
- Procedimiento de supresión y anonimización de pacientes conforme a RGPD (R-3) en `backend/src/routes/patients.js`.
- Batería de pruebas para gating clínico en `backend/test/clinical_gating.test.js` (R-5).
- Rate limit de generación de ejercicios (60 req/h) en `backend/src/index.js` (R-6).
- Scripts SQL de verificación previa no destructiva en `database/preflight/`.

### Fixed
- Seguridad clínica en prescripción (R-4): los ejercicios de apoyo visual adoptan sus propias precauciones y dosificación sin heredar contraindicaciones ajenas.
- Compatibilidad de entorno en Windows (R-11): migración a compilador WASM en Astro 5 para prevenir bloqueos de binarios nativos.

---

## [checkpoint-2026-09-01] — Hardening de Producción

### Added
- Supabase Auth obligatorio con validación de JWT y extracción de perfil en `/api/me`.
- Row Level Security (RLS) habilitado en tablas `crm_*` con cliente Supabase por petición.
- Aprobación humana obligatoria antes de generar PDF o remitir recomendaciones clínicas.
- Control de solapamiento de citas en PostgreSQL.
- CI en GitHub Actions con validación de backend, frontend y workflows n8n.

---

## [checkpoint-2026-05-27] — Estabilización Inicial de Plataforma

### Added
- Despliegue en EasyPanel mediante Deploy Key SSH.
- Soporte de healthchecks en `/`, `/health` y `/api/health`.
- Workflows iniciales W0 a W6 de n8n.
