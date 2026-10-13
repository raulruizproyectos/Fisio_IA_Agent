# Recursos para afinar Precisión azul — 13 de octubre de 2026

## Conclusión

Sí hay mejoras aprovechables. La recomendación es conservar Precisión azul y añadir una capa coherente de interacción: selección que se desplaza, paneles que entran y salen con continuidad y estados de carga/guardado que se entienden. La ficha móvil también merece una cabecera más compacta para llegar antes al contenido clínico.

Este documento analiza los recursos solicitados y propone cambios; no modifica el CRM ni acredita su funcionamiento en producción. La muestra interactiva que acompaña el análisis usa datos ficticios y guardado simulado. Las recomendaciones son criterio de diseño adaptado al producto, no resultados de pruebas con usuarios.

## Base observada

Leídos `DESIGN.md`, imports de `Layout.astro`, tokens, reglas de `precision-blue.css`, navegación y cambio de pestañas en `index.astro`. Examinadas cinco capturas ficticias del cierre: Inicio en 1280/375, ficha en 1280/375 y acceso en 1280. No se repitió la galería completa ni la auditoría.

- Ya existen DM Sans, controles de 44 px, foco visible, selección azul, feedback de 120 ms, entrada de pantalla de 220 ms, entrada de diálogo de 240 ms y movimiento reducido. No proponerlos como novedades.
- La entrada de pantalla actual desplaza 6 px; el navegador oculta la pantalla anterior inmediatamente. Una transición entre estados puede dar más continuidad, pero requiere comprobar carga y clics rápidos.
- Las pestañas de la ficha alternan clases `active`; hay margen para una selección deslizante y una aparición breve del contenido.
- La ficha repite la identidad en escritorio. En la captura móvil, el bloque de identidad y cuatro métricas ocupa casi todo el primer viewport antes de las pestañas. Compactarlo tendría un efecto visual y práctico mayor que añadir un fondo animado.
- Las capas CSS importadas tienen tiempos distintos. Al implementar, ajustar solo los componentes elegidos y comprobar sus estilos efectivos; no abrir una limpieza global de CSS.
- Frontend Astro/Tailwind con JavaScript existente, sin integración React ni Motion en `frontend/package.json`.

## Evaluación de los 25 recursos

Las cifras comerciales de componentes/prompts cambian y no se usan como criterio. Se consultaron sus páginas oficiales el 13 de octubre de 2026. Algunas bibliotecas se examinaron mediante su descripción/documentación pública; no se ejecutaron todas sus demos ni se inspeccionó todo su catálogo.

