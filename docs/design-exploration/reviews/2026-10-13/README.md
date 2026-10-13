# Refinamiento de Precisión azul — 13 de octubre de 2026

**Actualización de publicación:** el frontend ya está desplegado en `c062967`. Este documento conserva la QA local previa; consultar [production.md](production.md) para estado publicado, comprobaciones reales y la alerta automática ocurrida durante las pruebas negativas Auth.

Implementación local de las mejoras autorizadas por el usuario tras [el estudio de 25 recursos](../../2026-10-13-recursos-premium.md). Se conserva el sistema visual vigente y no se reconstruye el producto.

## Resultado

- Una identidad visible en la ficha, cabecera más compacta y resumen con etiquetas/valores separados. Los contactos conservan su lugar y las cuatro métricas complementarias siguen disponibles bajo «Seguimiento del caso», después del contenido.
- Indicador deslizante y entrada breve de contenido en las seis pestañas. Alineación al redimensionar o cargar la fuente; desplazamiento limitado al navegador horizontal de pestañas.
- Paneles con entrada de 240 ms y salida de 180 ms. Los cerrados quedan inertes inmediatamente; el cierre devuelve el foco cuando corresponde. Reabrir durante la salida interrumpe la transición. Escape cierra los paneles de cita y el copiloto. Tab/Shift+Tab circulan dentro de los modales y del copiloto móvil; el copiloto de escritorio permite continuar hacia el espacio de trabajo. Firma y voz cerrados también quedan inertes.
- Skeleton únicamente durante carga, con aviso textual; vacío y error conservan su mensaje. La lista de pacientes aparece con una transición breve. No hay espera artificial para mostrar los datos.
- Notas y acceso muestran estado ocupado durante su solicitud. La confirmación sigue dependiendo de la respuesta real y del refresco existente; rechazo/incertidumbre conservan avisos y borradores. La ficha con datos incompletos indica «Vista parcial del caso».
- Acceso con composición y profundidad discretas, recorrido Agenda/Seguimiento/Revisión usando los iconos existentes. Recuperación comparte el acabado. Tipografía, paleta, controles táctiles y revisión profesional obligatoria conservados.
- Corrección posterior al feedback del usuario: silueta corporal con brazos completos, proporciones revisadas, separaciones finas y composición centrada. «Selecciona una zona» aclara la interacción; Enter/Espacio activan el mismo selector existente. Los diez IDs y sus seis valores `data-zone` permanecen intactos.

Sin paquetes, fuentes o activos nuevos. `clinical-motion.js` sincroniza la selección visual de pestañas y el foco de los overlays existentes. No cambia permisos, endpoints o reglas clínicas.

## Verificación fresca

| Comprobación | Resultado |
| --- | --- |
| Frontend `npm run check` | 40 archivos, cero errores/avisos/hints. |
| Frontend `npm run build` | Cuatro páginas compiladas; aviso previo Shiki/CSP sin nuevos avisos. |
| Backend `npm run lint` y `npm test` | Lint correcto y 106/106 pruebas. |
| `node scripts/test-clinical-motion.mjs` | Inercia/retorno y circulación de foco, selección, redimensionado y distinción carga/vacío/error. |
| `node scripts/test-ficha-save-context.mjs` | Estado ocupado, una sola escritura, borradores/contexto, rechazo y guardado con refresco fallido. |
| Regresiones de confirmación y toast | Escape, devolución de resultados/foco y persistencia de errores/advertencias. |
| Regresiones de Auth, recuperación de altas y contexto de citas | Cookies/CSRF, no repetición de escrituras, contexto y Calendar pendiente conservados. |
| CSP del build y reserva pública | Cuatro páginas y 16 escenarios de reserva pasan. |
| Guardas de configuración pública y runtime | Aceptación/rechazo de configuración y 33 escenarios runtime pasan; shell con fixtures locales, sin nginx. |
| Scanner frontend | 80 archivos sin credenciales privilegiadas reconocidas ni secretos locales. |
| Chromium sobre build real | 375/768/1280 px, cero desbordamiento horizontal, errores JS o solicitudes externas. |
| Contratos DOM | Todos los IDs y atributos data-* previos de los Astro modificados siguen presentes. |

