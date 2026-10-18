# Project Status

## Punto de situación — 18-oct-2026, cierre del día

**Producción** (EasyPanel, proyecto `fisio-ia-agent`): frontend `cf4e236`, backend `fb20a11`; CI verde. Rama `main` en GitHub al día; solo `.claude/` queda fuera de Git (no versionar).

**Hecho hoy (18-oct)**
- Demo al cliente preparada en local (`?demo=true`, datos ficticios de `lib/demo-api.ts`); la fisioterapeuta de la demo es **Carla Jiménez Lores**.
- Logo de Fisioteràpia CarlaJL como medallón en menú lateral y acceso (`frontend/public/brand/`).
- Nombre visible «Fisioteràpia CarlaJL» en menú, acceso, pestañas y reserva pública (valor por defecto).
- Paleta v8 «Noche clínica aguamarina» derivada del logo (DESIGN.md v8): índigo y azul noche sustituidos por aguamarina `#136f74` y tinta `#0c1314` en todas las secciones antiguas; 0 colores índigo/azul calculados a 1280/1366/390.

**Pendiente, por prioridad**
1. Prueba real de Raúl en el CRM de producción (Claude solo verificó la demo local).
2. Nombre oficial de la clínica en producción (Ajustes → `crm_clinicas`): poner «Fisioteràpia CarlaJL» para que facturas, consentimientos e informes lo usen. Es dato de producción: pedir confirmación.
3. Seguridad (lo hace Raúl): regenerar en EasyPanel el token de despliegue de `fisio-backend` (expuesto en un log el 13-oct).
4. CRM: pantalla para cambiar la contraseña dentro de la app (hoy solo `/reset-password`) y restringir a admin la edición del contacto de la clínica.
5. Deuda CSS: regla global sin capa en `Layout.astro` (`*, *::before, *::after { margin: 0; padding: 0 }`) que anula los espaciados de Tailwind v4; corregir midiendo todas las vistas y estados (lunes, vacíos, modales) con `tmp/css-prune/`.
6. Desde el 20-oct: paso 11, quitar la rama heredada `patient_appointments` de `/api/telegram/incoming` si la semana pasa sin incidencias.
7. Cierres propios de la clínica en `BOOKING_EXTRA_HOLIDAYS` (confirmar fechas en el DOGC).
8. En pausa hasta que Raúl lo pruebe: agente de citas (naturalidad) y piloto de reservas (M-03..M-10). Después: piloto de WhatsApp con OpenWA.
9. Antes del uso real: limpiar los pacientes de prueba de producción (QA, @debug, Raúl…).

**Cómo verificar cambios visuales**: servidor local en `127.0.0.1:4321` (`?demo=true`); `tmp/css-prune/palette-audit.mjs <carpeta>` (13 vistas + copiloto + 4 modales + acceso + reserva a 1280/1366/390, avisos de maquetación y escaneo de color) y `audit-monday.mjs` para la semana sin fin de semana. Un solo Chrome a la vez.

## Estado vigente — 18-oct, 18:30 Europe/Madrid — paleta aguamarina + tinta (DESIGN.md v8)
- Paleta derivada del logo: acento `#136f74`, navegación en tinta `#0c1314`, lienzo `#f2f6f6`; tabla completa de equivalencias v7→v8 en `DESIGN.md`. Barrido de 803 literales (índigo, violeta, azul noche, grises lavanda, pizarra y celeste) en `premium-system.css`, `design-tokens.css`, `reserva.astro`, `index.astro`, `Layout.astro` y vistas; clases Tailwind sky/blue pasadas a teal.
- Marca visible: «Fisioteràpia CarlaJL» en menú, acceso, títulos de pestaña y reserva pública (valor por defecto).
- Verificado con `tmp/css-prune/palette-audit.mjs`: 0 colores índigo/azul calculados en 13 vistas + copiloto + 4 modales + acceso + reserva a 1280/1366/390, avisos de maquetación idénticos a los de antes, 0 errores JS. Capturas antes/después en `tmp/css-prune/pal-before`, `pal-after2`, `pal-modals`, hojas en `pal-sheets/`.

## Estado vigente — 18-oct, 17:00 Europe/Madrid — logo de Fisioteràpia CarlaJL (fase segura)
- Logo original en `frontend/public/brand/carlajl-logo-original.png`; recortes circulares `carlajl-mark-{96,192,512}.webp`.
- Medallón redondo blanco en el menú lateral (40 px, también plegado y en móvil) y en la pantalla de acceso (112 px; 80 px en móvil). Colores sin cambiar; estilos al final de `premium-system.css`.
- Demo local: la fisioterapeuta es Carla Jiménez Lores (`lib/auth.ts`, `lib/demoData.ts`, respuesta simulada en `index.astro`).
- Verificado a 1280, 1366 y 390 (imagen cargada, sin scroll horizontal). La paleta derivada del logo se hizo después (v8, ver arriba).

## Estado vigente — 18-oct, 16:40 Europe/Madrid — pulido tras revisión de Raúl

Frontend `69e6582` (backend `fb20a11`). Raúl revisa la demo en su portátil (escalado de Windows → ~1280 px CSS): verificar siempre a 1280 además de 1366/390.

- Diálogo de confirmación con medidas explícitas. Causa raíz pendiente: `Layout.astro` (`<style is:global>`) tiene `*, *::before, *::after { margin: 0; padding: 0 }` sin capa, que anula las utilidades de Tailwind v4 (en `@layer`). Quitarlo exige revisar todas las vistas que usan clases Tailwind.
- Ficha: tarjetas de progreso a 20 px; Pacientes estrecho con consulta de contenedor; Inicio con copiloto abierto (KPIs 2×2); método de pago segmentado; IVA a ancho completo; ilustraciones SVG de ejercicios en la demo (`frontend/public/demo/exercises`).
- Rediseño con el logo de Fisioteràpia CarlaJL: hecho el 18-oct (logo b0e66dc, paleta v8 cf4e236).

## Estado vigente — 18-oct, 08:15 Europe/Madrid — demo al cliente lista

Producción: backend `fb20a11`, frontend `b1eb7bd`, CI verde.

- **Demo en local** (decisión de Raúl): `npm --prefix frontend run dev -- --port 4321 --host 127.0.0.1` y abrir `http://127.0.0.1:4321/?demo=true`. `lib/demo-api.ts` responde con datos ficticios (cobros, facturas, bonos, bandeja, historial, Calendar, planes) solo en desarrollo; no llega al build de producción. Citas ficticias en horario local repartidas por la semana.
- **Poda de CSS revertida** (`232c407`): había retirado las reglas de la rejilla de 5 días porque todas las mediciones se hicieron con citas en fin de semana. `premium-system.css` conserva la consolidación con el contenido original de cada hoja. Comprobado en producción: semana sin fin de semana con 5 columnas.
- Producción contiene solo pacientes de prueba (QA, @debug, Raul…): no usar para la demo; limpiar antes de uso real.
- Otros: formato de euros con separador de miles en todas las vistas; fecha correcta en la bandeja de Inicio; textos del motor de respaldo de planes en castellano clínico.

## Estado vigente — 17-oct, 23:00 Europe/Madrid — preparación de la demo al cliente (18-oct)

Producción: backend `3ed3c17`, frontend `eb0867d`, CI verde en cada paso. Detalle de seguridad y marca en [AUDITORIA_SEGUNDA_PASADA.md](AUDITORIA_SEGUNDA_PASADA.md).

- Marca de clínica desde `crm_clinicas` (`lib/clinic-brand.js`); cambio de contraseña exige la actual salvo tras enlace de recuperación; `/public-booking/config` sin email del profesional.
- CSS: todas las hojas antiguas dentro de `premium-system.css` en su orden original (la poda de 1.888 declaraciones se revirtió el 18-oct, ver arriba). `Layout.astro` importa solo `global.css`, `design-tokens.css` y `premium-system.css`. Verificado con volcado de estilos calculados (13 vistas × 5 anchuras + modales): sin diferencias.
- Pulido de demo: Finanzas («Tarjeta» sin recuadro), Planes (celdas a 16 px), Historial (avisos como etiquetas), cabeceras con etiqueta en Agenda/Planes/Documentos/Historial, cabeceras móviles alineadas a la izquierda, ficha móvil, barra de Mensajes, tildes en textos y avisos del copiloto. La reserva pública abre en el primer día con huecos (comprobado en producción: abre el lunes 19 con 6 huecos).
- No verificado por Claude: sesión real del CRM en producción (requiere tu inicio de sesión), cobro, factura, bot de Telegram.

## Estado vigente — 16-oct, 18:18 — segunda opinión con Calcode

Encargo nuevo: continuar auditoría independiente de código/diseño/funciones para testing final. Antes de auditar, contexto y propuesta de modelo/razonamiento/agentes con menor consumo compatible con el resultado; esperar confirmación. [PUNTO_SITUACION_2026-10-16.md](PUNTO_SITUACION_2026-10-16.md) concentra estado, evidencias, cobertura y pendientes. [Prompt completo](PROMPT_AUDITORIA_CLOUDCODE.txt).

Verificado por lectura remota: frontend ea7f998, backend 3d4cce7; Calendar healthy y W5 publicado con intervalo correcto. Primera prueba de Raúl en curso. La auditoría previa y los fixes están publicados/desplegados; el commit de este cierre solo actualiza documentación, sin redeploy. No equivale a validación de todos los proveedores, DB/RLS o entrega clínica. Pausa del booking y autorizaciones por acción/destino siguen vigentes. Las entradas posteriores son antecedentes.

## Estado vigente — 16-oct, 17:10 Europe/Madrid — corrección Agenda en producción

Frontend desplegado con autorización expresa en `ea7f998`, [CI verde](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38911381365). Contenedor running, `/health` 200 y configuración preservada; backend sigue `3d4cce7`, n8n sin cambios. Cinco tamaños sobre los archivos públicos con bloqueos largos/simultáneos ficticios pasan: columnas/tarjetas contenidas y detalle accesible, sin errores JS. No acredita nueva sesión real ni proveedores. [Evidencia y límites](INCIDENCIA_CALENDAR_HISTORIAL_2026-10-16.md). Seguimiento postdeploy conservado solo en local, sin otro commit/push.

## Nueva prueba — columnas de Agenda (solo local)

Publicación autorizada después de verificar: Raúl aprueba el commit y, por separado, push a main. La entrega que contiene esta entrada reúne la corrección y seguimiento; verificar su CI. Deploy de esta versión frontend todavía pendiente de autorización específica. «Local/sin publicar» registra la verificación previa.

Raúl detecta que bloqueos Calendar con texto largo invaden otros días. Corregido el mínimo de columnas/celdas, el ajuste de cadenas largas y la separación de datos móviles, conservando disponibilidad y detalle. Prueba de cinco anchuras 375–1920, check/build, backend lint/214 pruebas y carga Agenda pasan. [Incidencia y evidencia](INCIDENCIA_CALENDAR_HISTORIAL_2026-10-16.md). Base publicada/desplegada `e3a4773`; esta corrección requiere nueva autorización de commit/push/deploy frontend. No cambia backend ni n8n.

## Cierre operativo — 16-oct, 15:09 Europe/Madrid

Incidencia publicada en `e3a4773`, CI [38905155872](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38905155872) verde. Con autorizaciones específicas posteriores: frontend desplegado en ese commit y W5 actualizado/publicado conservando credenciales, nodos, conexiones y activación. Backend sigue en `3d4cce7`. Lecturas Calendar HTTP 200 respetando intervalos; ciclo automático 15:08:25 `healthy`, sin error actual. Archivos públicos frontend verificados en 12 estados a 375/1280 con API ficticia, además de 24 locales. Bot pausado, sin envíos. [Cierre y límites](INCIDENCIA_CALENDAR_HISTORIAL_2026-10-16.md). Actualización de seguimiento posterior solo local; los bloques siguientes son antecedentes.

## Primera prueba — 16-oct, posterior al despliegue

Publicación de esta incidencia autorizada: Raúl aprueba expresamente el commit y, por separado, el push a main. Esta entrega reúne las correcciones descritas debajo; consultar su CI antes de desplegar frontend o actualizar W5, acciones todavía no autorizadas. Las referencias a local/sin publicar registran el snapshot previo a esa autorización.

