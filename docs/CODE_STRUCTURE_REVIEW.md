# Estructura y eficiencia del código

> Publicación autorizada el 16-oct: Raúl autoriza expresamente el commit de esta tanda y, por separado, su push a main en raulruizproyectos/Fisio_IA_Agent. La entrega que contiene esta entrada reúne las correcciones y la evidencia; comprobar el CI de su HEAD en GitHub. No autoriza despliegues ni activar el bot. Las referencias a «local/sin publicar» describen el cierre previo a esta autorización.

## 16-oct — Pasada de fuente e integración terminada en local

Cobertura exacta y correcciones en [AUDITORIA_FINAL_2026-10-16.md](AUDITORIA_FINAL_2026-10-16.md) y auditoria-local/. Backend actual: 41 JS, incluidos 40 leídos por dominio y un helper PDF nuevo revisado al integrar. Frontend: 53 archivos leídos y 14 CSS con análisis estructural/revisión dirigida; no inspección visual de cada declaración. Sin reescritura masiva ni dependencias nuevas.

Se separan navegación, texto, HTTP/creación recuperable y fechas de Madrid; se centraliza lectura Calendar y nombre PDF. El directorio deja de ordenar agenda por paciente. Persisten controladores grandes y deuda de cascada CSS: son hallazgos de mantenibilidad explícitos, no una certificación de código perfecto. Regresiones, build y recorridos de integración pasan; no se han publicado estos cambios.

## 15-oct — Navegación y límites de datos separados (local)

Base de esta tanda: `1b2a954`. Se separan responsabilidades reales sin añadir dependencias ni cambiar las reglas de la clínica:

| Módulo | Responsabilidad |
| --- | --- |
| `frontend/src/lib/navigation.ts` | Alias de secciones y actualización única de pantalla, menú, dock y ruta visible |
| `frontend/src/lib/text.ts` | Reparación de codificación, texto y recorrido inmutable de JSON |
| `frontend/src/lib/http.ts` | Lectura JSON con timeout, opciones de la petición y metadatos de error |
| `frontend/src/lib/create-record.ts` | Alta con clave de idempotencia por profesional, recuperación y persistencia de la operación pendiente |

El arranque conserva la navegación básica antes de cargar el controlador autenticado; después solo el controlador atiende cada clic. La ficha usa el mismo recorrido. Se mantiene el regreso al inicio al seleccionar la sección actual y se eliminan listeners duplicados. Abrir el historial ya no lo pide directamente y otra vez mediante el cargador de la vista. Se retiran los mapas exportados `patientState` y `dashboardRuntime` sin consumidores; el estado real actual se conserva. El bundler ya excluía esos mapas: no se les atribuye ahorro de descarga.

Dos errores reproducidos y corregidos al revisar los límites de datos:

- El reparador anterior convertía `PEÑA` en `PE�A`. Ahora una secuencia que no puede decodificarse como UTF-8 válido conserva el original; se comprueban Ñ, otros idiomas, emoji, texto descompuesto y reparaciones de una/dos pasadas. La copia del reparador y el segundo barrido inicial del DOM desaparecen; arranque y JSON usan la misma implementación. El JSON con una clave `__proto__` conserva esa clave como dato, sin modificar el prototipo.
- El alta intentaba reescribir `message` en una excepción nativa de timeout, que tiene solo getter, y producía un TypeError. Ahora devuelve el aviso de guardado incierto conservando la causa y la clave pendiente. Una repetición explícita sigue usando la misma operación; no se reenvía automáticamente. Se comprueba separación por profesional y fallo antes de escribir si no hay almacenamiento duradero.

Medición con el mismo build/fixture y navegaciones a 375/1280 px: modificaciones de atributos de las páginas **55 → 28** por navegación ordinaria y **80 → 28** en Finanzas; notificaciones de navegación a Finanzas **2 → 1**. Lecturas del historial al abrirlo desde Mensajes **2 → 1**. Son conteos de trabajo repetido local, no medidas de latencia de producción.

En los cuatro archivos de producción afectados había 11.222 líneas; tras separar cuatro módulos quedan 11.021 en conjunto: **201 líneas netas menos**. `index.astro` pasa de 10.930 a 10.707. Las líneas de pruebas/documentación no forman parte de ese cálculo y no se presenta mover código como una reducción por sí misma.