| Recurso | Qué aporta | Decisión para Fisio IA Agent |
| --- | --- | --- |
| [Jiro](https://jiro.build/) | Prompts y plantillas, especialmente páginas comerciales. | Inspiración secundaria para acceso; no sustituir el CRM por una plantilla ni asumir resultados idénticos entre agentes. |
| [Minimal Gallery](https://minimal.gallery/) | Referencias de sitios y composición. | Útil para jerarquía del acceso y calidad tipográfica; seleccionar un ejemplo concreto antes de adaptar. |
| [Kage](https://kage.design/) | Interfaces de productos y traducción a prompts. | Complemento para referencias de productividad/CRM; no adoptar un prompt completo como especificación. |
| [Refero Styles](https://styles.refero.design/) | Sistemas de estilo de productos reales. | Referencia principal, junto con el `DESIGN.md` vigente. Planhat/Ramp ya formaron parte de la dirección elegida. |
| [Component Gallery](https://component.gallery/) | Comparación de componentes de distintos sistemas. | Muy útil para pestañas, diálogos y estados. Comparar comportamiento y jerarquía, conservando componentes propios. |
| [AppShot Gallery](https://www.appshot.gallery/) | Capturas de fichas de App Store y presentación móvil. | Inspiración secundaria. Las imágenes promocionales no demuestran cómo funcionan las pantallas reales. Acceso resuelto con `www`. |
| [DESIGNmd](https://designmd.ai/) | Sistemas de diseño en Markdown. | Ya tenemos `DESIGN.md`. Incorporar allí las decisiones finales, sin reemplazarlo por otro sistema. |
| [VibePrompt](https://vibeprompts.dev/) | Prompts de layouts y fragmentos Tailwind. | Valor menor en un producto ya construido; útil para explorar una superficie específica. |
| [21st.dev](https://21st.dev/) | Componentes, temas y plantillas React. | Inspiración puntual; incorporación directa introduciría otra capa técnica. No instalar un registro por esta investigación. |
| [Kinetics](https://kinetics.colorion.co/) | Ejemplos CSS/React de movimiento y curvas. | Seleccionar feedback y transiciones cortas. Adaptar amplitud/tiempo; no copiar botones magnéticos, rebotes o animación de cifras clínicas. |
| [shadcn/ui](https://ui.shadcn.com/) | Patrones y componentes de interfaz. | Referencia para estructura y estados. Su [guía Astro](https://ui.shadcn.com/docs/installation/astro) exige configurar React; no hace falta para estas mejoras. |
| [Aceternity UI](https://ui.aceternity.com/) | Componentes React animados, principalmente para landing pages. | Inspiración para una futura superficie pública; bajo encaje en agenda/ficha de uso frecuente. |
| [Magic UI](https://magicui.design/) | Efectos y componentes React/Tailwind/Motion. | Reservar lo expresivo para acceso, si se elige una referencia concreta; no importar partículas, marquesinas o contadores. |
| [Motion Primitives](https://motion-primitives.com/docs/animated-background) | Selección animada, disclosures y diálogos. | Alto valor como patrón de continuidad. Lectura directa devolvió 403; consultadas fichas oficiales indexadas, no verificados demos ni código completo. |
| [Uiverse](https://uiverse.io/) | Elementos comunitarios en HTML/CSS y otros formatos. | Una referencia pequeña puede servir; elegir y revisar cada fragmento, sin mezclar estilos de autores. |
| [UIAble](https://uiable.com/) | Sistema basado en shadcn/React y componentes de aplicación. | Referencia secundaria de composición; no reemplazar formularios o componentes existentes. |
| [mapcn](https://www.mapcn.dev/) | Mapas React basados en MapLibre. | Fuera de este refinamiento: no hay un objetivo de mapas ni rutas. |
| [MicroKit](https://microkit.co/) | Microinteracciones CSS/React, pestañas y foco. | Prioritario: adaptar selección deslizante y detalle de foco sin cambiar la semántica del formulario. |
| [Liquid Glass](https://glass.samasante.com/?view=docs) | Refracción del DOM mediante una lente React. | No para texto clínico, formularios o tablas. La página directa no expuso contenido; descripción y requisito React consultados en documentación oficial indexada. Rendimiento no acreditado. |
| [CSS Text Effects](https://text-effects.colorion.co/) | Efectos CSS de texto. | Bajo encaje: conservar lectura inmediata. No revelar letras lentamente ni animar nombres, cifras o notas. |
| [Circle Loaders](https://circleloaders.dominikakissi.com/) | Indicadores SVG autónomos. | Como máximo un indicador discreto del copiloto durante una operación real; texto de estado y variante estática obligatorios. |
| [Gradient Buttons](https://gradientbuttons.colorion.co/) | Tratamientos de botones con degradados CSS. | Opcional y secundario; la acción azul existente ya funciona. Un degradado fijo solo si mejora la muestra elegida. |
| [Kitbitz](https://kitbitz.art/) | Ilustraciones SVG/PNG dibujadas a mano. | Opcional para un estado vacío específico; no mezclar dibujo, 3D y pictogramas. CC0 según página oficial indexada; la lectura directa fue vacía. |
| [3dicons](https://3dicons.co/) | Iconos 3D, con licencia CC0 declarada. | No sustituir Material Symbols en navegación. Un activo aislado podría servir en acceso, si encaja y se revisa su peso. |
| [Anime.js](https://animejs.com/) | Motor JavaScript de animación y secuencias. | Viable técnicamente, innecesario para el alcance propuesto. CSS y Web Animations API cubren estos casos. |

## Dirección fijada para la propuesta

Base dominante: Precisión azul existente. Conservar DM Sans, lienzo `#f4f7fb`, superficies blancas, tinta `#142234`, azul funcional `#175dd0`, radios y densidad de controles actuales. La distinción estará en la continuidad de interacción y en una ficha más legible, sin una nueva paleta o tipografía.

De [Planhat](https://styles.refero.design/style/94c4fc51-4323-4f06-a4a4-27517e190445) se retiene la separación estructural mediante bordes; de [Ramp](https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825), la disciplina de superficies y acciones. Sus colores/fuentes de marketing no se trasladan al CRM. De MicroKit/Motion Primitives se toma solo continuidad de selección y estado. La preferencia del usuario y `DESIGN.md` gobiernan los tokens.

No introducir efectos que muevan el objetivo del clic, scroll forzado, texto progresivo, confeti, brillo continuo o perspectiva en tablas. Azul identifica acción/selección: no comunica aprobación clínica ni sincronización confirmada.

## Mejoras recomendadas, en orden

| Mejora | Cambio concreto | Fuente / motivo | Alcance previsto |
| --- | --- | --- | --- |
| Ficha más compacta | Una identidad dominante; contactos y acciones agrupados; métricas secundarias después del contenido en móvil. | Capturas actuales y objetivo de llegar antes a la información. | `FichaPacienteView.astro` y estilos de ficha/Precisión azul; contratos DOM conservados. |
| Pestañas con continuidad | Un indicador azul que se desplaza en 180–220 ms y entrada de contenido de 4 px como máximo. | [Sliding Underline Tabs](https://microkit.co/components/sliding-underline-tabs), [Animated Background](https://motion-primitives.com/docs/animated-background), [Tabs](https://component.gallery/components/tabs/). | `activateFichaTab`, estilos y contenedor de pestañas; no recargar el caso por animar. |
| Paneles con apertura y cierre coherentes | Entrada de 220–240 ms, salida algo más corta, fondo que acompaña, sin rebote. | [Dialog](https://motion-primitives.com/docs/dialog), guía motion de la skill y diálogo existente. | Primero el panel de cita y el copiloto; revisar el controlador real antes de tocar el cierre. |
| Feedback de guardado | Espacio estable para estado ocupado, confirmación breve solo tras respuesta real y error persistente. | Patrón de estados de componentes y restricciones del producto. | Reutilizar feedback existente; sin aprobación optimista ni temporizadores que inventen éxito. |
| Carga estable | Skeleton con tamaño aproximado del contenido, solo durante lectura real; transición corta al dato recibido. | [Skeleton](https://ui.shadcn.com/docs/components/base/skeleton). | Empezar en una lista; diferenciar carga, vacío y error. No añadir una espera mínima artificial. |
| Acceso con mejor primera impresión | Afinar composición y profundidad del formulario; posible detalle de marca estático, entrada breve una sola vez. | Minimal Gallery y referencias del acceso actual. | Login/recuperación después de ficha y paneles; conservar controladores y accesibilidad. |

Hover/pulsación ya existen: afinar su coherencia si estos componentes la necesitan. No animar todas las tarjetas ni las métricas a la vez. Cada ajuste debe apreciarse en uso y conservar lectura inmediata.

## Implementación mínima viable

No añadir React, Motion, Anime.js ni otro paquete para este alcance. Usar tokens existentes, CSS para estados simples y [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) cuando haya que coordinar o cancelar una transición. Preferir `transform`/`opacity`; las propiedades que afectan al layout necesitan evaluación específica, según [web.dev](https://web.dev/articles/animations-guide).

[View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) puede servir para navegación dentro del documento, pero es una alternativa posterior. Primero bastan pestañas y paneles. Si se emplea, detectar soporte, conservar fallback inmediato y evitar capturar como transición toda la pantalla clínica. No se ha verificado aquí su comportamiento en los navegadores del usuario.

Primer cambio propuesto: ficha compacta + selección de pestañas. Segundo: paneles y estados de operación. Tercero: acceso. No extender automáticamente el trabajo al backend, n8n, Supabase ni publicación.

## Comprobación proporcional al implementar

Comprobar los componentes afectados a 375/768/1280 px, teclado, foco, Escape, cierre durante animación, clics rápidos y `prefers-reduced-motion`. Sin desbordamiento, acciones cubiertas o pérdida de datos; reabrir un panel mientras cierra no debe dejarlo bloqueado. Hover solo donde el dispositivo lo admite.

Para guardado/carga: éxito, rechazo y respuesta incierta deben seguir siendo distintos. Ninguna animación puede iniciar una segunda escritura, ocultar avisos Calendar o habilitar PDF/envío antes de aprobación profesional. Ejecutar frontend check/build y las regresiones que alcance cada cambio. Estas pruebas del CRM no se han repetido para escribir el análisis.

No se cambiaron fuentes de producción, secretos, migraciones, servicios o workflows; sin instalaciones, gasto IA, commit, push, despliegue ni envíos. `docs/CONTINUAR.md` y `docs/PROMPT_CONTINUAR.txt` se conservan.

## Comprobación de la muestra

Muestra de ficha contenida, sin conexión al CRM, con DM Sans existente embebida. Chromium: 320/375/736 px sin desbordamiento; selección rápida de pestañas, guardado simulado, apertura/cierre, Escape y retorno de foco comprobados. Movimiento reducido: indicador sin transición y paneles sin animaciones. Sin errores JavaScript en estos casos.

La prueba se ejecutó con el fragmento cargado en memoria: el entorno bloqueó el acceso al servidor local de vista previa, que quedó detenido. Los recursos CDN de iconos/tooltips del visor se bloquearon durante QA; por tanto, esa prueba acredita composición y lógica local, no la carga de esos recursos en el visor de Codex. La muestra no acredita rendimiento en móvil físico, guardado real, compatibilidad de todos los navegadores o flujos del producto. No se repitieron suites del CRM para este análisis.
