# Fisioteràpia CarlaJL · Noche clínica aguamarina (v8)

**Vigente desde el 18 de octubre de 2026.** Raúl pidió derivar la paleta del logo de la clínica (acuarela aguamarina, línea fina en tinta). Se conserva la estructura de la v7 (escala, radios, pesos, navegación oscura, capa final única); solo cambian los colores: el índigo pasa a aguamarina profunda y el azul noche a tinta. No reintroducir el índigo `#4f46e5` ni el violeta `#7c3aed`.

Muestras del logo: lavado `#d1ebec` (tono 183°), tinta `#0c1314`. Contrastes AA medidos: blanco sobre acento 5,9:1; acento sobre blanco 5,9:1 y sobre suave 5,1:1; apagado sobre lienzo 5,4:1; texto de navegación 8,3:1.

| Papel | Valor (v8) | Sustituye a (v7) |
| --- | --- | --- |
| Acento (acción, selección, foco) | `#136f74`, hover `#0f5f63`, profundo `#0e5a5e`, suave `#e3f2f2`; degradado del primario `#1d7a7f → #136f74` | `#4f46e5`, `#4338ca`, `#3730a3`, `#eef0ff`, `#6366f1` |
| Aguamarina clara (fondos, bordes de selección) | `#e9f5f5`, `#d6eeee`, `#b7dfe0`, `#8ccbce` (raíl activo en la navegación), `#4fa3a7` | `#eef2ff`, `#e0e7ff`, `#c7d2fe`, `#a5b4fc`, `#818cf8` |
| Navegación (tinta) | `#0c1314`, tarjetas `#142022`, borde `#1d2c2e`, activo `#1a2b2d`, texto `#9fb0b1`, apagado `#7f9394` | `#0b1020`, `#121a2e`, `#1b2236`, `#1c2440`, `#a3aac2`, `#8189a6` |
| Asistente IA (tarjeta del menú) | `#0b4649 → #136f74 → #1d7a7f` | `#312e81 → #4f46e5 → #7c3aed` |
| Lienzo / superficie | `#f2f6f6` / blanco | `#f3f4f8` |
| Texto | principal `#0c1314`, secundario `#374151`, apagado `#56676a` | `#0b1020`, `#5b6476` |
| Bordes | `#e3e9e9`, suave `#eef3f3`, medio `#d2dcdc` | `#e5e7ef`, `#f0f1f6`, `#d4d7e2` |
| Grises antiguos (pizarra/celeste) | `#f0f5f5`, `#c8d5d6`, `#91a4a5`, `#4a5c5e`, `#34484a`… | `#f1f5f9`, `#cbd5e1`, `#94a3b8`, `#475569`, `#334155`… |

Estados semánticos sin cambios (verde/ámbar/rojo con punto + texto); «info» usa la aguamarina. Logo: medallón redondo blanco en el menú (40 px) y en el acceso (112 px; 80 px en móvil), archivos en `frontend/public/brand/`.

Verificación del 18-oct: escaneo de colores calculados (tono 195–295°, saturación > 30 %) en 13 vistas + copiloto + 4 modales + acceso + reserva, a 1280, 1366 y 390 px: de 153–357 coincidencias por vista a **0**; avisos de maquetación idénticos a los de antes. Herramienta: `tmp/css-prune/palette-audit.mjs`.

---

# Historia: Noche clínica índigo (v7)

**Vigente desde el 17 de octubre de 2026.** Raúl eligió la dirección C («Noche clínica») entre tres maquetas de Pacientes (A Precisión azul refinada, B Clínica cálida editorial, C Noche clínica) porque la v6 le parecía «sosa, un CRM más» y con desajustes. Sustituye a Precisión azul (v6), que se conserva debajo como historia. No reintroducir el azul `#175dd0` ni DM Sans.

## Por qué hubo que cambiar el sistema, no solo los colores

Medición del 17-oct sobre las 19 hojas importadas: 54 tamaños de letra, 37 radios, 46 sombras, 97 colores y 2.609 `!important`. Cada vista traía sus propios valores. La v7 fija una sola escala y una capa final que manda sobre las anteriores; tras aplicarla, el render de las nueve vistas usa 14 tamaños (casi todos de la escala), pesos 400/500/600 y 11 radios, sin desbordamiento horizontal a 1366 ni a 375 px.

## Tokens

