# Primera prueba: Calendar e Historial — 16 octubre 2026

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
