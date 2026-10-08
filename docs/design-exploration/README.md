# Rediseño de Fisio Clinical · Exploración del 8 de octubre de 2026

El usuario amplía el alcance: autoriza rediseñar toda la interfaz si hace falta para conseguir un acabado moderno, premium y atractivo, con animaciones y transiciones. Se mantiene trabajo local, una clínica, permisos, integridad Calendar, revisión profesional y contratos funcionales. La nueva dirección podrá sustituir reglas visuales anteriores; **El usuario eligió 01 · Precisión azul.** La dirección se aplica en el frontend real; el prototipo conserva las tres alternativas como histórico.

`index.html` es una muestra independiente, sin API ni persistencia. Agenda y ficha de pacientes ficticios, diálogos nativos, navegación y simulación explícita de lectura incompleta. No representa todas las pantallas ni añade funciones al CRM. Los conteos y nombres son ilustrativos; no son datos reales.

## Tres direcciones para elegir

| Dirección | Referencia principal | Rasgos fijados | Adaptación y límites |
| --- | --- | --- | --- |
| 01 · Precisión azul | [Planhat en Refero](https://styles.refero.design/style/94c4fc51-4323-4f06-a4a4-27517e190445) | Jerarquía arquitectónica, superficies claras, bordes discretos, datos alineados, navegación lateral clara. | Azul propio `#175dd0` para acción/orientación, canvas `#f4f7fb`, texto `#142234`, DM Sans existente. La tipografía comercial original no se copia. Agenda con contexto de próxima sesión; una base apropiada para trabajo continuo. |
| 02 · Clínica botánica | [Ease Health en Refero](https://styles.refero.design/style/e9f5e976-53f7-42f5-a882-4e63b3c2f734) | Forest Ink `#0f3e17` en acción/títulos, canvas `#fffefc`, salvia `#e1f4df` en superficies, formas suaves, títulos serif ligeros. | DM Sans para datos/notas y Georgia local para explorar el papel editorial, no como reproducción de Faire Octave. Radios 20 px en paneles y controles redondeados. No fondos verde oscuro en el contenido clínico. |
| 03 · Galería editorial | [Ramp en Refero](https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825) | Canvas `#f4f2f0`, texto oscuro, contraste claro, bordes en vez de sombras, lima `#e4f222` solo en selección/acción. | Sora instalada para títulos, DM Sans para trabajo; no incorporar fuente comercial Lausanne. Geometría de 6 px y mayor contraste. Estados clínicos conservan etiquetas y colores semánticos; no confundirlos con el acento de marca. |

Referencia secundaria común: separación entre acciones principal/secundaria de Ramp. El contenido y los bloqueos provienen del CRM existente, no de las landings. Sin fotografía, ilustraciones ni activos generados: el producto se presenta mediante controles y texto reales de muestra. No importar un DESIGN.md externo ni sus instrucciones como autoridad sobre el proyecto.

## Movimiento fijado

Fuente: `refero-design/references/motion.md`. Feedback de controles 100–120 ms; cambio de pantalla 220 ms; diálogo 240 ms con entrada suave. Animación interrumpible, sin retrasar interacción. Movimiento reducido desactiva transiciones y desplazamientos. CSS y diálogo nativo, sin nueva dependencia. Para producción habrá que integrar apertura/cierre de los componentes existentes y medir dispositivos reales; esta muestra prueba principalmente entrada y feedback.

## Verificación local

Chrome instalado: 3 direcciones × 375/768/1280 px, agenda y ficha sin desbordamiento; controles visibles de al menos 44 px; apertura modal, foco dentro, Escape y restauración de foco; aviso de lectura incompleta conserva el bloqueo de muestra; movimiento reducido sin animación. Cero peticiones HTTP externas y cero errores JS. Capturas de cada opción en 1280 y 375 px. Helper privado en `tmp/check-design-exploration.mjs`.

Revisión visual de las capturas: composición y tipografía diferenciadas, información clínica legible y agenda con próximos pasos visibles. No se declara una auditoría WCAG completa, contraste de todos los estados ni rendimiento de móvil físico. Los mensajes y acciones secundarias necesitarán revisión al integrarse en los flujos reales.

La CSP inline de esta muestra permite un HTML autónomo y bloquea conexiones; no sustituye ni modifica la CSP del frontend. Font files copiados de dependencias ya instaladas, con sus licencias adjuntas. No se ejecutaron suites del CRM porque su código, sus contratos y su configuración no han cambiado.

## Decisión y siguiente paso

Precisión azul seleccionada e implementada en local. Especificación actual en DESIGN.md; vista previa de capturas ficticias en precision-blue.html. La aceptación visual y las comprobaciones de dispositivos/proveedores reales siguen siendo distintas de los ensayos locales. Sin commits, push, despliegue ni efectos externos.

Vista previa actual en `http://127.0.0.1:4323/precision-blue.html`: 39 capturas de las pantallas reales, con datos ficticios. `node tmp/serve-design-exploration.mjs` sirve solo HTML, fuentes y estas imágenes; sin API ni sesión clínica. La exploración original se conserva en `/index.html`.