| Papel | Valor |
| --- | --- |
| Acento (acción, selección, foco) | Índigo `#4f46e5`, hover `#4338ca`, suave `#eef0ff`; botón primario en degradado `#6366f1 → #4f46e5` con sombra índigo |
| Navegación | Noche `#0b1020`, tarjetas `#121a2e`, borde `#1b2236`, activo `#1c2440` con raíl `#a5b4fc`, texto `#b4bad0` |
| Lienzo / superficie | `#f3f4f8` / blanco |
| Texto | Principal `#0b1020`, secundario `#374151`, apagado `#5b6476` |
| Bordes | `#e5e7ef`, suave `#f0f1f6` |
| Tipografía | **Inter Tight** (Fontsource, OFL, alojada en el build), `cv11` + `ss01`, cifras tabulares en datos |
| Escala | 11 (etiquetas en mayúsculas) · 12 · 13 · 14 (base) · 16 · 20 · 24/28 (cifras) · 32 títulos (26 en móvil). Raíz 16 px para que los `rem` caigan en píxeles enteros |
| Pesos | 400 texto · 500 navegación/controles · 600 títulos, botones y cifras. Nada por encima de 600 |
| Radios | Controles 10 px · tarjetas 16 px · paneles, tablas y diálogos 20 px · etiquetas 999 px |
| Sombras | 1: `0 1px 2px` · 2: paneles con sombra difusa · 3: diálogos |
| Estados | Verde/ámbar/rojo/índigo suave **siempre con punto + texto** (`.status-chip`); en la Agenda, color + etiqueta |

## Composición

- Cabecera de cada vista: etiqueta en mayúsculas (índigo) → título 32 px → descripción 14 px gris, con 8 px entre ellos y acciones alineadas a la derecha, sin tarjeta detrás. Los títulos no llevan icono.
- Indicadores: tarjeta blanca de 16 px de radio, etiqueta, cifra grande en una sola línea y contexto.
- Tablas: cabecera de 12 px sin mayúsculas, filas de 14 px con hover suave; encabezados nunca partidos.
- Filtros: buscador + orden arriba; segmentos alineados a la izquierda en una pista gris.
- Asistente IA: tarjeta en degradado índigo-violeta en la navegación; es el único elemento con degradado de color aparte del botón primario.
- Mantener todo lo de la v6 sobre sencillez, accesibilidad (44 px, foco visible, Escape), movimiento discreto y `prefers-reduced-motion`, que sigue vigente.

## Implementación

- `frontend/src/styles/design-tokens.css`: valores. `frontend/src/styles/premium-system.css`: **capa final única**, importada la última en `Layout.astro`. Ahí van las decisiones compartidas; no añadir valores sueltos en hojas antiguas.
- Reglas antiguas con selector de id o compuestos pueden ganar: anclar con `body .app-shell …` en la capa final en lugar de crear otra hoja.
- Contratos: ningún ID ni `data-*` cambiado (comprobado contra HEAD el 17-oct). Check, build, 28 scripts de CI y 227 pruebas backend en verde tras el cambio.
- Hojas (17-oct-2026): `Layout.astro` importa solo `global.css`, `design-tokens.css` y `premium-system.css`. Las hojas antiguas viven dentro de `premium-system.css` como secciones `════ <hoja>.css ════` en su orden de cascada original, seguidas de las vistas Documentos/Mensajes/Historial/Ajustes y de las decisiones compartidas de Noche clínica. La poda de declaraciones «muertas» del 17-oct se revirtió el 18-oct: las mediciones solo cubrían semanas con citas en fin de semana y eliminó la rejilla de 5 días. Cualquier poda futura debe medir también estados alternativos (semana sin fin de semana, vacíos, errores, modales) antes de borrar. Herramientas: `tmp/css-prune/` (no versionadas). Deuda restante: unificar dentro de cada sección las reglas que se pisan entre sí, vista a vista.

---

# Historia: Precisión azul (v6)


El usuario eligió **Precisión azul** el 8 de octubre de 2026 y autorizó rediseñar toda la interfaz, con acabado moderno y premium y movimiento discreto. Esta es la especificación vigente; sustituye las reglas verde/coral y pastel anteriores. Su historial y evaluaciones se conservan en [DESIGN-history.md](docs/design-exploration/DESIGN-history.md).

## Dirección y referencias

CRM de Fisioterapia Carla JL, para una sola clínica. La prioridad es comprender la agenda, leer y editar el caso y completar una acción con claridad. Superficies blancas, jerarquía arquitectónica, bordes finos, densidad legible y acento azul. Sin nuevos activos gráficos, dependencias ni fuentes.

