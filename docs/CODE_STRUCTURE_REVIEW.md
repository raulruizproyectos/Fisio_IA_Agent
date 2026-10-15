# Estructura y eficiencia del código

Encargo de Raúl del 15-oct: tras cerrar diseño y usabilidad, revisar código para que sea eficiente, comprensible y mantenible. La brevedad significa evitar duplicaciones y complejidad innecesaria, conservando validaciones y controles clínicos.

## Primera comprobación y corrección

La revisión del cargador de Agenda confirma una carrera: dos cambios rápidos de semana podían resolverse en orden inverso y dejar citas antiguas bajo la semana nueva. `test-agenda-loading.mjs` reproduce el fallo antes del cambio. Ahora cada carga captura su semana y una versión; respuestas y errores antiguos se descartan antes de modificar las vistas. No reintenta escrituras ni cambia contratos de API. El test cubre tanto respuesta antigua como fallo antiguo y pasa tras la corrección.

Las regresiones nuevas de usabilidad, próxima sesión, contexto Calendar y carga de Agenda quedan incorporadas a CI. Ejecución local no equivale a un CI remoto: comprobar el resultado del commit publicado antes de desplegar.

## Deuda estructural confirmada

| Prioridad | Evidencia del árbol actual | Consecuencia / dirección |
| --- | --- | --- |
| P2 | `frontend/src/pages/index.astro`: aproximadamente 10.930 líneas, con Auth/bootstrap, navegación, Copiloto, pacientes, agenda, notas, finanzas y documentos en el mismo script | Mucho estado compartido y cambios difíciles de aislar. Separar controladores por tarea con dependencias explícitas; mantener un arranque pequeño que los conecte |
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

**Estado:** incidencia de cargas corregida y verificada; diagnóstico estructural inicial documentado. La modularización general y una auditoría exhaustiva de eficiencia siguen pendientes. Este documento no certifica que todo el código esté ya reorganizado.
