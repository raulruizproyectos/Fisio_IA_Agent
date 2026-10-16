# Primera prueba: Calendar e Historial — 16 octubre 2026

## Segunda incidencia — columnas de Agenda, corrección local

El snapshot descrito debajo precede a la publicación. Raúl autoriza después el commit de la corrección y el seguimiento actualizado y, por separado, su push a main. Esta entrega reúne esos cambios; comprobar su CI antes del despliegue frontend, todavía no autorizado para esta nueva versión.

Tras probar la entrega `e3a4773`, Raúl comunica una captura con bloqueos Calendar que invaden los otros días. Reproducción con seis bloqueos ficticios largos, dos simultáneos el lunes y una cita clínica: a 1280 px la cabecera tiene columnas de 181,6 px y las filas crecen hasta 1480,7 px por columna debido al mínimo intrínseco de `1fr`. Se usa `minmax(0,1fr)` en cabecera y filas y se permite reducir la celda. El texto resumido conserva el acceso al detalle completo. Sin cambios en citas, disponibilidad, importación de Calendar ni contratos DOM.

La revisión móvil descubre además cadenas sin espacios fuera de la tarjeta: se permite ajustar palabra, se separan título/estado y metadatos. La etiqueta fuera de horario se apila bajo la hora para no recortarla. Solo cambia `precision-agenda.css`, sin dependencias ni lógica de backend/n8n.

Verificado sobre el build final a 375/768/1024/1280/1920: columnas y cabecera alineadas, tarjetas dentro de su día, apilamiento de simultáneas, texto móvil dentro de tarjeta y apertura del detalle completo; sin errores JS ni hallazgos del detector. Capturas inspeccionadas. Frontend check sin errores/warnings (un hint heredado) y build cuatro páginas; backend lint/214 pruebas y regresión de carga Agenda pasan. Evidencia privada: `.private-backups/local-validation/agenda-columns-2026-10-16/`; logs `tmp/agenda-column-*`. Esta nueva corrección todavía está en local, sin otro commit/push/deploy. Se conservan las actualizaciones locales de seguimiento del cierre anterior.

## Cierre operativo — 15:09 Europe/Madrid

Commit/push autorizados completados: `e3a477319329520e62420233cc89db040d949384`, [CI 38905155872 verde](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38905155872). Raúl autoriza después, por separado, desplegar frontend y actualizar/publicar W5. Frontend sirve `e3a4773`; backend conserva `3d4cce7`, sin redeploy. W5 activo/publicado en versión `8dfe42f4-0f3d-48df-8e83-9f6827f77363`, con parámetros corregidos y resto de nodos/credenciales/conexiones/settings preservados. Copia de recuperación del workflow solo en `.env.local`, entrada `N8N_PREVIOUS_W5_DATE_WINDOW_20261016_BASE64`.

Dos lecturas W5 reales, una del 1–2 enero 2040 y otra de la semana 12–19 octubre 2026, devuelven HTTP 200, esquema válido y todos los eventos retornados dentro del intervalo solicitado. El ciclo automático posterior a publicar, **15:08:25**, confirma `healthy` y `error:null`. Los archivos públicos del frontend pasan 12 estados adicionales a 375/1280 con API/Auth ficticias y proveedores bloqueados; no sustituye login real ni envíos. Capturas/recibo en el subdirectorio privado `public-assets/`.

Cierre y continuidad actualizados localmente después de las acciones; sin otro commit/push documental. Los apartados siguientes conservan la cronología previa. El bot de citas permanece pausado; no se cambian políticas de Google Cloud ni se hacen envíos/pruebas clínicas reales.

## Estado comprobado

Raúl desplegó backend y frontend. Lectura de EasyPanel a las 14:44 Europe/Madrid: ambos servicios habilitados, commit `3d4cce78192131bd8cb40efa1f9291a876730138`. CI de esa entrega verde: [38898956429](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38898956429). Esto no acredita el funcionamiento de todos los proveedores.

En producción, el estado Calendar es `error`, modo `w5`, sin éxito desde el reinicio observado. El webhook lector W5 devuelve HTTP 500, también al consultar únicamente el calendario principal. W6 con **action=list** y búsqueda ficticia devuelve igualmente HTTP 500. No se hicieron altas, cambios ni cancelaciones en Calendar ni escrituras CRM.