Verificación: pruebas de los módulos importados, creación recuperable migrada al módulo real, 16 scripts de regresión, backend lint/171 pruebas, frontend check (46 archivos, cero diagnósticos) y build. Repetición de 112 estados de interfaz a 375/768/1280/1920, recorridos complementarios con nombres Ñ en móvil/escritorio, selección repetida con scroll al inicio y contratos DOM sin eliminaciones. Nuevas pruebas añadidas a la definición de CI; CI remoto de esta tanda aún no ejecutado. Evidencia privada en `.private-backups/local-validation/code-structure/2026-10-15/` y `tmp/`.

Cambios solo locales. Backend, DB, n8n, bot pausado y estilos no se modifican. Quedan pendientes controladores de dominios grandes y consolidación CSS. Esta tanda cierra navegación/límites compartidos, no una reorganización total del CRM.

## Primera comprobación y corrección

La revisión del cargador de Agenda confirma una carrera: dos cambios rápidos de semana podían resolverse en orden inverso y dejar citas antiguas bajo la semana nueva. `test-agenda-loading.mjs` reproduce el fallo antes del cambio. Ahora cada carga captura su semana y una versión; respuestas y errores antiguos se descartan antes de modificar las vistas. No reintenta escrituras ni cambia contratos de API. El test cubre tanto respuesta antigua como fallo antiguo y pasa tras la corrección.

Las regresiones nuevas de usabilidad, próxima sesión, contexto Calendar y carga de Agenda quedan incorporadas a CI. Ejecución local no equivale a un CI remoto: comprobar el resultado del commit publicado antes de desplegar.

## Deuda estructural confirmada

| Prioridad | Evidencia del árbol actual | Consecuencia / dirección |
| --- | --- | --- |
| P2 | `frontend/src/pages/index.astro`: 10.707 líneas tras esta tanda (base 10.930); todavía concentra Copiloto, pacientes, agenda, notas, finanzas y documentos | Los límites compartidos ya se han separado; continuar con controladores por tarea y dependencias explícitas |
| P2 | `backend/src/routes/professional.js`: 3.536 líneas; agrupa Calendar, reserva pública, citas, ajustes, biblioteca y vídeo | Separar rutas por dominio, manteniendo autenticación, RLS, errores y límites actuales. No reorganizar reservas y Calendar junto con otros cambios funcionales |
| P2 | `Layout.astro` importa 19 capas CSS; `precision-blue.css` contiene 260 usos de `!important` | La cascada oculta controles o restablece duplicados; Alta rápida es un caso observado. Consolidar por componente comprobando todas las pantallas y sin recuperar la paleta antigua |
| P2 | Diez scripts de prueba dependen de extraer fragmentos de `index.astro` por texto | Las pruebas detectan fallos útiles, pero la extracción acopla el test a la organización del fichero. Al sacar una responsabilidad, probar el módulo importado y conservar recorridos de navegador |

El tamaño por sí solo no prueba un fallo de rendimiento. Los CSS históricos grandes que no se importan no deben presentarse como bytes enviados al navegador. No se han medido latencia ni carga de producción y no se atribuyen mejoras de velocidad sin esa medida.

## Orden de continuación

1. Caracterizar los límites del arranque, navegación y cliente HTTP; fijar qué estado pertenece a cada controlador.
2. Extraer una responsabilidad por cambio, empezando por funciones puras/presentación o un controlador con pocas dependencias. Evitar trasladar todas las variables a un objeto global.
3. Pacientes/ficha/notas, finanzas y documentos en cortes independientes; Copiloto con sus aprobaciones y entregas como responsabilidad clínica explícita.
4. Después, rutas profesionales por dominio; no tocar el bot pausado ni sus reglas por esta limpieza.
5. Medir peticiones y carga de cada recorrido antes de introducir cachés, cancelaciones o carga diferida. Preservar recuperación e idempotencia de escrituras.

Por cada extracción: comportamiento previo caracterizado, pruebas del módulo, check/build, regresiones afectadas y comprobación móvil/escritorio. Las pruebas de contratos DOM, aislamiento de clínica, sesión/CSRF, aprobación clínica y Calendar deben conservarse. Una refactorización no autoriza cambios de esquema, despliegue, activación de bots o envíos.

**Estado:** cargas de Agenda y primera tanda de navegación/límites de datos corregidas y verificadas. La modularización de los grandes controladores, consolidación CSS y revisión exhaustiva de eficiencia siguen pendientes. Este documento no certifica que todo el código esté ya reorganizado.