El navegador ensayó carga de pacientes, las seis pestañas, expansión de métricas, nota aceptada/rechazada, doble envío mientras estaba pendiente, ficha parcial, apertura/cierre/reapertura de citas, copiloto y alta de paciente con Escape/retorno de foco, movimiento reducido, layout de recuperación y rechazo de acceso. Todas las API/Auth fueron interceptadas con respuestas ficticias en memoria; no hubo conexiones con Cloud o proveedores. No se ensayó el login profesional real de nuevo.

Recibo y doce capturas ficticias privados: `.private-backups/local-validation/premium/2026-10-13/verification.json` y `ficha-*`, `pain-map-*`, `login-*`, `reset-*`. El mapa se comprobó a 375/768/1280: geometría dentro del viewBox, selección por teclado, editor sin overflow y cero escrituras al seleccionar. Frontend check/build y regresiones de mapa/guardado y CSP pasan tras la corrección. Helper reproducible local: `node tmp/check-premium-polish.mjs` desde la raíz, con Playwright del runtime de Codex y Chrome instalado. No publica ni levanta servicios.

La primera suite backend dentro del sandbox pasó 87 pruebas y falló 19 por `connect EACCES 127.0.0.1`. La repetición autorizada fuera de esa restricción pasó las 106; no se cambió código backend para resolverlo. La QA detectó y corrigió la prioridad CSS de movimiento reducido. Los primeros fallos de la comprobación visual por interpretación de `sr-only` y selector incorrecto correspondían al helper de QA, corregido antes de la ejecución final.

En el cierre adicional se reprodujo que Tab desde el último botón de Nueva cita salía hacia controles detrás del modal. Corregido en el helper existente, con pruebas de límites en ambos sentidos, exclusión de controles deshabilitados y respeto de eventos ya manejados. El build real comprueba los límites de Nueva cita en los tres tamaños y del copiloto móvil a 375/768. Check/build y regresiones afectadas vuelven a pasar tras esta corrección. CI incorpora las regresiones de movimiento/foco, guardado de ficha y confirmación; todavía sin ejecutar en GitHub para estos cambios locales.

Las dos pruebas de configuración inicialmente no pudieron ejecutar Git Bash bajo el sandbox Windows (`NtCreateDirectoryObject`, acceso denegado). Pasaron al ejecutarlas con la excepción autorizada para esos fixtures locales. No se modificaron las guardas para sortear el fallo del entorno.

## Primera prueba de estas mejoras

La preparación local está terminada. Para realizar este recorrido en la URL pública hace falta publicar y desplegar el frontend con autorización expresa; la URL actual conserva el cierre anterior.

1. Acceder con la cuenta profesional existente y comprobar la legibilidad y navegación en escritorio y móvil.
2. Abrir un paciente ficticio: revisar las seis pestañas, desplegar Seguimiento del caso y seleccionar varias zonas del mapa corporal. La selección por sí sola no guarda una nota.
3. Guardar una nota ficticia y comprobar que aparece una sola vez después de recargar. Abrir Nueva cita y el copiloto; comprobar cierre, reapertura y navegación con Tab/Escape.
4. Comunicar cualquier fallo con la acción, resultado esperado, observado, dispositivo/navegador y hora aproximada, sin contraseñas ni datos clínicos.

Para el recorrido de Calendar y la revisión/aprobación previa a PDF o envío sigue vigente [PRODUCTION_TESTING.md](../../../PRODUCTION_TESTING.md). Los envíos reales y la IA con gasto mantienen su autorización específica.

## Alcance y límites

Cambios solo locales, sin commit/push ni despliegue; producción conserva la versión anterior. No se tocaron migraciones, Supabase, n8n, cron, secretos o documentos de continuidad del cierre. Sin mensajes/emails reales o IA con gasto.

No se acredita móvil físico, Safari/Firefox, rendimiento completo o proveedores reales para esta versión. Los resultados de producción del 8 de octubre siguen siendo históricos. Las capturas y dobles no sustituyen la primera prueba del usuario ni una aprobación de despliegue.