W5 está activo y sus nodos, parámetros y conexiones coincidían con la fuente antes de esta corrección local. Los registros backend confirman `calendar_reader_failure`, razón `http_500`. La retención automática de ejecuciones W5 está desactivada. La primera ejecución manual solo alcanzó Entrada; la segunda, completa (`165765`, 14:59:50), identifica el fallo en **Leer calendario**: la credencial necesita reconectarse y no se puede renovar el acceso. La pantalla «Account connected» conservaba la vinculación, sin demostrar lectura actual.

Raúl reconecta la misma cuenta. A las 15:01 W5 y W6 action=list vuelven a HTTP 200, con respuestas estructuradas válidas. El ciclo automático de las **15:02:25 Europe/Madrid** termina `ok`; lectura a las 15:03:07 acredita `ui_status:healthy`, `error:null` y éxito actual, sin forzar la sincronización. No se modifican Client ID, secretos, permisos o configuración por el agente.

No se ha comprobado el estado de publicación del cliente OAuth en Google Cloud. Si es External/Testing, [Google limita a siete días estos refresh tokens](https://developers.google.com/identity/protocols/oauth2/); revisar ese ajuste para evitar reconexiones periódicas, sin dar esa causa concreta por demostrada ni cambiar la publicación de la app sin autorización.

## Corrección local de presentación

- Agenda/Inicio: se restaura la distribución de los datos de sincronización, con separación y ajuste de línea. El aviso se apila en móvil. Se añade espacio real entre datos para conservar legibilidad aunque falte CSS.
- «Conexión: Configurada» describe configuración, sin confundirla con una lectura correcta. La comprobación prevista muestra hora de Madrid, sin presentar una fecha futura como «hace menos de 1 min».
- Historial: datos Telegram en rejilla con etiqueta y valor separados; códigos/enlaces largos ajustan línea; acciones con espacio y ajuste móvil; campo de seguimiento a todo el ancho y con altura útil.
- Referencia: diseño vigente Precisión azul y capturas del usuario. Se conservan superficies, colores semánticos, tipografía, controles de 44 px, foco visible, IDs/data-* y comportamiento. Sin librerías nuevas ni cambios en la vinculación/envío del bot.

## Defecto adicional del intervalo Calendar

La captura del nodo muestra After/Before con valores por defecto. La fuente del lector colocaba `timeMin/timeMax` dentro de `additionalFields`, pero [Google Calendar node 1.3](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Google/Calendar/GoogleCalendar.node.ts) los lee en la raíz de parámetros. Se mueven esas dos expresiones a su posición correcta, solo en local; no se cambian nodos, conexiones, credenciales ni activación. La regresión `scripts/test-calendar-reader-window.mjs` falla antes y pasa después, probando rangos concretos desde el normalizador hasta los parámetros que consume el nodo. Añadida al job n8n de CI; 23 JSON válidos. El workflow remoto todavía conserva el defecto de intervalo y requiere actualización expresamente autorizada.

## Evidencia y límites

La reproducción previa falla con `display:block` y separación `normal` en los datos de sincronización. Después: 24 estados a 375/768/1280/1920 px, incluyendo Telegram pendiente, sin vincular, vinculado y no disponible; sin errores JS ni hallazgos del detector. Se comprueban distribución de campos y ancho real del textarea; capturas inspeccionadas en móvil/escritorio.

Frontend check: cero errores/warnings, un hint heredado; build cuatro páginas. Backend lint y 214/214 pruebas pasan; la suite necesita permiso de sockets locales fuera del aislamiento. Regresiones de carga de Agenda y guardado/contexto de notas pasan.

Recibos/capturas ficticias privados: `.private-backups/local-validation/calendar-history-2026-10-16/`. Diagnóstico remoto sanitizado: `.private-backups/local-validation/production/2026-10-16/calendar-incident/`. Logs locales en `tmp/calendar-history-*`.

El snapshot de verificación se tomó **en local** sobre `3d4cce7`, antes de publicar. Después Raúl autoriza expresamente crear el commit de esta incidencia y, por separado, hacer push a main; la entrega que contiene esta entrada reúne la corrección. Comprobar el CI de su HEAD publicado antes del siguiente paso. El aviso de error no se oculta. No se activan bots, se reejecutan migraciones, se envían mensajes ni se consume IA de pago. Desplegar el frontend y actualizar el lector W5 activo siguen requiriendo autorización nueva específica. Backend no requiere redeploy para esta corrección.