Backend/frontend verificados en EasyPanel en `3d4cce7`, CI verde. Raúl detecta Calendar no disponible y fallos de distribución en Inicio/Agenda/Historial. Corregida la presentación en local y verificada en 24 estados móvil/escritorio; todavía sin nueva publicación. Ejecución manual confirma acceso Google no renovable; Raúl reconecta la cuenta y W5/W6 (solo lectura) vuelven a HTTP 200. Ciclo automático de las 15:02:25 correcto, `healthy`, sin error actual. Corregido también en fuente local el intervalo W5 para Google Calendar 1.3, con regresión; requiere autorización específica antes de actualizar n8n activo. [Incidencia, pruebas y límites](INCIDENCIA_CALENDAR_HISTORIAL_2026-10-16.md). Las referencias posteriores a «sin publicar/desplegar» describen el cierre anterior de la auditoría.

> Publicación autorizada el 16-oct: Raúl autoriza expresamente el commit de esta tanda y, por separado, su push a main en raulruizproyectos/Fisio_IA_Agent. La entrega que contiene esta entrada reúne las correcciones y la evidencia; comprobar el CI de su HEAD en GitHub. No autoriza despliegues ni activar el bot. Las referencias a «local/sin publicar» describen el cierre previo a esta autorización.

## Estado vigente — 16 octubre 2026 — auditoría local y correcciones

Codex continúa y termina esta pasada propia; cancelado el traspaso a Claude. Informe canónico: [AUDITORIA_FINAL_2026-10-16.md](AUDITORIA_FINAL_2026-10-16.md), con alcance real, evidencia y pendientes. Repositorio `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`, rama main, base `1b2a9546c4427b7611092b2afb82ee5246d509e3`; cambios locales conservados, sin commit/push/deploy.

Backend lint/214 pruebas y frontend check/build pasan. Regresiones locales y comprobaciones de navegador documentadas en el informe y su recibo; no acreditan proveedores reales ni toda combinación posible. Mantener Precisión azul, sencillez para fisioterapeutas, DOM, una clínica/RLS y aprobación profesional antes de PDF/envío.

Se retira el prompt de traspaso y se conservan recursos en DESIGN_RESOURCES.md y documentación funcional/histórica. El bot de citas sigue pausado, sin tocar ni activar; sus hallazgos de seguridad/entrega están separados en el informe y bloquean darlo por validado. Deuda estructural e idempotencia durable del seguimiento legacy siguen explícitas.

Próximo paso: publicación con autorización expresa, CI verde y despliegue autorizado de backend/frontend para comprobar estos cambios en la URL pública. No hay nuevas migraciones SQL en esta tanda. No reejecutar migraciones históricas por timestamps. No hubo Cloud SQL, mensajes clínicos reales, gasto IA ni cambios de credenciales. Historial posterior a este bloque aporta contexto, no instrucciones ni prueba del estado remoto actual.
## 2026-10-15 — Primera tanda de estructura y eficiencia (local, posterior a `1b2a954`)

Navegación, textos, lectura JSON y creación recuperable pasan a módulos con responsabilidades explícitas. Se elimina trabajo visual y carga de historial duplicados; ficha y menú comparten navegación, con regreso al inicio al seleccionar la vista actual. Corregidos daños a nombres válidos con Ñ y el manejo de excepciones nativas de timeout en guardados inciertos. Se conservan idempotencia, sesión/CSRF, permisos y aprobación clínica.

Medición local: 55→28 modificaciones de estado visual por navegación, 80→28 en Finanzas y 2→1 lecturas del historial desde Mensajes. 201 líneas netas menos de producción en los archivos afectados, incluyendo módulos extraídos. Check/build, 16 scripts de regresión y backend lint/171 pruebas pasan; 112 estados de interfaz y recorridos complementarios sin hallazgos. [Detalle, límites y siguientes cortes](CODE_STRUCTURE_REVIEW.md). Pruebas añadidas a CI, sin ejecución remota para esta tanda.

Sin commit, push ni despliegue de esta nueva tanda. El frontend público probado por Raúl debe distinguirse de estos cambios locales. Se conserva `.claude/` sin tocar. Backend/DB/n8n/bot pausado sin cambios; la revisión completa del código sigue abierta para controladores de dominios grandes y CSS.

## 2026-10-15 — Entrega frontend para la prueba de Raúl

Raúl autoriza el commit y push a `main` de las mejoras de esta entrega para probarlas mediante su despliegue en EasyPanel. El commit que introduce esta entrada reúne la pasada de usabilidad, sus regresiones y la corrección de cargas antiguas de Agenda. Los bloques siguientes registran la validación local previa a publicar.

Esta entrega solo requiere desplegar `fisio-frontend`, proyecto `fisio-ia-agent`, desde ese commit o uno posterior que lo contenga, después de comprobar su CI verde. Si el despliegue de Raúl arrancó antes de la publicación, repetir frontend para incorporar los cambios. Backend, DB, n8n y bot pausado no cambian. La revisión estructural completa del código sigue pendiente; publicar esta mejora no la da por terminada. El estado del CI se consulta en GitHub y el commit realmente desplegado en EasyPanel; este registro no acredita por sí mismo el despliegue.

## 2026-10-15 — Pasada de usabilidad completa en móvil/escritorio (local)

Revisión de todas las secciones del CRM, ficha/Copiloto, cinco formularios y acceso/recuperación/reserva pública, con el criterio de Raúl: facilidad para fisioterapeutas sin conocimientos informáticos, conservando funciones. Se simplifican duplicados en Inicio/Pacientes/Finanzas, nombres y búsqueda; Mensajes se lee como fichas en móvil; Ajustes usa perfil y estados comprobados; formularios financieros cierran con Escape; reserva pública con introducción compacta y ayuda desplegable.

112 estados a 375/768/1280/1920 px sin errores JS ni hallazgos del detector, más recorridos complementarios a 375/1280. Check/build y regresiones pasan; lint/backend 171/171. [Informe, cobertura y límites](UX_REVIEW_2026-10-15.md). No commit/push/despliegue; no cambios en backend, DB, n8n o bot pausado. La aceptación por un fisioterapeuta y la comprobación en móvil físico quedan pendientes. Siguiente trabajo solicitado: estructura, eficiencia y mantenibilidad. [Primer diagnóstico y orden de continuación](CODE_STRUCTURE_REVIEW.md); carrera de cargas de Agenda corregida con regresión antes/después y nuevas regresiones añadidas a CI. La modularización general no está completada.

## 2026-10-15 — Simplificación de Agenda en Inicio (local, pendiente de publicación)

Raúl pide menos redundancia y establece para todo el CRM sencillez, uso intuitivo y conservación de funcionalidades. Esta entrega aplica ese criterio a Inicio: se retiran los accesos genéricos a Agenda del saludo y de la barra superior; se mantienen menú/dock y «Ver agenda» en Semana clínica. La próxima sesión se integra en ese bloque con su acceso a ficha; sin próxima cita o si falla la carga, se oculta esa tarjeta y el listado conserva su estado vacío/error y acceso a Agenda. Se conservan los IDs y atributos data-* de la vista y los controles de gestión de citas.

Validación local sobre build con respuestas ficticias: 16 casos (375/768/1280/1920 px; vacío, cita vinculada, cita sin vínculo y error), navegación a ficha/agenda y apertura de nueva cita, sin errores JavaScript ni desbordamiento horizontal. Regresión `scripts/test-dashboard-next-session.mjs`, frontend check sin diagnósticos y build pasan. Backend intacto respecto al bloque Calendar ya verificado; bot sigue pausado. Capturas y recibo privados en `.private-backups/local-validation/agenda/2026-10-15/`. No commit, push ni despliegue de esta mejora; producción conserva el frontend anterior. No es una auditoría completada del resto del CRM.

## 2026-10-15 — Incidencia Calendar: recuperación de lectura publicada y desplegada

Raúl comunica un correo CRITICAL de POST `/api/profesional/appointments/sync-calendar`, `2026-10-15T11:30:32.434Z` (13:30 Europe/Madrid). Lectura posterior: sync `healthy`, último éxito 16:04, último error todavía 13:30; readiness 19/19 y cero integraciones necesarias ausentes. W5 y Calendario sync activos, sin historial de errores actual retenido (`saveDataErrorExecution: none`); no se puede atribuir el corte original a una causa concreta. La ruta falla antes de reconciliar las citas cuando la lectura Calendar no es válida.

Por petición de solucionarlo, se implementó en `professional.js` un único reintento de lectura W5 en la sincronización, con pausa de 300 ms, para timeout/red/HTTP 408 o 5xx. Cada intento conserva el límite de 8 s, dentro de los 120 s del workflow. No reintenta 401/403/429, JSON inválido o respuesta incompleta; no cambia las reservas ni las escrituras Calendar. Log técnico estructurado con categoría/intento, sin cuerpos, credenciales o datos de pacientes. Si vuelve a fallar, conserva el 503 y la alerta existente. Esto mejora la recuperación, no garantiza que el proveedor nunca falle.

Regresión sobre el handler real: fallaba antes, pasa después. Backend lint y 171/171 pruebas; frontend check 42 archivos sin diagnósticos y build cuatro páginas pasan. Commit de código `094d11deafba800fe90ab7e31bfe84be5fb401cc`, publicado en main y desplegado con autorización expresa en `fisio-backend`, proyecto `fisio-ia-agent`, tras [CI 38749644955](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38749644955) completo verde. La base backend desplegada `9a1a879` no tenía diferencias respecto a la base anterior del cambio; no se arrastraron otras modificaciones backend.

Verificación posterior 15-oct 16:20 Europe/Madrid: readiness 19/19, cero integraciones necesarias ausentes, sync `healthy`, éxito automático `2026-10-15T14:20:25.165Z` y ningún error desde el reinicio. Hash de todas las variables EasyPanel idéntico antes/después; ningún cambio en workflows, configuración o bot pausado. Se esperó el cron existente, sin ejecutar una sincronización manual ni provocar fallos reales. Recibos privados del diagnóstico, CI y despliegue en `.private-backups/local-validation/production/2026-10-15/calendar-incident/`. No redesplegar por el commit posterior de cierre documental. La revisión de diseño cerrada del bloque siguiente sigue vigente.

## Estado vigente — 2026-10-14: revisión de diseño del CRM CERRADA (partes 1–3 desplegadas, último commit de código `efb18b7`)

- **Parte 1 — textos ajustados** (`f1ccd18`, desplegado en `fisio-frontend`, verificado en la URL pública): auditoría en demo a 1280/375 px (capturas + detector de cortes/desbordes, herramientas en `tmp/design-audit/`, ignorado por git). Tildes en ~300 textos visibles (sin tocar identificadores ni valores `data-*`; contratos DOM idénticos a HEAD). `statusText()` da etiqueta humana a los estados (`no_show` → «No asistió») y `precision-blue.css` fija una paleta semántica única de chips. Agenda: las citas en la pausa 13–15 h o fuera de horario ya no desaparecen (fila «Pausa»/«Fuera de horario»). Inicio: lista de trabajo legible, nombres sin «Dr.», métricas alineadas, importes `fmtEuro` («110,00 €»). Pacientes: email con elipsis y «Abrir ficha» sin cortar. Ajustes móvil sin palabras partidas. Check/build y pruebas de `scripts/test-*.mjs` en verde.
- **Parte 2 — copiloto y movimiento** (`05daf42`, desplegado en `fisio-frontend`; decisión de Raúl del 14-oct):
  - Copiloto, mejora **A**: ficha compacta (iniciales, nombre, «edad · motivo · EVA» solo con datos reales, «Cambiar» muestra el selector, «Ver contexto» despliega `#assistantContextPanel`). Desaparecen el selector duplicado y la fila «Contexto cargado». B y C descartadas.
  - Movimiento (`frontend/src/lib/motion.ts`, 200–400 ms, sin librerías, apagado con `prefers-reduced-motion`): el botón «Copiloto Clínico» se despliega en el panel (clip-path 340 ms, solo ≥1024 px); contadores de Inicio una vez al cargar; Agenda y Pacientes escalonadas al abrir la sección (no en recargas posteriores); el chip de una cita pasa del color anterior al nuevo al confirmar/completar (transición CSS, que sí supera los `!important` de la paleta).
  - Finanzas: tarjeta «Ingresos por mes» (`lib/income-chart.ts`, SVG propio a ancho real) con los totales de `/api/pagos/resumen` del año filtrado; sin datos o con error muestra estado vacío (nunca datos inventados). La línea se detiene en el mes actual. Conmutador Barras ⇄ Línea animado.
  - Validación: check 0 diagnósticos, build, `scripts/test-*.mjs` en verde salvo los 2 de PG/pglite (entorno); contratos DOM sin eliminaciones (solo IDs/`data-*` nuevos); auditoría a 1280/375 sin hallazgos nuevos. `tmp/design-audit/probe.mjs` (ignorado) mide animaciones por CDP y admite `PRELOAD` (stub de prueba) y `SHOT`.
  - En la demo (`?demo=true`) sin backend, el gráfico muestra «No se pudieron cargar los ingresos»: es el estado honesto.