Referencia principal: [Planhat en Refero](https://styles.refero.design/style/94c4fc51-4323-4f06-a4a4-27517e190445), para estructura, superficies y alineación de datos. [Ramp](https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825) aporta separación de acciones. Se adapta a la herramienta clínica con DM Sans existente y azul propio; no se copian fuentes comerciales ni layouts de marketing. Las tres propuestas originales quedan en [la exploración](docs/design-exploration/README.md).

Los artículos [WebReactiva](https://www.webreactiva.com/blog/como-crear-diseno-skill-frontend-design), [TodoDeIA](https://www.tododeia.com/community/5-skills-diseno-claude) y [Bitdoze](https://www.bitdoze.com/es/mejores-skills-ia-diseno-web/) aportan brief, separación de capacidades y revisión de jerarquía/contraste/estados. Sus comandos no autorizan instalaciones; no se instalaron paquetes. Referencias funcionales conservadas: [Nubimed](https://www.nubimed.com/software-fisioterapia/) y [Physitrack](https://www.physitrack.com/features). No se probaron aplicaciones comerciales autenticadas. Refero MCP no disponible; guías de craft/motion de la skill existente y fichas públicas consultadas.

## Tokens canónicos

| Papel | Valor |
| --- | --- |
| Acción, selección y foco | Azul `#175dd0`, hover `#104ab0` |
| Lienzo / superficie | `#f4f7fb` / blanco |
| Texto principal / secundario | `#142234` / `#536375` |
| Borde / selección suave | `#dce3ed` / `#eaf1fe` |
| Radios | Controles 8 px, tarjetas 14 px, paneles/diálogos 16 px |
| Tipografía | DM Sans, base 15 px, títulos 30 px escritorio/26 px móvil; edición de notas 16 px, interlínea 1.6 |
| Espaciado | Base 4 px; grupos 12–24 px; contenido 32 px escritorio, 20–24 px móvil |

Rojo, ámbar y verde mantienen papeles de error, advertencia y éxito, siempre con texto. Azul no acredita confirmación de Calendar ni aprobación profesional. Aliases históricos como coral/canopy siguen en azul para compatibilidad; no son una segunda paleta.

## Composición e interacción

- **Sencillez como criterio general (Raúl, 15-oct):** conservar todas las funcionalidades con un lugar principal claro para cada tarea. Priorizar las acciones frecuentes, agrupar las secundarias y evitar accesos repetidos sin utilidad contextual. La información de detalle se muestra donde se usa; simplificar nunca debe ocultar errores, estados de sincronización o controles clínicos.
- Inicio: Agenda permanece en la navegación principal (menú/dock) y en «Semana clínica». La próxima sesión pertenece a ese bloque, con acceso a la ficha si está vinculada; no se muestra una segunda tarjeta vacía ni accesos genéricos adicionales en el saludo o la barra superior.
- Navegación blanca de 224 px, sección activa azul suave, marca clínica y perfil autenticado. Móvil: menú debajo de la barra de 64 px, por encima del dock, con Escape y cierre al navegar. Navegación completa disponible con scroll en pantallas bajas.
- Barra superior blanca, búsqueda, ruta de navegación actual y acciones con etiquetas accesibles. Lienzo único; solo una pantalla activa, sin huecos de overlays cerrados.
- Agenda clara, vínculo/estado CRM visible, acción secundaria Comprobar Calendar; navegación semanal adaptable y vista táctil por días.
- Ficha: identidad, continuidad clínica y pestañas; notas con lectura cómoda y guardado alcanzable sobre el dock. Métricas reales o estados vacíos, nunca evolución inventada.
- Biblioteca, finanzas, documentos, mensajes, historial y ajustes comparten tokens y acciones. Tablas anchas conservan scroll interno; encabezados pueden partir línea. Formularios y diálogos conservan campos/contratos existentes.
- Copiloto en panel lateral temporal y a pantalla completa en móvil, con cierre accesible. PDF y envío de ejercicios siguen exigiendo aprobación; un paciente sin Telegram puede acceder a su vinculación, sin enviar el plan.
- Acceso, recuperación y reserva pública usan el mismo azul, fuente y superficies. No se modifican controladores Auth/reserva ni claves de recuperación.

## Movimiento, estados y accesibilidad

Feedback de controles 100–120 ms; entrada de pantalla 220 ms; entrada de diálogo 240 ms; panel lateral conserva su transición de apertura/cierre. Sin animaciones decorativas continuas ni retrasos de interacción. `prefers-reduced-motion` desactiva animaciones, transiciones y scroll suave.

Controles de al menos 44 px, foco visible de 2 px, teclado/Escape y retorno de foco en diálogos, avisos anunciados y errores persistentes hasta cierre. Estados de carga/error/ausencia diferenciados. No ocultar acciones bajo el dock ni usar lista vacía como confirmación técnica. Objetivo de contraste AA; no se declara certificación WCAG integral.

## Implementación y verificación local

Refinamiento autorizado el 13 de octubre de 2026: identidad visible única en la ficha, resumen en filas legibles y métricas complementarias bajo «Seguimiento del caso», después del contenido. Las seis pestañas conservan sus contratos y muestran una selección deslizante de 220 ms. Paneles: entrada de 240 ms y salida de 180 ms; durante el cierre quedan inertes y devuelven el foco. Los tokens pasan a 0 ms con movimiento reducido. Carga con skeleton y texto explícito; guardado de notas y acceso con estado ocupado real, sin confirmación optimista. Acceso/recuperación ganan profundidad discreta y el acceso representa Agenda → Seguimiento → Revisión con los iconos existentes. Sin dependencias nuevas; publicado/desplegado en frontend `c062967`, con mapa corporal corregido y navegación por teclado verificada. Evidencia local en [la revisión](docs/design-exploration/reviews/2026-10-13/README.md) y estado desplegado en [producción](docs/design-exploration/reviews/2026-10-13/production.md).

El usuario solicita una segunda opinión de CloudCode sobre diseño, estructura, animaciones, gráficos y recorridos, además de funcionalidades/arquitectura/seguridad. Se permite cuestionar y proponer alternativas argumentadas a la dirección actual; no cambiarla automáticamente ni confundir un selector corporal esquemático con precisión anatómica acreditada. Para el agente de citas Telegram y sus recorridos asociados sí se solicita completar la implementación local; las demás mejoras se presentan priorizadas. [Prompt, alcance y 25 recursos](docs/PROMPT_AUDITORIA_CLOUDCODE.txt).

Revisión visual posterior al cierre de las 16:08: examinadas las 39 capturas; ajustados el saludo cuando el perfil solo ofrece correo, las acciones de Pacientes a 375 px, la separación del icono de búsqueda y los textos explicativos de métricas. Facturas/bonos/documentos/gestoría muestran una sola representación: tablas en escritorio y tarjetas pobladas en móvil; los estados vacíos, carga y errores conservan la tabla y su aviso. Sin cambios de tokens, IDs/data-* ni controladores clínicos. Ensayo acotado: 45 estados a 375/768/1280 px, con pacientes/citas de clínica ficticia y dobles HTTP explícitos para registros administrativos y errores; sin overflow, errores JS ni tráfico externo. Evidencia y límites en [la revisión](docs/design-exploration/reviews/2026-10-08/README.md). Aceptación visual del usuario pendiente.

`design-tokens.css` fija valores; `precision-blue.css` gobierna el shell y las reglas compartidas. Layout deja de importar la capa editorial de shell y global-shell conserva feedback. Vistas mantienen grids y contratos. Todos los IDs y atributos data-* estáticos de Astro comparados con el punto anterior: conservados.

Chrome sobre build, runtime/CSP generado y clínica ficticia: 46 estados a 375/768/1280 px, sin desbordamiento horizontal ni errores JS ni red externa, controles táctiles, navegación/ficha/copiloto, formularios de paciente/foco/Escape y movimiento reducido. Datos SQL de pacientes/citas en clínica aislada; módulos administrativos/biblioteca usan dobles vacíos explícitos. Evidencias y capturas en el recibo privado `blue-ui-verification.json`.

Frontend check/build y regresiones de Auth, reserva, Calendar, feedback, diálogos y contexto clínico pasan. Backend sin cambios funcionales en este bloque; lint y 100 pruebas pasan. Los ensayos no acreditan Google/Auth/PostgREST reales, nginx/proxy, móvil físico, rendimiento completo ni todos los estados financieros o de ejercicios con registros reales. No SQL Cloud, despliegue, mensajes reales, commit ni push; EasyPanel aparcado.

Comprobación adicional: editor de notas/guardado alcanzable a 1280/375, texto de 16 px; fechas y campos de Nueva cita completos dentro del panel, PDF bloqueado y Telegram sin vínculo ofrece vinculación. Ensayo completo de cookies/recuperación/cierre, Calendar vacío→evidencia válida→recarga y reserva→recarga bajo CSP pasa en clínica ficticia; sin conexiones externas. El límite Auth se alcanzó al repetir ensayos y se restableció reiniciando únicamente el fixture local, sin modificar la política del producto.

Vista previa de capturas en [precision-blue.html](docs/design-exploration/precision-blue.html): 39 imágenes ficticias; HTML sin scripts/API. Servidor opcional `node tmp/serve-design-exploration.mjs`, solo 127.0.0.1:4323, rutas estáticas explícitas; API, POST y traversal rechazados. Capturas no equivalen a una demo funcional de los servicios reales.
