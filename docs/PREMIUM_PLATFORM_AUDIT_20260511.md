# Auditoria premium plataforma Fisio IA Agent - 2026-05-11

## Objetivo

Convertir Fisio IA Agent en un CRM clinico premium para un centro de fisioterapia: rapido, estable, claro para recepcion/fisioterapeutas, y con un agente IA que ayude a cerrar trabajo clinico real sin robar espacio a la conversacion.

## Fuentes revisadas

- W3C WCAG 2.2: https://www.w3.org/TR/wcag/
- W3C ARIA Authoring Practices Guide: https://www.w3.org/WAI/ARIA/apg/
- Cliniko Features: https://www.cliniko.com/features/
- Cliniko Booking & Scheduling: https://www.cliniko.com/features/appointments/
- Jane Features: https://jane.app/features
- Physitrack Features: https://www.physitrack.com/features

## Diagnostico ejecutivo

La plataforma tiene una base funcional potente, pero el riesgo principal no es falta de features: es exceso de acoplamiento entre markup, estilos y controlador JS en `frontend/src/pages/index.astro`. El refactor a componentes fue correcto como direccion, pero provoco una rotura visual porque el CSS scoped de Astro ya no aplicaba a markup movido a componentes.

La prioridad premium ahora es doble:

1. Estabilizar shell y asistente con reglas globales controladas mientras se migra CSS/JS a modulos reales.
2. Redisenar la experiencia alrededor de trabajo clinico diario: agenda, triage, ficha de caso, plan IA, entrega al paciente, seguimiento y finanzas.

## Hallazgos de arquitectura

- `frontend/src/pages/index.astro` sigue siendo demasiado grande. Supera ampliamente el tamano razonable para un archivo de producto y mezcla HTML, CSS, TypeScript, router, dashboard, pacientes, agenda, finanzas, documentos y agente IA.
- El refactor de componentes (`AssistantRail`, `SidebarNav`, `Topbar`, `MobileDock`, `GlobalFeedbackShell`, `ShellNavigationBootstrap`) es una buena base, pero falta migrar estilos y controladores junto a sus limites de responsabilidad.
- Hay capas CSS historicas con `!important` que compiten entre si. Esto crea regresiones visuales aunque `astro check` y `astro build` pasen.
- El agente IA tiene logica de UI y flujo clinico mezclada con el resto de la app. Para produccion deberia separarse en un controlador de agente con estados claros: `idle`, `drafting`, `generating`, `ready`, `delivering`, `error`.
- La arquitectura deberia evolucionar hacia modulos de dominio: `patients`, `appointments`, `intakes`, `finance`, `documents`, `assistant`, `shell`.

## Hallazgos de diseno y UX

- El dashboard premium no debe ser decorativo. Debe responder a "que hago ahora": proxima cita, mensajes sin responder, pacientes sin seguimiento, cobros pendientes, documentos pendientes.
- El menu lateral y la topbar deben ser invisiblemente fiables. No pueden depender de estilos scoped fragiles tras una extraccion de componentes.
- La ficha de paciente debe convertirse en "case command center": resumen clinico, ultima sesion, dolor/adherencia, plan activo, documentos, pagos, proximos pasos.
- El agente IA debe ser chat-first. La conversacion debe ocupar la mayor parte del rail. Formularios, cards y contexto deben quedar compactos o colapsados.
- Los empty states deben ensenar accion, no ocupar pantalla. El estado vacio del agente debe sugerir 2-3 prompts rapidos y dejar sitio al composer.
- La experiencia debe sentirse clinica-premium: calmada, densa, limpia, rapida, con jerarquia clara y sin competir visualmente con el trabajo del fisio.

## Benchmark de producto

Cliniko y Jane marcan el estandar de gestion clinica por integracion de agenda, notas, facturacion, formularios, recordatorios, informes y experiencia paciente. Physitrack marca el estandar especifico de fisioterapia: prescripcion de ejercicios, adherencia, outcomes, telehealth/mensajeria, templates y colaboracion.

Implicacion para Fisio IA Agent:

- No basta con "CRM + chat IA". El diferencial premium debe ser "CRM operativo + motor clinico de planes + seguimiento de adherencia + entrega multicanal".
- La IA debe estar pegada a la ficha de caso y a la entrega al paciente, no aislada como una caja generica.
- Los datos operativos deben terminar en una accion: responder, reservar, cobrar, generar plan, enviar PDF/Telegram, pedir seguimiento.

## Principios de producto premium