- **Parte 3 — hallazgos pendientes resueltos** (14-oct, a petición de Raúl): «Semana clínica» de Inicio con jerarquía hora | paciente + motivo | estado y etiquetas de día discretas; tira «Sesiones mes / Motor clínico / Gráfico anual» oculta con `hidden` (IDs conservados para los controladores); Finanzas sin tarjetas duplicadas de cobro/factura (ya están en la cabecera; quedan bono y gestoría); jerga «readiness»/«Offline»/«Migraciones pendientes» sustituida por textos claros en Ajustes.
- **Punto de continuación:** la revisión de diseño no tiene tareas abiertas. Siguientes pasos posibles, todos pendientes de Raúl: (1) ver en una cita real la transición del chip al confirmar/completar (en demo los estados no se guardan); (2) probar a fondo el agente de citas de Telegram y, solo entonces, retirarlo de pausa; (3) cierres propios de la clínica para `BOOKING_EXTRA_HOLIDAYS`; (4) paso 11 a partir del 20-oct: quitar la rama heredada `patient_appointments` de `/api/telegram/incoming`; (5) piloto de WhatsApp (número dedicado); (6) regenerar en Easypanel el token de despliegue de `fisio-backend`. Herramientas de auditoría en `tmp/design-audit/` (ignorado): `audit.mjs`, `probe.mjs`, `texts.mjs`, `deploy.mjs`, `live.mjs`.
- **Agente de citas:** EN PAUSA hasta que Raúl lo pruebe a fondo; no tocarlo.

## Estado anterior — 2026-10-13: agente de citas ACTIVADO en producción (pasos 1–9 del checklist)

