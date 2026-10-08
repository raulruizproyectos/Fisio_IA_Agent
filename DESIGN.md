# Fisio Clinical · Precisión azul (v6)

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

Revisión visual posterior al cierre de las 16:08: examinadas las 39 capturas; ajustados el saludo cuando el perfil solo ofrece correo, las acciones de Pacientes a 375 px, la separación del icono de búsqueda y los textos explicativos de métricas. Facturas/bonos/documentos/gestoría muestran una sola representación: tablas en escritorio y tarjetas pobladas en móvil; los estados vacíos, carga y errores conservan la tabla y su aviso. Sin cambios de tokens, IDs/data-* ni controladores clínicos. Ensayo acotado: 45 estados a 375/768/1280 px, con pacientes/citas de clínica ficticia y dobles HTTP explícitos para registros administrativos y errores; sin overflow, errores JS ni tráfico externo. Evidencia y límites en [la revisión](docs/design-exploration/reviews/2026-10-08/README.md). Aceptación visual del usuario pendiente.

`design-tokens.css` fija valores; `precision-blue.css` gobierna el shell y las reglas compartidas. Layout deja de importar la capa editorial de shell y global-shell conserva feedback. Vistas mantienen grids y contratos. Todos los IDs y atributos data-* estáticos de Astro comparados con el punto anterior: conservados.

Chrome sobre build, runtime/CSP generado y clínica ficticia: 46 estados a 375/768/1280 px, sin desbordamiento horizontal ni errores JS ni red externa, controles táctiles, navegación/ficha/copiloto, formularios de paciente/foco/Escape y movimiento reducido. Datos SQL de pacientes/citas en clínica aislada; módulos administrativos/biblioteca usan dobles vacíos explícitos. Evidencias y capturas en el recibo privado `blue-ui-verification.json`.

Frontend check/build y regresiones de Auth, reserva, Calendar, feedback, diálogos y contexto clínico pasan. Backend sin cambios funcionales en este bloque; lint y 100 pruebas pasan. Los ensayos no acreditan Google/Auth/PostgREST reales, nginx/proxy, móvil físico, rendimiento completo ni todos los estados financieros o de ejercicios con registros reales. No SQL Cloud, despliegue, mensajes reales, commit ni push; EasyPanel aparcado.

Comprobación adicional: editor de notas/guardado alcanzable a 1280/375, texto de 16 px; fechas y campos de Nueva cita completos dentro del panel, PDF bloqueado y Telegram sin vínculo ofrece vinculación. Ensayo completo de cookies/recuperación/cierre, Calendar vacío→evidencia válida→recarga y reserva→recarga bajo CSP pasa en clínica ficticia; sin conexiones externas. El límite Auth se alcanzó al repetir ensayos y se restableció reiniciando únicamente el fixture local, sin modificar la política del producto.

Vista previa de capturas en [precision-blue.html](docs/design-exploration/precision-blue.html): 39 imágenes ficticias; HTML sin scripts/API. Servidor opcional `node tmp/serve-design-exploration.mjs`, solo 127.0.0.1:4323, rutas estáticas explícitas; API, POST y traversal rechazados. Capturas no equivalen a una demo funcional de los servicios reales.