1. Dia operativo primero: cada pantalla debe ayudar a cerrar el siguiente trabajo.
2. Caso clinico como centro: el paciente no es una fila, es un episodio con objetivo, historial, plan y evolucion.
3. IA con trazabilidad: todo plan debe guardar prompt, contexto, salida, entrega y estado de revision.
4. Densidad calmada: mas informacion util con menos volumen visual.
5. Accesibilidad real: foco visible, nombres accesibles, labels, orden de teclado y contraste AA.
6. Performance por defecto: evitar cascadas gigantes, JS monolitico y trabajo innecesario en runtime.

## Trabajo aplicado en esta fase

- Recuperacion global del shell tras mover markup a componentes.
- Refuerzo compacto del agente IA para evitar ventanas y cards gigantes.
- Runtime defensivo para que estilos antiguos con `!important` no vuelvan a inflar el chat.
- El chat ahora diferencia entre estado vacio compacto y conversacion activa con mas espacio.
- Composer limitado para evitar que el textarea se coma el rail.
- Scroll de conversacion dirigido al log, no a todo el contenedor.

## Roadmap recomendado

### Fase 0 - Hotfix produccion

- Redeploy de frontend en EasyPanel.
- Smoke visual de shell, dashboard, navegacion, agente IA, agenda, finanzas y documentos.
- Confirmar que produccion sirve el bundle nuevo y no cache viejo.

### Fase 1 - Estabilidad frontend

- Extraer CSS del shell a una hoja global estable o layout base.
- Crear `assistantRail.css` temporal con orden controlado.
- Reducir capas duplicadas `assistant-density-*`.
- Anadir smoke tests de DOM para sidebar/topbar/assistant.

### Fase 2 - Modularizacion JS

- `shellController.ts`: navegacion, sidebar, responsive, toasts.
- `assistantController.ts`: modos, chat, generacion, PDF, Telegram.
- `patientsController.ts`: listado, ficha, historial, busqueda.
- `appointmentsController.ts`: agenda, citas, detalle.
- `financeController.ts`: pagos, bonos, facturas, gestoria.
- `documentsController.ts`: documentos clinicos y exportaciones.

### Fase 3 - Experiencia clinica premium

- Redisenar `Ficha paciente` como command center.
- Unificar plan IA, seguimiento, dolor, adherencia, documentos y mensajes.
- Crear timeline clinico de caso con filtros: visita, nota, plan, documento, pago, mensaje.
- Introducir estados de plan: borrador, revisado, enviado, visto, seguimiento pendiente, ajustar.

### Fase 4 - IA de fisioterapia diferencial

- Prompt clinico estructurado tipo SOAP + objetivo funcional + contraindicaciones.
- Red flags y criterios de derivacion siempre visibles.
- Plan con progresion/regresion, dosis, frecuencia, criterio de parada y seguimiento.
- Generacion de PDF y Telegram desde el mismo estado de plan.
- Guardado de trazabilidad: contexto usado, version del plan, fisio revisor, fecha y canal.

### Fase 5 - Produccion y calidad

- Auditoria WCAG AA de flujos clave.
- Lighthouse local y presupuesto: JS comprimido bajo 300 KB por ruta objetivo.
- Revisar cabeceras de seguridad, cache, sourcemaps, errores de consola.
- Checklist de backups, variables de entorno, health checks backend y rollback.

## Checklist de smoke test tras deploy

- Shell: sidebar con ancho correcto, iconos alineados, topbar visible y buscador usable.
- Navegacion: Inicio, Pacientes, Agenda, Biblioteca, Finanzas, Documentos, Mensajes, Historial, Ajustes.
- Dashboard: no aparece hueco oscuro ni layout partido.
- Agente IA: abre compacto, estado vacio no supera 8.5rem, composer no supera 5.5rem, chat gana espacio al responder.
- Agenda: carga citas y detalle.
- Pacientes: listado, busqueda, ficha y alta.
- Finanzas: pagos, bonos, facturas y gestoria.
- Documentos: tabla y estados.
- Produccion: bundle nuevo visible en HTML y sin errores de consola.

## Criterio para continuar

Recomendacion de razonamiento:

- Alto: siguiente fase normal de produccion premium, refactor por modulos, UI/UX y QA.
- Extra alto: si vamos a tocar arquitectura completa, seguridad, IA clinica, n8n/backend, despliegue y criterios medico-legales en una misma fase.

Mi recomendacion: continuar en razonamiento alto hasta completar Fase 1 y Fase 2. Subir a extra alto para Fase 4 y Fase 5 si queremos dejarlo blindado a nivel clinico, legal y produccion.