- **P0 cerrado:** el workflow n8n «Fisio IA | Bot paciente» (`f1PcLN8s9YiOXj3w`, mismo ID y disparador) ahora reenvía a `/api/telegram/pilot-incoming` con la credencial «Fisio Telegram Agente Citas». Webhook de Telegram → n8n sin errores ni pendientes; `pilot-incoming` sin secreto responde 401.
- 1 Copia lógica de `public` (35 tablas, 787 filas) en `.private-backups/supabase-2026-10-13T11-43-06-605Z/` (Supabase Free no tiene copias propias).
- 2 Migraciones `booking_agent_onboarding` y `contact_requests_patient_notices` aplicadas y verificadas (2 tablas, 2 columnas, 2 políticas).
- 3 `crm_clinicas`: teléfono 623983731 y email provisional de Raúl.
- 4 Commit `445f625` en `main`.
- 5–6 Variables del agente en `fisio-backend` (env anterior guardado en `.private-backups/`); backend y frontend redesplegados; readiness 200 con 29 controles correctos (solo `whatsapp_pilot` sin usar).
- 7–9 Credencial n8n creada; flujo «Avisos agente de citas» (`onz3pv7hIrPMnzSi`) activo; bot sustituido. Copia del flujo anterior en `.private-backups/n8n-before-agent-*`.
- **Resúmenes al fisio (PROPUESTA_PRODUCTO.md §8, puntos 3, 4, 6 y 7):** `POST /api/cron/resumenes/:tipo` (clave interna) decide y redacta; n8n «Fisio IA | Resúmenes al fisio» (`nKy7h5JAfuOxHVPH`, activo; [resumenes-fisio.json](../n8n/Fisio_IA_Agent/production/resumenes-fisio.json)) programa y entrega por el bot profesional. Agenda del día L–V 7:30 (no en festivos), citas sin Calendar cada hora (cada problema una vez), bonos/facturas y pacientes sin próxima cita los lunes. Solo nombre e inicial, horas e importes; nunca datos clínicos ni mensajes a pacientes.
- **Naturalidad del agente de citas (14-oct):** fechas habladas («martes 20 de octubre a las 9:00», año solo si no es el actual) y textos base menos de formulario (asistente virtual, «¿Qué día te vendría bien?», «Tengo libre…», «¡Listo!»). La redacción con IA (temperatura 0,7; la interpretación queda en 0) recibe sus 3 últimas respuestas (memoria en el proceso, 30 min, sin datos de ficha) para no repetir saludos ni aperturas; usa el nombre solo si no aparece en esas respuestas; los botones, horas y CONFIRMAR no pasan por la IA (evita rellenos como «Entiendo tu solicitud»); la pregunta del día ya no menciona el límite de 45 días (solo se dice si piden una fecha fuera); «¿tenéis algo…?/¿hay hueco…?» es reservar por palabras clave; si se está pidiendo un día y el mensaje trae uno, sigue el mismo flujo aunque la IA lea otra intención; «Actualmente», «Entiendo tu solicitud» y «Claro, puedo ayudarte con eso» se eliminan de la redacción; responde a la charla suelta y, si preguntan precios o dirección, remite a la clínica sin inventar. El validador sigue igual.
- **Seguimiento tras no_show (§8 punto 5, 14-oct, decisión de Raúl: modo revisado y texto propuesto):** tipo `no_show` en `/api/cron/resumenes`; n8n «Resúmenes al fisio» lo pide cada día a las 10:00. El bot profesional lista las ausencias de ayer con un comando `/seguimiento_<código>` por paciente (o «ya tiene cita», «sin Telegram» con teléfono, «ya enviado»). Al pulsarlo, el backend comprueba que es el chat del fisio, que la cita sigue en `no_show` (máx. 7 días), que no hay otra cita futura y que hay vínculo activo; envía por el bot de pacientes «Hola, {nombre}. Ayer te echamos de menos…» con el botón «Reservar cita». Una sola vez por ausencia (`crm_mensajeria_eventos`, sesión `no_show_followup`); si Telegram falla queda en `revision_manual` y no se repite. Sin IA ni datos clínicos. Código: `backend/src/lib/no-show-followup.js`.
- **Copiloto clínico rediseñado** (`21cf13e`, desplegado): una columna, contexto plegable, acciones en dos filas; `assistant-rail.css` es la única fuente de estilos del panel (mensajes, informe y editor vuelven a tener estilo). Revisión local con `?demo=true` en escritorio y 375 px.
- **Prueba de Telegram en curso:** Plan B verificado (teléfono existente → solicitud guardada, aviso al fisio enviado, marcada Resuelta). Falta vincular «QA Test Patient» con «Vincular Telegram» y reservar. Textos del bot corregidos y desplegados (`ab5270f`): recordatorio corto del botón tras la bienvenida y mensaje propio para teléfono existente.
- **Capa de IA híbrida ACTIVA** (`9dbc794`, desplegado; `BOOKING_AI_ENABLED=true` en `fisio-backend`, env anterior en `.private-backups/`; readiness 200): gpt-4o-mini interpreta el texto libre y redacta con la personalidad de [PROMPT_PERSONALIDAD_AGENTE_CITAS.md](PROMPT_PERSONALIDAD_AGENTE_CITAS.md); el backend sigue decidiendo todo y un validador descarta redacciones con datos añadidos/omitidos o resultados no confirmados (fallo/timeout ⇒ texto determinista). Solo CONFIRMAR literal aplica cambios; aviso fijo de 112 ante síntomas graves. Vive en el backend (no n8n) porque el validador necesita los hechos del backend. Backend lint y 154/154; prueba real con gpt-4o-mini sobre textos ficticios correcta. Detalle en [AGENTE_CITAS.md](auditoria-cloudcode/AGENTE_CITAS.md#capa-de-ia-híbrida-13-oct-2026-decisión-de-raúl). Para desactivarla: `BOOKING_AI_ENABLED=false` y redesplegar. **Falta la prueba real de Raúl en Telegram.**
- **Vinculación automática por teléfono (14-oct, decisión de Raúl):** los pacientes con ficha se vinculan solos con «Compartir mi teléfono» si su número verificado está en una sola ficha activa; el código queda como alternativa. Arreglado también que la invitación del CRM desaparecía al recargar la ficha.
- **Prueba real de Raúl (14-oct):** vinculación automática, reserva con texto libre (solo huecos de la tarde), cambio de día (misma cita, Calendar sincronizado) y aviso del 112 correctos. La anulación destapó un bug previo: W6 no borraba el evento de Calendar (`cancel` vs `delete`); corregido en `85499a0` y desplegado. Repetida una reserva y anulación (20-oct 09:00): evento borrado de Calendar y sin pendiente. **Paso 10 del checklist completado.** CI verde en `2add5a6` (la prueba `test-ficha-save-context` fallaba desde `445f625`; corregido el doble de `document`).
- **Pendiente:** paso 10, prueba con paciente ficticio desde el Telegram de Raúl ([PRIMERA_PRUEBA.md](auditoria-cloudcode/PRIMERA_PRUEBA.md), parte B); paso 11 tras una semana. Cierres propios de la clínica (vacaciones, puentes) para `BOOKING_EXTRA_HOLIDAYS`. Festivos locales de Terrassa 2027 ya cargados: `2027-03-25` (Dijous Sant) y `2027-07-05` (lunes de Festa Major), según la propuesta municipal publicada en abril de 2026; confirmar en el DOGC cuando salga. El calendario de Cataluña 2027 coincide con las reglas del código. Seguimiento tras `no_show` (punto 5) hecho. Piloto de WhatsApp.

## Estado anterior — 2026-10-13 (noche): agente de citas con Plan B, festivos y citas pendientes, en local

Informe en [auditoria-cloudcode/](auditoria-cloudcode/AUDITORIA.md). Detalle y checklist de activación en [AGENTE_CITAS.md](auditoria-cloudcode/AGENTE_CITAS.md).

- **P0 sigue abierto:** el bot de pacientes activo (n8n «Bot paciente» → `/api/telegram/incoming`) crea fichas sin verificar y se presenta como persona. No usarlo con pacientes reales hasta completar la activación (pasos 1–9 del checklist).
- **Hecho en local (sin commit):**
  - Plan B: solicitudes de llamada guardadas antes de prometer nada, sin duplicados, tarjeta en Inicio y aviso al fisio por n8n.
  - Horario L–V 9–13 y 15–19, huecos de 60 min; festivos nacionales, de Cataluña y locales (`BOOKING_EXTRA_HOLIDAYS`) bloquean web, agente y API.
  - Pacientes nuevos del bot: reservas `pendiente` hasta «Marcar ficha revisada».
  - Avisos al paciente siempre que la clínica crea, confirma, cambia o anula su cita.
  - Datos de contacto de la clínica editables en Configuración (teléfono 623983731; email provisional de Raúl, a cargar en la activación).
- **Verificación:** backend lint y 135/135; frontend check (0 diagnósticos) y build; 4 mutaciones detectadas.
- **Pendiente:** autorización de cada paso del checklist; festivos locales de Terrassa 2027 y cierres de la clínica; después, automatizaciones n8n (PROPUESTA_PRODUCTO.md §8) y piloto de WhatsApp con OpenWA (número dedicado).
- **Sin commit, push, despliegue, SQL Cloud, activación, envíos ni IA con gasto.**

## Estado anterior — 2026-10-13: producto desplegado; segunda opinión solicitada

Frontend `c062967` publicado y desplegado en `fisio-frontend`; CI backend/frontend/n8n verde y diez controles HTTP posteriores/readiness 13/13 correctos. Supabase sano, 35 tablas públicas con RLS, una clínica, cero perfiles/pacientes sin clínica y cero citas pendientes/en curso Calendar. Doce workflows coinciden con fuente; sync healthy y OAuth responde. No se necesita un deploy manual del frontend.

Backend `ee3449c` publicado y desplegado; [CI 38377245576](https://github.com/raulruizproyectos/Fisio_IA_Agent/actions/runs/38377245576) verde en los tres trabajos, lint/108 pruebas. Los 4xx conservan respuesta y logs sin generar correos CRITICAL; los 5xx mantienen el notificador. Diez controles HTTP posteriores y readiness 13/13 pasan. Calendar vuelve a `healthy` tras reiniciar, con éxito observado en `2026-10-13T09:40:25.068Z`. La sesión sí provocó al menos un correo automático de monitorización antes de corregir el fallo. [Evidencia y límites](design-exploration/reviews/2026-10-13/production.md).

El usuario ha pedido preparar una segunda auditoría independiente con CloudCode antes de la primera prueba manual, que sigue sin resultados comunicados. Encargo nuevo explícito: revisar eficiencia, funcionalidades, UX/diseño/presentación, arquitectura, seguridad, agentes IA y n8n; propuestas priorizadas para mejoras generales. Además exige completar e implementar **en local** el agente de citas Telegram si faltan funciones: nuevos/existentes con contacto verificado, reservas/consulta/cambios/cancelaciones/recordatorios; cambios/cancelaciones con al menos 24 horas, después deriva a clínica. WhatsApp queda como integración futura. No se autoriza activación, gasto o despliegue por este encargo. [Prompt completo](DESIGN_RESOURCES.md), [contrato del agente](PROMPT_AGENTE_CITAS.txt) y [requisitos confirmados](PILOTO_MENSAJERIA.md). Se actualiza la documentación de traspaso en local; `main` publicado al cierre funcional sigue en `ee3449c`. Las entradas siguientes conservan historia.

## Historia previa a publicar — 2026-10-13: QA local del refinamiento

Preparación local terminada para la primera prueba del refinamiento. En el cierre final se corrigió y verificó la circulación Tab/Shift+Tab dentro de modales y copiloto móvil, además de excluir firma/voz cerrados del foco. El copiloto de escritorio conserva la navegación hacia el espacio de trabajo. Recorrido de prueba registrado en la revisión enlazada abajo.

El usuario pidió estudiar 25 recursos y después autorizó implementar las mejoras recomendadas. Precisión azul conserva sus tokens/fuente: ficha más compacta, resumen legible, métricas complementarias plegables, selección deslizante de pestañas, entrada/salida de paneles, foco restaurado e interacción bloqueada mientras están cerrados. Skeleton de carga, guardado de notas/acceso con estado ocupado real y composición del acceso/recuperación afinada. No se añadieron dependencias.

Frontend check (40 archivos sin diagnósticos)/build y regresiones afectadas pasan. Backend lint y 106/106 pruebas pasan; la primera ejecución del sandbox falló por conexiones loopback EACCES y la ejecución autorizada fuera de esa restricción confirmó la suite. Chromium con el build real y API/Auth ficticias: 375/768/1280 px, cero overflow/errores JS/red externa; guardado aceptado/rechazado y doble envío bloqueado, datos parciales explícitos, paneles/foco/Escape/reapertura y movimiento reducido. [Detalle de la revisión](design-exploration/reviews/2026-10-13/README.md).

Cambios conservados únicamente en local: sin commit/push, despliegue, Cloud, envíos reales ni IA con gasto. La URL pública sigue en la versión del cierre del 8 de octubre; no tiene este refinamiento. Primera prueba del usuario todavía sin resultados comunicados. `CONTINUAR.md` y `PROMPT_CONTINUAR.txt` se conservan intactos respecto al comienzo de este trabajo. Próximo paso: revisión del acabado local o publicación del frontend cuando el usuario autorice expresamente las acciones y destino necesarios. No repetir migraciones, auditorías ni la preparación operativa completada.

## Estado histórico — 2026-10-08: preparado para la primera prueba

CRM en https://fisio-frontend.b5xbaf.easypanel.host/login/. PR #2 fusionado; cinco migraciones ensayadas aplicadas y verificadas en Supabase uewhbaejcouenoufuwlq. Backend desplegado en 79bfeeee3d9c8839128d51a09e3def3ffb2337c9; frontend en 0fce17529fb0ea7b99644a0c305cd37b6613a799. CI del backend desplegado: tres checks verdes. Main incluye posteriormente el cierre documental y el archivo del cron.

Readiness real: 13 controles DB correctos, seis integraciones configuradas, cero ausentes y dos pilotos sin usar. Calendar OAuth reconectado por el usuario: alta, lectura, edición y cancelación de un evento ficticio comprobadas, sin invitados y con limpieza. W6 conserva recursos íntegros/paginación para comprobar citas pendientes; una lectura incompleta no libera el bloqueo. W5 vacío no se presenta como éxito.

Doce workflows de Fisio n8n activos y coincidentes con n8n/Fisio_IA_Agent/production. Header Auth en webhooks y credenciales acotadas para llamadas al backend; cuerpos JSON explícitos. Bot paciente sin la segunda reserva ante fallos. Calendar sync cada dos minutos ya completó una ejecución sana, sin cambios CRM en el recibo observado. Recordatorios horarios activados con autorización específica del usuario: pacientes con vínculo Telegram guardado y citas próximas entre 23 y 25 horas. Endpoint verificado tras vista previa vacía, cero mensajes enviados. Entrega incierta no se reenvía automáticamente.

Verificados login profesional real, lectura autorizada, cookies __Host-/Secure/HttpOnly/CSRF y logout; diez controles HTTP de producción. Telegram paciente/fisio verificados sin envíos; Gmail validado por lectura de perfil, workflow temporal retirado. Backend lint/106 pruebas y frontend check/build pasan. No se acreditan entrega real a pacientes, email enviado, generación IA con gasto ni el primer tick del cron de recordatorios; tampoco recuperación administrativa tras caída con in_flight=true o móvil físico. WhatsApp sigue como piloto sin activar.

Copia nativa CRM/Auth restaurada y comprobada; no es una restauración completa de servicios internos gestionados. Secretos y recuperación remota solo en .env.local; recibos/copias privados fuera de Git. A partir de aquí, el usuario probará el producto y comunicará fallos concretos. No repetir auditorías/rediseño ni migraciones ya aplicadas. Las entradas siguientes documentan historia.

Actualizado: 2026-10-08, preparación de testing en producción. Precisión azul aceptada; copia CRM/Auth restaurada y migraciones ensayadas en local. Despliegue pendiente de autorización concreta.

## GitHub y preparación de producción

- Rama `mejoras/auditoria-20260915` publicada y PR #2 abierto en borrador hacia `main`, por autorización del usuario. No fusionar ni desplegar por esa aprobación. Backend/n8n/frontend CI verdes en `28c201d`, incluido Docker/nginx real. Preservar secretos/copias locales fuera de Git y comprobar CI del commit documental final.
- EasyPanel accesible por API HTTPS con el token existente: proyecto `fisio-ia-agent`, servicios frontend/backend y URLs localizados. Ambos siguen en `aa211205`, versión del 20 de septiembre; salud responde 200. La nueva versión local aún no está desplegada.
- Supabase sano; faltan en Cloud las cinco migraciones de finanzas/reintentos/Calendar. Usuario completó cambio de contraseña; URI privada preparada. Copia nativa nueva: 35 tablas públicas y 27 Auth restauradas localmente y comparadas con origen por cantidades/hashes; cinco migraciones ensayadas sin perder filas. Recibo privado conservado, servidor local detenido. Alcance CRM/Auth; no acredita restauración completa de servicios internos gestionados. Consultar `PRODUCTION_TESTING.md` antes de aplicar SQL autorizado.
- Backend lint/100 pruebas y frontend check/build pasan; CSP, guardas y 33 casos runtime pasan. Docker frontend excluye `.env*` y exige `npm ci`; CI elimina la clave placeholder que ahora rechazaba la guarda y ejecuta regresiones de navegador/runtime.
- Destinos, bloqueos, cambios de configuración y recorrido de prueba registrados en `docs/PRODUCTION_TESTING.md`. No iniciar otra auditoría ni rediseño. Corregir los fallos reproducibles durante testing y verificar los flujos afectados.

## Precisión azul revisada; aceptada por ahora por el usuario

- Revisadas las 39 capturas; mejoras locales de saludo, acciones móviles de Pacientes, búsqueda, descripciones completas y listas/tablas sin duplicados. Carga/errores conservan su aviso; IDs/data-* y reglas clínicas preservados.
- Frontend check/build y regresiones de saludo/CSP pasan. QA acotada: 45 estados a 375/768/1280 px, incluidos registros y fallos HTTP ficticios en facturas/bonos/documentos/gestoría; cero overflow, errores JS y tráfico externo. Evidencia en `docs/design-exploration/reviews/2026-10-08/README.md`.
- Galería estática actualizada con 14 capturas afectadas y originales conservados. El usuario acepta por ahora y pide avanzar al testing en producción. No iniciar otro rediseño ni repetir auditorías técnicas. Limitaciones de proveedores reales, proxy/HTTPS y móvil físico conservadas; la revisión visual fue local.

## Precisión azul elegida y aplicada en local

- Continuar en un chat nuevo con **GPT-6.1-sol, razonamiento alto**, usando `docs/PROMPT_CONTINUAR.txt` y el primer bloque de `docs/CONTINUAR.md`. Árbol modificado/no rastreado preservado, sin commit ni push.
- Galería conservada: `docs/design-exploration/precision-blue.html`, 39 capturas ficticias. Vista previa 48042 y API/datos del ensayo detenidos; sin listeners en 4323/4322/3002/54339 al cierre. Para reabrir solo la galería: `node tmp/serve-design-exploration.mjs` → `http://127.0.0.1:4323/precision-blue.html`. API/POST/traversal rechazados en la verificación previa.
- QA adicional: editor clínico a 16 px y guardar accesible sobre el dock; Nueva cita sin campos recortados; PDF bloqueado y Telegram sin vínculo ofrece vinculación. Acceso HttpOnly/PKCE/cierre, Calendar vacío→confirmado→recarga y reserva/recarga bajo CSP pasan; red externa bloqueada. Fixtures reiniciados al alcanzar su rate limit, sin cambiar límites del producto.

- Usuario eligió la dirección 01, Precisión azul. Shell blanco/azul, tokens v6, agenda/ficha/biblioteca/finanzas/documentos/mensajes/historial/ajustes y acceso/reserva coherentes. Animación discreta 120/220/240 ms y movimiento reducido. Reconciliados DESIGN/AGENTS; historial visual conservado.
- Menú completo web/móvil, ruta superior actual, overlays fuera del flujo, formularios de alta con foco/Escape, notas a 16 px y controles de 44 px. Sin cambios a permisos, Auth, reserva, revisión profesional ni mutaciones Calendar. Todos los contratos DOM estáticos preservados.
- Chrome: 46 estados en 375/768/1280 sin overflow/errores JS/red externa; clínica ficticia y SQL local para pacientes/citas, dobles vacíos explícitos en otros módulos. Frontend check/build, regresiones de reserva/Calendar/Auth/contexto clínico/feedback/diálogos pasan; backend lint y 100 pruebas pasan. Capturas y recibos privados de QA, sin publicar datos privados.
- Siguiente paso: revisión visual del acabado elegido y, si hay ajustes concretos, iterar sobre esta base. No repetir Calendar/seguridad ni comenzar de cero. Pendientes de producción del bloque HttpOnly siguen abiertos: proveedores reales, proxy/HTTPS, Auth y límites monetarios. EasyPanel aparcado; sin SQL Cloud, mensajes reales, dependencias nuevas, commits, push ni despliegue.

## Sesión HttpOnly y acceso desde el servidor

- Login, sesión/renovación, cierre y recuperación de contraseña pasan por `/api/auth/*`. Tokens solo en cookies del backend HttpOnly, host-only, SameSite=Lax y Secure/`__Host-` en producción; HTTP rechazado allí. Respuestas sin tokens y sin caché. El navegador elimina el almacenamiento Auth legado del proyecto y ya no usa el SDK Supabase para autenticarse; runtime deja de publicar incluso la clave anon/publishable.
- Middleware conserva Bearer de integraciones y valida también cookies con Auth y perfil/clínica activos bajo RLS en cada petición. Cookie exige cabecera CSRF y origen exacto (lectura same-origin permite Sec-Fetch-Site sin Origin); no se aceptan identidades del cuerpo. Fallo/lectura incompleta de Auth conserva sesión sin simular permiso ni renovar a ciegas. Renovación explícita agrupa concurrencia en una instancia; ninguna escritura clínica se reenvía automáticamente.
- Login 10/15 min, reset 5/h, sesión 60/15 min y recuperación/cambio 10/15 min por IP, además del límite general. Recuperación PKCE guarda verifier HttpOnly y requiere el mismo navegador y último enlace; enlaces antiguos con tokens deben solicitarse de nuevo. Contraseñas nuevas: mínimo 10 caracteres y máximo 72 bytes UTF-8, hash delegado a Supabase. Inputs adicionales/incorrectos rechazados; errores de política no borran sesión válida. Error de logout conserva sesión y muestra aviso.
- Backend lint y **100/100 pruebas**, frontend check/build, Auth, 16 regresiones reserva, aviso/acción de agenda, CSP, 33 casos runtime y scanner pasando. Chrome con clínica ficticia y SQL restaurado verifica cookies inaccesibles a JS, limpieza de token legado, recuperación/cierre, Calendar/recarga y móvil. Red externa bloqueada; recibo privado `connections-verification.json`.
- Solo local: sin SQL/dependencias nuevos, Cloud, mensajes reales, commits, push ni despliegue. Antes de producción verificar mismo sitio HTTPS web/API (no usar cookies cross-site), CORS/redirect Auth, proxy/forwarded headers y ausencia de caché en API, límites Auth del proveedor, logout/rotación reales y topes de gasto. Sesiones actuales deberán iniciar sesión otra vez al adoptar este cambio. EasyPanel aparcado.
- Siguiente bloque local: auditoría visual web/móvil siguiendo DESIGN.md, con datos ficticios y alcance de una clínica. Los límites externos anteriores quedan pendientes y no se acreditan mediante la auditoría visual.

## Conexiones CSP desde la configuración real

- El entrypoint genera `connect-sources.conf`; nginx añade `connect-src 'self'` más los orígenes efectivos de backend/Supabase en todas las locations. Runtime sustituye build, sin añadir ambos. El build guarda solo defaults de URLs en `.runtime-defaults.sh`, fuera del HTML y de Git; Docker los lleva a `/etc/fisio`. Se conservan los fallbacks antiguos cuando no hay URLs explícitas.
- URLs HTTPS o HTTP loopback literal, con ruta opcional; sin credenciales, query, fragmento, comodines ni caracteres de configuración. Rechazo antes de publicar y escritura temporal al arrancar. Guardas de claves públicas también rechazan comillas y prefijo publishable vacío. No cambia URLs cliente ni consulta proveedores.
- 33 casos runtime verifican prioridades/orígenes/rechazos y conservación de archivos; hook del build ensayado con URLs ficticias. Backend lint/90 pruebas, frontend check/build, 16 regresiones de reserva, guardas, CSP y scanner pasan. Chrome sobre build/SQL local con Auth/Calendar ficticios verifica acceso, agenda/recarga y reserva/recuperación; conexión ajena bloqueada por CSP antes del transporte. Servidores detenidos.
- Solo local: sin dependencias/SQL nuevos, Cloud, mensajes reales, commits, push ni despliegue. Envsubst sustituido por un doble en Windows; nginx/proxy real no probado. Imágenes externas de catálogo conservadas; no afirmar protección universal de exfiltración. Modo CLI personalizado, micrófono físico y servicios reales no ensayados; IPv6 no admitido por la guarda actual. HttpOnly/Auth/topes monetarios siguen pendientes.

## CSP del navegador y cabeceras locales

- Los cuatro HTML compilados aplican CSP antes de cargar scripts: código inline generado con hash exacto y scripts propios; sin `unsafe-inline` de scripts, `eval` ni handlers de atributos. Objetos, frames, workers y cambios de URL base bloqueados; formularios al propio origen. Estilos de atributos permitidos para las vistas dinámicas existentes.
- Controladores de Layout/reserva empaquetados como JS propio, configuración runtime síncrona al principio del body y dos `onclick` sustituidos por listeners. Nginx añade `frame-ancestors 'self'` y Permissions-Policy en todas las locations, permitiendo micrófono propio y bloqueando cámara/geolocalización/pagos del navegador.
- Backend lint/90 pruebas, frontend check (39 archivos, cero errores/avisos/hints)/build, 16 regresiones de reserva, agenda/Auth/guardas y escaneo de 78 archivos pasando. Regresión del HTML compilado en `scripts/test-browser-policy.mjs`.
- Chrome sobre build con clínica/Auth/Calendar ficticios y SQL local: login, botón de alta vacía, validación reset, Calendar bloqueado/recuperado/recarga y reserva pública con una escritura simulada y recuperación al recargar. Móvil 375 px sin desbordamiento. Script inline, handler inyectado y eval de un script servido por la página bloqueados; red externa bloqueada durante el ensayo. Servidores de ensayo detenidos.
- Sin dependencias/SQL nuevos, Cloud, mensajes reales, commits, push ni despliegue. Nginx/proxy y Google/Auth/PostgREST reales no acreditados. Destinos de API/Storage runtime aún sin allowlist CSP; HttpOnly/Auth/topes monetarios y logs históricos pendientes. Build avisa de Shiki por defecto, sin páginas Markdown en estos flujos; CSP solo se comprueba con build/preview, no en dev.

## Errores públicos y permisos de trabajos IA

- En producción, los diagnósticos técnicos SQL/proveedor se sustituyen por mensajes seguros en el manejador global, finanzas, readiness, Calendar, generación/poll de ejercicios y respuestas Telegram afectadas. Incluye errores dentro de HTTP 200 y mensajes técnicos 4xx; conserva estados, códigos y mensajes de negocio controlados, sin presentar un fallo como datos vacíos.
- Cada consulta de un trabajo IA comprueba de nuevo el acceso al paciente mediante RLS, también desde caché y tras cambios de clínica. Un trabajo sin paciente exige su profesional de sesión. Fallos SQL de lectura responden error, sin simular ausencia ni entregar el informe.
- Diez regresiones cubren filtraciones reproducidas, diagnósticos históricos de trabajos fallidos, permisos de caché y fallos de lectura. Backend lint/90 pruebas, frontend check/build, acción/metadatos de agenda y ensayo SQL restaurado pasando; revisión profesional obligatoria preservada.
- Solo local, sin SQL nuevo, dependencias nuevas, Cloud, mensajes reales, commits, push ni despliegue. No se modifican retrospectivamente informes clínicos/resultados históricos; logs y objetos históricos requieren revisión aparte. Google/Auth/PostgREST reales, HttpOnly, Auth, CSP/proxy y topes monetarios siguen pendientes. Calendar verificado permanece como se describe en el bloque siguiente.

## Recuperación verificada de Calendar y seguridad local

- POST profesional `appointments/:appointmentId/check-calendar` solo lee Calendar; exige sesión, permisos y versión. Alta con ID perdido/cambio: evento único con referencia CRM, operación, contenido y horario exactos. Cancelación: recurso cancelado del ID vinculado en el calendario original. Vacío, 404/410, timeout, lectura incompleta o petición en curso conservan bloqueo.
- Migración CLI local `20261008090742_appointment_calendar_verification.sql`: operación, calendario y petición en curso persistidos. Escritura reclama antes de Calendar; vínculo/desbloqueo condicionados a la versión actual. Sin replay ni limpieza por timeout. Caída con marca en curso conserva bloqueo; recuperación administrativa no implementada.
- «Comprobar Calendar» en tabla/móvil/detalle, aviso anunciado, doble clic bloqueado y respuestas antiguas ignoradas. Recuperación restaura acciones y sustituye su aviso anterior. Navegador con clínica/Auth/Calendar ficticios: vacío bloquea, lectura válida recupera vínculo, recarga lo conserva; SQL independiente confirma una fila. 1280/375 px sin desbordamiento y control de 44 px.
- Guardas de claves públicas en build/runtime, escaneo frontend, CORS HTTPS explícito, límite por profesional para IA/audio, validación antes de gastos e identidad de sesión. Corregida herencia de cabeceras nginx. Astro 7.3.7 y auditoría npm sin avisos en ambos árboles. Los 16 puntos/gaps están en `docs/SECURITY_REVIEW_2026-10-08.md`; HttpOnly, configuración Auth y topes monetarios pendientes.
- Backend lint/80 pruebas, frontend check/build y regresiones de agenda/reserva/Auth/avisos/guardas pasando. Ensayo restaurado verifica handlers/SQL/RLS y RLS habilitado en todas las tablas públicas; recibo `calendar_verification: true`. PostgreSQL con conexiones independientes prueba desbloqueo/CAS y versiones obsoletas; instancia temporal detenida.
- Solo local: sin Cloud, mensajes, rotación GitHub, commits, push ni despliegue. Recuperación necesita lector directo; W5 no acredita completitud/cancelaciones. Google/Auth/PostgREST reales del bloque y contenedor nginx pendientes. EasyPanel aparcado.

## Citas guardadas antes de Calendar

- Altas públicas, agenda interna, reservas del agente y edición/cancelación guardan primero `crm_citas`. Migración local `20261008064542_appointment_calendar_pending.sql`: una marca booleana persiste el resultado aún no comprobado. Fallos de contexto, Calendar o vínculo posterior conservan la cita y responden con sus datos y aviso; incluso `GOOGLE_CALENDAR_REQUIRED=true` no deshace una cita guardada.
- Solo una confirmación completa seguida de vínculo CRM confirmado limpia la marca. Pérdida de respuesta no crea ni cancela otro evento; reintentos públicos recuperan la fila. Una cita pendiente rechaza otra modificación con `CALENDAR_CHECK_REQUIRED`. No hay desbloqueo automático ni endpoint de recuperación todavía: siguiente bloque, comprobación verificada del evento antes de liberar esta marca. No habilitar esta versión en producción hasta completar ese flujo.
- Reconciliación conserva filas pendientes y condiciona sus escrituras al estado/versionado `updated_at` leído; una lectura antigua no revierte un cambio en curso o completado. La referencia `CRM Appointment ID` usa el ID real de la cita antes de enviar Calendar y evita que una respuesta perdida genere otra cita CRM mediante backfill. Los rechazos SQL tardíos de inserción/edición ya no producen ninguna mutación externa; eliminada la compensación antigua.
- Agenda y ficha de cita muestran «Calendar pendiente»; el estado general y los avisos de alta/cambio no afirman sincronización completa. Backend lint/69 pruebas, frontend check/build sin errores, 16 regresiones de reserva y regresión de metadatos UI pasando. Ensayo restaurado ejecuta handlers/SQL reales con Calendar ficticio; creación/edición/cancelación inciertas, pérdida de vínculo y conflictos tardíos comprobados.
- PostgreSQL 18.3 temporal con tres conexiones independientes prueba que solo una operación reclama Calendar, un lector antiguo no puede reclamar tras liberarla y la reconciliación obsoleta no escribe. Instancia detenida. Nueva columna ensayada solo en local; readiness falla si falta. Sin cambios Cloud, migraciones aplicadas en producción, mensajes, commit, push ni despliegue. Sin prueba nueva de navegador ni Google/Auth/PostgREST reales; alta paciente/cita atómica y recuperación verificada siguen pendientes.

## Calendar: escritura única por intento

- El escritor compartido elige cuenta de servicio o W6 antes de escribir. Un error directo, respuesta perdida o creación sin ID devuelve error; nunca dispara una segunda mutación por n8n. Inserción, edición y borrado directos llevan `retry: false` y límite de 10 segundos. Borrado ya ausente (404/410) se considera confirmado.
- W6 exige `ok: true` booleano, ID válido al crear y el mismo ID al editar; fallos HTTP, JSON incompleto y confirmación de otro evento no simulan éxito. Se mantiene W6 como alternativa cuando no hay cliente directo, sin modificar ni activar workflows.
- Fallos originales reproducidos antes del cambio. Dos regresiones del escritor real con transportes sustituidos cubren creación/edición/borrado, pérdida de respuesta, 503, credenciales inválidas, respuestas incompletas y selección de transporte. Backend lint/68 pruebas y frontend check/build correctos. Sin escrituras reales en Calendar, cambios SQL ni despliegue.
- Esto impide el reenvío automático entre transportes; no resuelve todavía Calendar antes del INSERT/UPDATE CRM, eventos/pacientes huérfanos, solicitudes simultáneas, reintentos internos de un workflow desplegado ni recuperación duradera de sincronización. Siguiente bloque: persistencia de la cita y resultado de Calendar sin perder coherencia.

## Reserva pública: recuperación al recargar

- `sessionStorage` guarda únicamente un UUID aleatorio por profesional antes de enviar la reserva. Conserva la referencia al recargar la misma pestaña; no guarda nombre, contacto, motivo ni horario. La confirmación mantiene la clave y «Reservar otra cita» la elimina explícitamente. Lectura/escritura/limpieza fallidas no permiten avanzar a una reserva sin recuperación.
- Nuevo POST público `/public-booking/recovery`, con ambos alias y clave en cabecera, nunca en URL. Consulta por clave/profesional activo y exige marca de reserva pública; solo devuelve identificador, horario y estado, con `Cache-Control: no-store`. No crea paciente, cita ni evento. Clave inexistente o fallo de lectura no autoriza otra reserva; clave de cita interna o de otro profesional tampoco recupera datos.
- «Comprobar reserva» consulta en vez de reenviar el guardado. Al recargar confirma fecha/hora guardadas en la zona de la clínica o conserva el bloqueo si el estado cambió o el resultado es incierto. Dieciséis regresiones del script real, ensayo SQL restaurado, backend lint/66 pruebas y frontend check/build correctos.
- Navegador 375/1280 px con API ficticia: conexión cerrada después de guardar, recarga y recuperación con una sola clave/cita simulada, sin desbordamiento. Se observaron dos POST iniciales de transporte para la misma clave; una recarga adicional mantuvo ese contador en dos y aumentó solo consultas (de tres a cuatro). No confundir este ensayo HTTP con Supabase/Calendar reales. Captura privada `reserva-recuperada-recarga-movil.png`.
- Sin nueva migración, dependencias, Cloud ni despliegue. Cerrar pestaña, borrar almacenamiento o cambiar navegador puede perder la referencia. Pendientes migración de hash autorizada, Auth/PostgREST reales y Calendar: creación atómica paciente/cita, transporte duplicado y resultado de solicitudes aún en curso antes de liberar una clave rechazada.

## Citas: concurrencia real y recuperación pública sin duplicar

- Se reutiliza `crm_citas_no_overlap` y el índice único de `request_id` existentes. Dos conexiones independientes a PostgreSQL 18.3 local comprueban bloqueo/rechazo de inserciones y ediciones solapadas, unicidad de solicitud, horarios contiguos, otro profesional y liberación tras cancelación. Script `scripts/test-appointment-concurrency.mjs`, instancia temporal detenida al finalizar; datos ficticios y SQL real de la aplicación. No acredita Supabase Cloud 17.6, Auth/PostgREST ni Calendar.
- La reserva pública requiere `Idempotency-Key` UUID v4. Migración local `20261007214504_public_booking_retries.sql`: hash de la solicitud original en la misma fila, vinculado a la clave/profesional/datos/horario. Reintentos recuperan la cita antes de comprobar disponibilidad o crear pacientes/eventos. Claves con otros datos y citas canceladas/reprogramadas a otra hora se rechazan sin recrearlas; conflictos públicos no devuelven identificadores de otros pacientes. Readiness falla si falta la columna.
- El bloque inicial conservaba clave y cuerpo en memoria ante respuesta perdida, 5xx o éxito incompleto. La recuperación entre recargas se amplía arriba: consulta estado sin reenviar la solicitud. Estados cambiados o Calendar incierto remiten a la clínica; no se persisten datos personales en el navegador.
- Error SQL tardío de solape responde 409 en público y en el manejador global. Compensación Calendar compartida exige rechazo SQL definitivo, comprueba que el evento no pertenezca a una cita guardada y conserva eventos suministrados por el llamador. Transporte incierto no demuestra rollback y nunca autoriza cancelar el evento. Calendar sigue fuera de la transacción: pueden quedar eventos/pacientes sin cita al fallar o competir; reconciliación y entrega reales siguen pendientes.
- Fallo original reproducido (500 tras guardado, reintento sin recuperación). Ensayo de copia restaurada pasa recuperación de acuse SQL perdido, cambio de datos/horario/estado, privacidad y validación; nueve regresiones del script de la página. Backend lint/65 pruebas y frontend check/build correctos. Sin cambios Cloud ni despliegue; nueva migración preparada únicamente en local.

## Reserva pública: selección y confirmación protegidas en la interfaz

- Peticiones de horarios conservan fecha/versión; respuestas y errores antiguos no reemplazan el día actual. Fallos de lectura se muestran como error, sin afirmar que no quedan horarios. El paciente debe seleccionar una hora explícitamente y la selección se anuncia mediante `aria-pressed` y etiqueta de intervalo.
- Durante el envío se bloquean fecha, horarios, contacto y botón; inputs y submits repetidos no generan una segunda petición en curso. La confirmación utiliza una copia del horario enviado, recibe el foco y mantiene la fecha fija. «Reservar otra cita» desbloquea, limpia los datos y exige nueva selección. Un 409 conserva datos y aviso mientras se recargan horarios; una solicitud rechazada restaura controles.
- Recuperados estilos de botones generados por JavaScript: selectores limitados a `#slotsGrid`, sin depender del atributo de estilos scoped de Astro. Avisos anunciados y separadores legibles; IDs y contrato API conservados.
- `node scripts/test-public-booking.mjs`: seis regresiones del script real, con respuestas controladas; cinco fallos reproducidos antes del cambio. Navegador a 1280/375 px con API ficticia local: cambios rápidos, fallo de lectura, conflicto, bloqueo, selección, confirmación y reinicio; sin desbordamiento horizontal y botones de horario de más de 44 px. Capturas privadas `reserva-*.png` en `.private-backups/local-validation/`. Backend lint/63 pruebas y frontend check/build correctos.
- Este bloque anterior validó la interfaz con API ficticia. La persistencia/concurrencia y recuperación entre recargas se describen arriba; Calendar, agenda interna y acabado completo de la página pública siguen pendientes. Sin despliegue ni mensajes; EasyPanel aparcado.

## Ficha clínica: lectura y edición revisadas en web y móvil

- Notas con texto de 16 px y párrafos conservados; resumen, tendencia EVA y registro de sesión separados en superficies claras. Metadatos de 13 px y acciones editar/eliminar de 44 px. Editor con campos de 44 px, nota de 144 px y guardado principal coral; botones completos en móvil y foco visible.
- Restaurados estilos del feedback compartido: avisos sobre la navegación móvil, cierre de 44 px y texto de 15 px. Errores y advertencias permanecen hasta cierre manual; éxito/información caducan. Sin cambios de contratos DOM, persistencia, esquema ni dependencias.
- Navegador a 1280/375 px con pacientes ficticios: sin desbordamiento horizontal, foco visible, botón Guardar accesible sobre el dock, historial vacío correcto y nota de voz/estructurada legible. Respuesta perdida tras guardar: formulario conservado, aviso persistente/cerrable y reintento con una sola fila confirmado en SQL local. Capturas en `.private-backups/local-validation/ficha-*-despues.png` y `ficha-aviso-movil.png`.
- Backend lint y 63/63 pruebas; frontend check/build sin errores/avisos/hints; regresiones de feedback, contexto de ficha y recuperación pasando. El aislamiento bloqueó conexiones HTTP de la suite: la ejecución local autorizada fuera del aislamiento pasó. Auth ficticio/adaptador SQL limitado; no acredita PostgREST ni integraciones reales. Referencias/decisiones y QA registrados en DESIGN. Sin commit, push, mensajes, despliegue ni cambios Cloud; EasyPanel sigue aparcado.

## Respuestas perdidas: recuperación sin duplicados comprobada en local

- Altas de pacientes y notas (manual, voz y mapa) envían un identificador persistido en esta pestaña antes de escribir. Reintentar tras respuesta perdida o recarga recupera el mismo registro. Solo se guardan identificador y fechas técnicas; el texto clínico no se guarda en sessionStorage. Borradores entre dispositivos no se recuperan.
- Una operación SQL deriva clínica/autor de la sesión, serializa el identificador y registra alta, asignación y auditoría en la misma transacción. Un fallo de auditoría revierte la operación. Cambiar el borrador tras un guardado incierto devuelve el registro anterior autorizado: el formulario conserva los cambios y el siguiente guardado lo actualiza. Una nota eliminada nunca se recrea por un reintento tardío.
- Migración `20261007201534_clinic_creation_retries.sql` creada con Supabase CLI y ensayada; **no aplicada en Cloud**. Readiness comprueba su RPC sin escribir y bloquea cuando falta. Las altas antiguas sin identificador y las ediciones/bajas conservan su auditoría separada; no se acredita auditoría atómica para ellas.
- Navegador normal con SQL/RLS locales: nota guardada con respuesta destruida, recarga y reintento dejan una sola fila; modificación desde móvil recupera y actualiza la original. Alta de paciente con respuesta perdida y nombre cambiado termina con una única ficha actualizada. Recibos SQL independientes y capturas privados. Auth ficticio/adaptador limitado: PostgREST y concurrencia entre conexiones reales pendientes.
- Corregido orden de notas con la misma fecha/hora: creación e ID desempatan antes de paginar; resumen, historial y tendencia muestran la misma última nota. Ensayo EVA 0→4 muestra aumento y la segunda nota como actual, en lugar de una mejoría contradictoria.
- Backend lint y 63/63 pruebas; frontend check/build sin errores/avisos; regresiones ejecutables de recuperación/ficha y ensayo SQL pasando. Referencias Sleek y REA registradas en DESIGN; REA revisado, no instalado. Sin commit, push, despliegue, mensajes ni cambios Cloud. EasyPanel sigue aparcado.

## Respuestas tardías y fallos de recarga: protección local comprobada

- Cancelada la preparación de la prueba en EasyPanel por decisión del usuario. Continúa el desarrollo local; no se ha desplegado ni actualizado Cloud.
- Guardados de datos personales, notas manuales, voz y mapa de dolor conservan el paciente y la versión de la ficha. Respuestas de una ficha anterior no cierran borradores nuevos ni aplican datos a otra ficha, incluso al volver al mismo paciente. Recargas de notas fuera de orden conservan la respuesta más reciente.
- Abrir otra ficha cierra la captura de voz y limpia la selección del mapa. Transcripción/síntesis tardías no rellenan una sesión nueva. Cancelar y reabrir un editor durante un guardado conserva el borrador nuevo.
- Si la escritura está confirmada y falla la recarga, las notas, el resumen y la tendencia dejan de mostrarse como datos actuales; aparece un aviso de guardado confirmado sin repetición. Edición de paciente usa los campos confirmados por el servidor, actualiza el nombre visible y conserva el resumen clínico calculado, sin depender de otra lectura.
- `node scripts/test-ficha-save-context.mjs` ejecuta handlers y recarga reales con respuestas controladas; el fallo original cerraba el nuevo editor. Navegador a 1280/375 px con API/SQL/RLS locales: fallo de lectura tras persistir registra una sola nota; respuesta retenida de A conserva el borrador de B. Consultas SQL independientes confirman dos notas ficticias en A, ninguna en B y autor de sesión. Nombre editado en B coincide en ficha y SQL. Captura y recibos privados en `.private-backups/local-validation/`.
- Backend lint y 61/61 pruebas; frontend check/build sin errores/avisos; regresiones de ficha y diálogo pasando. Auth ficticio y adaptador SQL limitado: PostgREST real, IA/audio reales, auditoría atómica e integraciones siguen pendientes. **Una desconexión antes de recibir confirmación de escritura sigue requiriendo recuperación/idempotencia para impedir duplicados al reintentar**; esta protección no acredita ese caso.

## Guardados de navegador: pacientes y notas verificados en copia local

- Alta y edición de paciente, nota manual con EVA cero, edición desde móvil y borrado con confirmación ejecutados desde la interfaz normal (sin modo demo). Consultas independientes a SQL/API verifican una única nota, autor de sesión, cambios persistidos y resumen vacío tras borrar. Cancelar y Escape conservan la nota; Tab permanece en el diálogo y el foco vuelve a la acción de origen.
- Corregido solapamiento de la navegación móvil con los botones inferiores: espacio y margen de desplazamiento en el contenedor compartido. A 375 px, el centro del botón Guardar recibe el clic y queda por encima de la barra. Acciones de notas tienen etiquetas accesibles y la fecha de última nota coincide con la hora de sesión mostrada en la tarjeta.
- Corregido puente de eventos del diálogo compartido: las solicitudes de confirmación anteriores nunca abrían el modal y quedaban pendientes. `node scripts/test-confirm-dialog.mjs` ejecuta el script real; detecta la ausencia anterior del puente y comprueba apertura, retorno booleano/texto, Escape y foco.
- Ensayo opcional `--browser-records`: routers reales y PostgreSQL/RLS restaurado con adaptador limitado reutilizado; Auth ficticio y red externa bloqueada. API solo en 127.0.0.1:3002; módulos fuera de pacientes/notas responden 503. No acredita Supabase Auth/PostgREST reales, errores de red después del guardado, integraciones ni toda la aplicación.
- Backend lint y 61/61 pruebas, frontend check/build (0 errores/avisos), regresión de diálogo y ensayo completo SQL pasando. Recibo y capturas privados en `.private-backups/local-validation/`. Sin cambios Cloud ni despliegue. La propuesta de prueba en EasyPanel está aparcada; continuar local según el apartado actual anterior.

## Pacientes y notas: guardado e historial corregidos en local

- Alta con UUID de servidor e INSERT sin RETURNING: la política de propiedad no ve aún la fila nueva durante RETURNING. Fallo previo reproducido y alta/asignación/lectura posteriores comprobadas en PostgreSQL. Fallo de asignación adicional conserva la ficha, avisa y mantiene acceso por su creador.
- Edición valida nombre/email/nacimiento y devuelve 404 si falta el registro. Baja exclusivamente lógica, comprobando errores; retirados fallback destructivo y borrado de fichas antiguas. Anonimización parcial anterior bloqueada con 409 hasta definir el procedimiento completo.
- Notas validan texto, fecha y EVA, conservan cero y derivan autor de la sesión; cita comprobada contra paciente. Cambios inexistentes responden 404. Ficha/evolución calculan resumen determinista de las últimas 30 notas actuales con RLS; refleja edición/borrado y queda vacío sin notas. No escribe resúmenes en segundo plano ni añade llamadas IA; voz/ejercicios conservan sus motores.
- Formularios de datos/notas usan `hidden` nativo y guardados bloquean doble clic. «Editar datos» activa su pestaña para mostrar el formulario desde el resumen. Apertura y cancelación comprobadas en navegador con paciente técnico; nota manual visible a 375 px sin desbordamiento horizontal. Recarga compartida en las cuatro vías de notas distingue persistencia confirmada de fallo de refresco. Respuestas antiguas no sustituyen otra ficha seleccionada después.
- Backend lint y 61/61 pruebas, frontend check/build y handlers contra SQL/RLS pasando. Escrituras solo con fixtures locales; sin cambios Cloud. Navegador probado según el apartado anterior; pendientes PostgREST real, anonimización completa y auditoría atómica de pacientes/notas: la auditoría antigua separada todavía tolera fallos.

## Bonos y facturas: corrección local, actualización Cloud pendiente

- Migración `20261007154552_financial_integrity.sql` ensayada en la copia restaurada; **no aplicada en Supabase Cloud**. El backend actualizado depende de sus columnas/RPC y readiness devuelve 503 cuando faltan. No desplegar antes de preparar copia válida y obtener autorización específica para esa actualización.
- Consumo de bono mediante UPDATE atómico: respeta capacidad, estado y fechas; dos solicitudes no pierden descuentos ni sobrepasan el límite. El botón se desactiva durante la operación en escritorio/móvil. Fechas y precios se validan al crear/editar.
- Emisión, numeración, vínculo de cobros y auditoría en una transacción. Cada cobro se factura una vez; una factura emitida y sus importes no son editables/eliminables por el cliente. Fallo de auditoría revierte toda la emisión. Sesiones sin perfil, anon y service_role no pueden emitir ni consumir bonos.
- El cobro se interpreta como precio final: no se añade IVA otra vez. Predeterminada exención de fisioterapia sanitaria, con referencia legal en el PDF; otros servicios requieren el tipo que corresponda. Fuentes y referencias de Terrassa en OPERATIONS. No se han cambiado tarifas ni emitido facturas reales.
- Pendientes identificación fiscal del emisor, conservación de sus datos, rectificativas y adaptación SIF antes del uso fiscal real. Estas correcciones no acreditan cumplimiento fiscal completo. El ensayo utiliza PostgreSQL en memoria y un adaptador de consultas; no acredita concurrencia entre conexiones reales ni escrituras desde navegador.

## Citas, pagos y revisión probados sobre una copia local

- Restaurada una copia separada en `.private-backups/local-validation/flows/`, con comparación de las 31 tablas, las cuatro actualizaciones SQL y asignación de una cuenta Auth ficticia en memoria. Las pruebas llaman a los handlers reales mediante un adaptador limitado de consultas contra PostgreSQL/RLS; no equivalen a escrituras desde navegador ni a una plataforma Supabase local completa.
- Citas: alta/cancelación, liberación del hueco, rechazo de fechas invertidas/solapamientos y dos reservas concurrentes con una sola cita guardada. Cuando Calendar está configurado, un fallo de lectura impide confirmar disponibilidad; la agenda CRM permanece consultable. Calendar sin conectar mantiene la agenda local operativa.
- Pagos: alta, edición y lectura con céntimos persistidos en el esquema recuperado. Corregida validación compartida de importe/fecha/método al crear y editar; datos inválidos se rechazan antes de escribir. Pago inexistente devuelve 404 y los resúmenes suman en céntimos sin residuos decimales.
- Aprobación: fixture técnico con alerta; versiones antiguas y nota insuficiente se rechazan. Revisión válida deriva el profesional y guarda una auditoría; duplicar revisión o modificar contenido aprobado queda bloqueado. No se aprobaron los planes reales de la clínica ni se enviaron mensajes.
- Verificación fresca: backend lint y 61/61 pruebas, frontend check/build correctos y ensayo SQL financiero/pacientes/notas pasando. Recibo privado `flow-verification.json`, incluido hash del SQL financiero. Pendientes generación IA real, escrituras desde navegador/PostgREST, entregas, facturación fiscal completa y acabado visual completo.

## Validación local con la cuenta real

- Inicio de sesión y lecturas mediante el backend local verificados para Fisioterapia Carla JL. Directorio de 9 fichas (7 CRM y 2 antiguas), agenda semanal y ficha con notas, citas y pagos. Navegación revisada en escritorio de 1440 px y móvil de 375 px sin desbordamiento horizontal en estas vistas; quedan otros módulos y el acabado visual completo.
- Vista previa privada con escrituras e integraciones salientes bloqueadas: no se crearon citas, pacientes, aprobaciones ni mensajes reales durante esta revisión. Esta comprobación no acredita los flujos completos de escritura.
- Corregidos el total de informes (35, independiente del límite de la lista reciente), el nombre de la clínica y el estado de Calendar sin conectar. Un lector Calendar fallido o incompleto ya no se interpreta como una agenda vacía ni cancela las citas CRM.
- EVA ausente se muestra como no disponible; las citas demo quedan fuera de la sesión real. Panel, directorio y ficha excluyen citas pasadas/finalizadas de la próxima sesión. El directorio muestra solo citas de la semana cargada, no toda la agenda futura.
- Backend: lint y 47/47 pruebas. Frontend: check con 0 errores/avisos/hints y build correcto; pruebas ejecutables de autenticación y selección de próximas citas. Datos antiguos/de prueba conservados; revisar su limpieza por separado antes del uso real.

## Estado Cloud tras la configuración autorizada

- Aplicadas las cuatro actualizaciones y la asignación administrativa en `Fisio-IA-Agent`. Una sola clínica: **Fisioterapia Carla JL**, con una cuenta Auth confirmada y perfil admin. Inicio de sesión real y consulta Auth/PostgREST verificados; sin correo automático, despliegue, cambio de plan ni activación de bots.
- Conservados 7 pacientes CRM, 18 citas, 35 informes recuperados como borradores y las dos fichas antiguas. Asignación con diez eventos de auditoría, tres restricciones de clínica validadas y exclusión de citas instalada. El usuario no puede modificar su rol, identidad Auth o clínica; anon no accede a pacientes, Vault sigue reservado al servidor y todas las tablas públicas tienen RLS.
- Copia nueva previa en `.private-backups/2026-10-07T14-06-28-351Z-api/`: restauración y ensayo completos antes de escribir. Comparación posterior de las 31 tablas fuente mediante JSON canónico de PostgreSQL confirma conservación del contenido, excluyendo únicamente los cambios autorizados de cuenta/propietario/estado y timestamps. Recibos, hashes y plan con IDs reales permanecen privados.
- Sesión real accede a pagos, documentos, notas, ejercicios y comunicaciones de pacientes. Las 22 comunicaciones antiguas sin paciente permanecen guardadas y ocultas por RLS; no se les asignó un paciente por suposición. Revisarlas si deben incorporarse al historial asistencial.
- Advisors: cinco avisos INFO corresponden a tablas internas sin políticas, deliberadamente reservadas al servidor. Queda el aviso de [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no se cambió configuración ni plan para resolverlo.
- Backend: lint y 44/44 pruebas; frontend: check sin errores/avisos/hints y build completado. La base ya tiene V2; EasyPanel todavía ejecuta la aplicación anterior. Faltan validación completa de interfaz, revisión de planes históricos e integraciones y actualización coordinada de la aplicación.

## Decisión de producto

Se aprovecha el proyecto existente para gestionar exclusivamente la clínica del usuario. Prioridad: pacientes e historial, agenda, pagos y planes de ejercicios revisados por el fisioterapeuta, con entrega y reservas por Telegram/WhatsApp. La venta o incorporación de otros centros queda aplazada; no se añaden suscripciones, alta de clínicas ni administración global.

Se conservan los permisos y el aislamiento ya preparados: cada perfil pertenece a una clínica; el administrador gestiona su centro y el fisioterapeuta accede a pacientes propios o asignados. Tener una sola clínica no justifica retirar estas protecciones ni reconstruir el CRM.

### Entorno confirmado y costes

- Captura del usuario: EasyPanel con 2 núcleos, 7,8 GB de RAM (2 GB usados en ese momento) y servicios `fisio-backend`, `fisio-frontend`, n8n y otro proyecto. Es una fotografía del consumo, no una prueba de capacidad o disponibilidad.
- Consulta inicial de metadatos el 7 de octubre de 2026: proyecto `Fisio-IA-Agent` (`uewhbaejcouenoufuwlq`), región `eu-central-1`, estado `INACTIVE`, organización Free. Tras autorización expresa se reactivó y se verificó `ACTIVE_HEALTHY`; la organización sigue en Free. SQL de solo lectura confirmó PostgreSQL 17.6 y el esquema anterior. No se han leído registros de pacientes ni valores de Vault.
- Decisión: conservar Supabase Cloud y el VPS existente. No se migra a PostgreSQL independiente ni se instala otro Supabase. OpenWA sigue limitado al piloto; su instalación no se ha activado.
- No se contratan servicios ni se cambia de plan. La IA de ejercicios, alojamiento y copias tienen que presupuestarse por separado; no se promete coste total cero. Las reservas guiadas locales no añaden llamadas a IA.
- Corrección de Vault aplicada tras autorización expresa: `public.vault_read_secret(text)` ya no es ejecutable por `anon`/`authenticated`; `service_role` conserva el permiso. SQL confirmó que la definición de la función no cambió y Advisors dejó de señalarla. Se aplicó exclusivamente el contenido de `20261007110637_vault_server_only.sql`, registrado en Cloud como `20261007111313_vault_server_only`. Sin lectura de secretos ni cambios de datos, plan o despliegues.

### Inspección previa y ensayos (histórico anterior a la configuración)

- Inventario agregado: 7 pacientes CRM, 18 citas, 35 recomendaciones, un perfil y ninguna cuenta en `auth.users`. El perfil no está vinculado a una cuenta existente; resolver el acceso y el mapeo explícito antes del despliegue. No se han consultado nombres, diagnósticos ni contactos.
- Las recomendaciones están en `generada` (34) o `requiere_revision` (1); las 35 tienen un informe persistido en comunicaciones. No hay planes aprobados/enviados que deban perder su aprobación en esta fotografía. El endurecimiento pendiente convierte `generada` a `requiere_revision`. Consulta agregada sin solapamientos de citas; no sustituye la restricción SQL frente a nuevas reservas concurrentes.
- Copia lógica del CRM creada usando el acceso de gestión existente, sin contraseña PostgreSQL nueva: `.private-backups/2026-10-07T13-03-57-819Z-api/`, excluida de Git. Incluye estructura/datos de las 31 tablas públicas, funciones, secuencias, restricciones, índices, triggers, políticas/permisos, metadatos del bucket e historial. Un único SELECT de solo lectura captura los datos; checksum SHA-256 verificado. No es una copia completa de Supabase: excluye valores Vault, configuración externa y componentes internos. Auth tiene cero cuentas y Storage cero objetos.
- Restauración local comprobada con PGlite: cada fila de las 31 tablas coincide con la copia original; políticas restauradas y permisos de Vault conservados. Endurecimiento `20260901` y las tres migraciones V2 pasan sobre esa estructura/datos reales. Se conservan los registros, se recuperan los 35 informes y se instala la exclusión de citas. Los datos antiguos siguen sin clínica y ocultos hasta su asignación explícita. Manifiesto y verificaciones privadas guardan hashes de los SQL ensayados; Cloud no se ha modificado.
- Preparada asignación para `Fisioterapia Carla JL` y el correo de acceso indicado por el usuario, como administradora. Plan con identificadores exactos en la carpeta privada de la copia; cuenta Auth todavía sin crear. `database/setup/assign_single_clinic.sql` conserva los dos propietarios existentes y asigna explícitamente los cinco pacientes sin creador al perfil existente, sin cambiar sus IDs ni duplicar las dos fichas del esquema antiguo. Vincula ambos perfiles a la misma cuenta y registra diez eventos de auditoría.
- Ensayo de esa asignación sobre la copia real: sesión SQL de administradora ve 7 pacientes CRM, 18 citas, 35 planes y las dos fichas antiguas. Se conserva el contenido de las tablas no afectadas, se validan las tres restricciones de clínica y se bloquean cambios del propio rol/identidad/clínica, sesiones sin perfil y clínica inactiva. Un fallo de auditoría revierte toda la asignación; configuración incorrecta, inventario diferente o repetición se rechazan. Es una prueba SQL con cuenta Auth ficticia en memoria: acceso real Auth/PostgREST pendiente. Consulta Cloud posterior confirma que siguen sin existir cuenta ni tabla de clínicas.
- 15 migraciones registradas tras la corrección de Vault; las tres V2 funcionales locales no están aplicadas. Faltan `crm_clinicas`, pertenencia de perfiles/pacientes, `report_snapshot`, `report_version`, RPC de revisión y las tres tablas de mensajería. No desplegar el backend local sobre esta base sin preparación coordinada.
- 31 tablas públicas tienen RLS, pero esto no prueba que sus permisos sean correctos: `crm_pacientes` no tiene política SELECT para usuarios autenticados; diez tablas tienen RLS sin políticas. Algunas son deliberadamente de servidor, otras afectan a pagos, bonos, facturas e historial y deben revisarse.
- No están instalados `btree_gist`, el esquema `private` ni ninguna restricción de exclusión en `crm_citas` que evite solapamientos.
- El preflight antiguo enumera tres tablas ausentes (`crm_sesiones`, `crm_notas_seguimiento`, `eventos_visualizacion_video`) y cuatro columnas de la tabla de vídeo ausente. Revisar dependencias; no crear módulos de vídeo ni tablas opcionales por cumplir esa lista.
- Advisors después de la corrección: Vault ya no aparece; quedan dos helpers privilegiados (`get_my_profesional_id`, `get_my_profile_id`), `search_path` mutable en `crm_set_updated_at` y diez tablas con RLS sin políticas. Revisar cada caso; no se han aplicado las otras migraciones ni cambiado estos permisos.

### Mensajería y reservas solicitadas

Telegram y WhatsApp deben permitir entregar los planes revisados y reservar citas mediante un agente conectado a la agenda de la clínica. Ambos canales utilizarán las mismas reglas de disponibilidad y confirmación; la identidad del paciente, los informes y la configuración de cada canal deben mantenerse dentro de su clínica.

Decisión del usuario: OpenWA solo para piloto; se mantiene la API oficial de Meta como propuesta para producción. El conector y el flujo de reservas guiadas están preparados en local para una clínica. No se ha instalado OpenWA, conectado ningún número ni enviado mensajes reales. Véase [PILOTO_MENSAJERIA.md](PILOTO_MENSAJERIA.md) para alcance, configuración y límites.

## Primer incremento: aislamiento por clínica

- Migración `database/migrations/20261007091159_clinic_isolation.sql`: clínicas, pertenencia de perfiles/pacientes/asignaciones, RLS y claves foráneas que impiden vincular pacientes y profesionales de centros distintos.
- La sesión obtiene la clínica del perfil almacenado. El cliente no puede elegirla enviando un identificador. Un perfil sin clínica activa no accede al CRM.
- Eliminado el acceso privilegiado con `dev-token`, también en desarrollo. La demostración visual requiere modo de desarrollo y activación explícita; un catálogo real pequeño o vacío ya no se sustituye por pacientes ficticios.
- Reservas públicas: requieren un profesional explícito y buscan/crean pacientes dentro de su clínica. Los datos de contacto proceden del centro asociado.
- La migración conserva los datos existentes sin asignarles una clínica por suposición. Quedan ocultos hasta completar su asignación administrativa.
- Reparado el lockfile del frontend con la versión que realmente incluye el paquete opcional de Tailwind; instalación limpia con `npm ci --offline` verificada.

## Verificación

- Backend: lint limpio y 50/50 pruebas pasando.
- PostgreSQL en memoria (PGlite): ejecución de los esquemas y migraciones reales; dos clínicas, administradores, fisioterapeutas, pacientes y seis tablas relacionadas. Se verifica lectura/escritura cruzada denegada, prevención de autoasignación y conservación de datos antiguos.
- Frontend: chequeo Astro con 0 errores, 0 avisos y 0 hints; compilación estática de cuatro páginas completada. Pruebas ejecutables de autenticación y próximas citas: producción ignora demo, localhost exige sesión, contexto conserva clínica y fechas pasadas/inválidas o estados finalizados no se presentan como próximas citas.
- SQL y asignación ya aplicados en Supabase Cloud, con Auth/PostgREST verificados según el estado actual anterior. EasyPanel sigue sin actualizar; integraciones y flujos completos pendientes.

## Segundo incremento: aprobación y entrega clínica

- La aprobación se realiza mediante `review_exercise_recommendation`, con sesión profesional activa, permisos sobre el paciente, versión vigente, ejercicios persistidos válidos y justificación de al menos 12 caracteres ante alertas.
- El informe completo y las pautas editadas se guardan en `crm_recomendaciones.report_snapshot`; aprobar congela su contenido y sus ejercicios. La auditoría se registra en la misma transacción y conserva el informe revisado. Si falla, tampoco se aprueba.
- Seguimiento registra observaciones, adherencia y dolor; no cambia estados. La API directa de Supabase tampoco puede aprobar, falsificar el revisor, quitar alertas originales ni alterar/eliminar un plan aprobado.
- PDF y Telegram comparten la lectura del contenido aprobado: paciente, ejercicios, pautas y mensaje no proceden del cuerpo enviado por el navegador. Las imágenes se resuelven desde el catálogo/media, con URLs firmadas renovadas cuando corresponde.
- El envío utiliza el vínculo Telegram guardado. Solo el servidor registra `enviada` después de que Telegram confirme el documento. Si falla ese registro tras entregar, devuelve un aviso para no repetir el envío. El bot profesional devuelve los nuevos planes como borradores de texto, sin PDF previo a aprobación.
- Migración `20261007094023_clinical_approval_integrity.sql` aplicada. En esta base no había planes aprobados/enviados; los 35 requieren revisión profesional. La migración conserva en auditoría los estados/firmas previos cuando existen y mantiene los eventos históricos de comunicación.
- Pruebas ejecutadas: handlers reales del backend con dobles locales de API/base de datos; PDF real decodificado; rechazo de inyección de contenido y destinatario; errores de entrega/registro. SQL real en PGlite prueba permisos, cambios de versión, alertas, duplicados, inmutabilidad y rollback ante fallo de auditoría. No se han enviado mensajes reales.

## Bloqueos para producción

La auditoría del 7 de octubre detectó problemas que los checkpoints históricos no cubrían. Sus afirmaciones de preparación para producción y de aprobación clínica inviolable no describen el estado actual.

1. Resolver los permisos funcionales y avisos restantes de la base. Supabase ya está disponible y la función de Vault tiene acceso exclusivo del servidor. Comprobar los destinos de Calendar, Telegram y n8n de la única clínica, incluido el destino de respaldo del bot profesional y los vínculos antiguos. Separar credenciales y procesos de varios centros queda aplazado hasta que se solicite esa expansión.
2. Validar guardados con PostgREST real y fallos de recarga/red; endurecer auditoría de pacientes/notas. Alta/edición y notas de interfaz ya ensayadas en copia local. Definir supresión de identidad completa antes de habilitarla. Preparar configuración fiscal y aplicación autorizada del SQL financiero antes del uso real.
3. Migraciones, asignación y acceso Auth/PostgREST comprobados. Validar apertura y nueva revisión de planes históricos con la aplicación actualizada antes del uso real.
4. Validar flujos completos y acabado visual en escritorio/móvil con estados de carga, vacío y error reales. Las pruebas locales de esta fase no equivalen a validar toda la aplicación en producción.

## Próximo paso

Revisar los flujos de edición/guardado de la interfaz antes de finalizar el acabado visual. Preparar copia de seguridad actual, configuración fiscal y actualización financiera antes de solicitar acciones concretas en Supabase/EasyPanel. Cuenta y base V2 ya configuradas con autorización; no repetir esas migraciones ni la asignación. Revisar además el vínculo Telegram profesional antiguo y los dos vínculos de pacientes antes de activar integraciones. No hay autorización para esta nueva migración, despliegues, cambios de plan ni conexión/activación de números o bots.

## Tercer incremento: piloto de mensajería

- OpenWA habilitado solo mediante flag y configuración explícita de clínica, profesional y sesión. Webhook HMAC sobre bytes originales; una clave interna no sustituye su firma. No se confían clínica, profesional, teléfono ni contenido clínico enviados por el navegador.
- Invitaciones temporales de un uso con consentimiento y baja. Vínculos, procesamiento de eventos y entregas son registros del servidor, con lecturas profesionales limitadas por RLS y claves foráneas por clínica/paciente.
- Reservas guiadas compartidas en Telegram/WhatsApp para pacientes registrados y asignados: consulta de huecos, elección y confirmación explícita. Reutilizan el creador de citas del CRM; deduplicación persistida, selección con versión y exclusión SQL frente a solapamientos. Este incremento no incorpora conversación libre con un modelo de IA ni altas/cambios/cancelaciones automáticos.
- PDF de WhatsApp desde el informe aprobado y destinatario vinculado. Aceptación y entrega son estados diferentes; recibos firmados confirman entrega/lectura. Los reintentos no repiten planes; resultados inciertos requieren revisión manual.
- Botón WhatsApp en el resumen del paciente para invitación, envío y consulta. Invitaciones Telegram del piloto disponibles por API; su incorporación a la ficha y la comprobación visual siguen pendientes.
- Migración `20261007101248_messaging_pilot.sql` aplicada en Supabase Cloud después del ensayo en PostgreSQL en memoria. Contratos HTTP probados con Express y servicios simulados. Piloto desactivado, sin despliegue en EasyPanel ni conexión real de números/bots.
- Próximo paso del piloto: concretar entorno de pruebas, clínica/profesional y número/bot de pruebas, antes de solicitar despliegues o conexiones reales. Calendar/n8n siguen con configuración global; no activar este piloto para varias clínicas.

## Contratos que se mantienen

- Revisión profesional antes de entregar recomendaciones; justificación documentada ante alertas clínicas.
- IDs y atributos `data-*` de las vistas para su hidratación.
- DM Sans, lienzos cálidos, Canopy Green y coral reservado a la acción principal.
- Secretos fuera del repositorio; commits, pushes y despliegues requieren autorización explícita.
