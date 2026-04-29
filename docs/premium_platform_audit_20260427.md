# Auditoria premium de plataforma - 2026-04-27

## Lectura ejecutiva

Fisio_IA_Agent ya tiene una base de producto fuerte: CRM clinico, agenda con Google Calendar, Telegram, Copilot, planes IA, PDF, documentos, pagos, bonos y reserva online. El siguiente salto de calidad no debe ser sumar mas piezas, sino convertir lo existente en una experiencia mas clara, rapida, coherente y mantenible.

Objetivo de la siguiente fase:

- ficha de paciente como centro operativo del caso,
- dashboard como cockpit diario,
- Copilot como accion clinica guiada, no chat generico,
- historial como auditoria longitudinal,
- biblioteca como repositorio de planes IA,
- documentos como circuito administrativo/legal,
- backend/n8n como fronteras robustas, trazables y observables.

## Estado tecnico observado

- Frontend principal: `frontend/src/pages/index.astro`, 22.201 lineas y unos 839 KB.
- Backend con rutas grandes:
  - `backend/src/routes/professional.js`: 3.287 lineas,
  - `backend/src/routes/telegram.js`: 3.022 lineas,
  - `backend/src/routes/exercises.js`: 1.896 lineas.
- Build actual:
  - `npm run check`: OK, 0 errores, 0 warnings, 0 hints.
  - `npm run build`: OK.
- Riesgo principal:
  - el producto depende de un frontend monolitico con HTML, estilos, estado, API calls, routing SPA y handlers mezclados.
- Riesgo visual principal:
  - hay demasiadas capas historicas de CSS correctivo, muchos `!important`, estilos inline y bloques de reset por fases.
- Riesgo de UX principal:
  - algunas superficies compiten por el mismo trabajo del usuario. La correccion iniciada hoy ya mueve el uso diario hacia la ficha de paciente.

## Cambios aplicados en esta sesion

- `Historial` pasa a llamarse `Seguimiento del caso` y queda descrito como auditoria longitudinal.
- `Seguimiento del caso` se endurece para produccion: los fallos parciales no exponen errores HTTP/JSON y el usuario puede seguir abriendo ficha o guardando nota.
- Backend acompana el fix: resolucion de pacientes CRM/legacy y lectura Telegram mas tolerante.
- La ficha completa se endurece para pacientes antiguos: si el paciente no esta en `crm_pacientes`, se devuelve una ficha minima legacy con aviso claro en vez de bloquear el flujo.
- La ficha de paciente queda reforzada como vista primaria:
  - busqueda superior abre ficha,
  - proxima sesion del dashboard abre ficha si hay paciente,
  - pacientes, agenda, intakes y biblioteca abren ficha para trabajar el caso,
  - historial mantiene acciones directas para volver a ficha o documentos del caso.
- `Documentos` queda explicitado como vista global; los documentos de un caso concreto viven en ficha.
- Se reutiliza `mobileDock` para estado activo y se consumen totales que antes generaban avisos.
- `Finanzas` empieza a comportarse como superficie operativa: prioridad de caja, acciones directas y lectura conjunta de pagos, facturas pendientes y bonos.
- `Facturas`, `Bonos` y `Gestoria` comparten ya el marco visual de `Finanzas`: mismo encabezado, contexto de subvista y vuelta rapida al resumen.
- Limpieza interna de Finanzas iniciada: clases comunes para acciones destructivas, preview de factura sin inline y progreso de bonos con `progress` nativo.
- Validacion local cerrada con `astro check` y `astro build` OK.

## Arquitectura objetivo premium

### 1. Frontend modular

Extraer el monolito en capas:

- `src/pages/index.astro`: shell y montaje.
- `src/components/shell/`: sidebar, topbar, mobile dock, page layout.
- `src/components/ui/`: botones, tabs, cards, estados vacios, tablas, badges, modales.
- `src/components/patients/`: directorio, ficha, timeline, rail de continuidad.
- `src/components/copilot/`: rail, formulario clinico, entrega, historial de respuestas.
- `src/components/agenda/`: semana tactica, bloqueos, alta/edicion de cita.
- `src/components/finance/`: pagos, facturas, bonos, resumen financiero.
- `src/services/api.ts`: fetch comun, timeouts, errores normalizados.
- `src/state/clinic-store.ts`: paciente seleccionado, pagina activa, filtros y cache basica.

Primer objetivo tecnico: bajar `index.astro` por debajo de 4.000 lineas sin cambiar contratos backend.

### 2. Design system clinico

Crear un sistema visual unico:

- tokens de color, spacing, radius, shadow y tipografia en un solo archivo,
- eliminar estilos inline funcionales salvo casos inevitables,
- reducir `!important` a resets documentados,
- componentes con estados: idle, loading, empty, partial, error, success,
- botones con jerarquia constante: primary = siguiente accion clinica, secondary = flujo operativo, ghost = navegacion secundaria.

Direccion visual recomendada:

- premium clinico sobrio,
- claro, rapido de escanear, sin decoracion gratuita,
- tarjetas solo para unidades funcionales reales,
- menos beige/teal repetido y mas contraste operativo: neutros limpios, acento clinico, estados semanticos claros.

### 3. Producto y navegacion

Mapa recomendado:

- `Inicio`: hoy, prioridades, agenda inmediata, mensajes criticos, caja de accion IA.
- `Pacientes`: busqueda y apertura de ficha.
- `Ficha`: fuente de verdad diaria del caso.
- `Agenda`: semana tactica y bloqueos reales.
- `Mensajes`: inbox unificado y conversion a cita/ficha.
- `Copilot`: overlay/rail contextual, siempre con paciente y objetivo.
- `Finanzas`: una pagina real con pestanas internas, no cuatro paginas SPA separadas.
- `Biblioteca`: planes IA y plantillas terapeuticas.
- `Documentos`: firmas y consentimientos administrativos.
- `Seguimiento`: auditoria historica avanzada, no vista principal.

### 4. Backend y n8n

Mantener la arquitectura hibrida, pero endurecer limites:

- backend autoritativo para API, PDF, persistencia, idempotencia y readiness,
- n8n para orquestacion conversacional y automatizacion,
- contratos JSON versionados por flujo (`W0`, `W1`, `W2`, `W3`, `W5`, `W6`),
- request_id obligatorio en operaciones multicanal,
- errores con codigo estable para frontend (`module_unavailable`, `calendar_conflict`, `telegram_unlinked`, etc.).

Refactor backend recomendado:

- extraer servicios de calendario desde `professional.js`,
- extraer parsing/intent/booking desde `telegram.js`,
- extraer archivado/reporting desde `exercises.js`,
- mantener rutas Express finas y orientadas a contratos.

### 5. Datos, seguridad y observabilidad

Prioridades:

- cerrar migraciones CRM pendientes en produccion antes de añadir nuevas tablas,
- convertir los templates RLS de `schema_vnext.sql` en politicas reales cuando haya auth multiusuario,
- dashboard de readiness visible para admin,
- audit log consultable desde CRM,
- smoke tests versionados para:
  - cita Telegram,
  - disponibilidad Calendar,
  - generar plan,
  - archivar PDF,
  - enviar Telegram,
  - firmar documento,
  - registrar pago/factura.

## Roadmap de ejecucion

### Fase 1 - Premium practico sin romper contratos

Objetivo: limpiar UX y flujos sobre la arquitectura actual.

1. Convertir `Finanzas` en una sola superficie real con pestanas internas.
2. Consolidar ficha como unico centro del caso:
   - documentos,
   - notas,
   - planes,
   - Telegram,
   - pagos/citas relevantes.
3. Sustituir `alert()` y `confirm()` por toasts/confirmaciones propias.
4. Limpiar estilos inline mas visibles en dashboard, agenda y documentos.
5. Smoke visual desktop/mobile tras cada bloque.

Estado parcial implementado:

- ficha como centro del caso: iniciado y validado,
- `Historial` reposicionado como `Seguimiento del caso`: iniciado y validado,
- toast/confirmacion propios: implementado,
- sidebar `Finanzas` como entrada semantica unica: implementado,
- panel operativo de Finanzas: implementado con prioridad y acciones directas,
- subpantallas Facturas/Bonos/Gestoria integradas visualmente en la superficie de Finanzas,
- limpieza interna de estilos financieros iniciada,
- Seguimiento robusto ante cargas parciales: implementado,
- endpoints de pacientes/Telegram mas tolerantes con CRM/legacy: implementado,
- ficha completa con fallback legacy limpio: implementado,
- pendiente: reducir duplicidad interna de tablas/resumenes financieros y limpiar estilos inline visibles restantes fuera de Finanzas.

### Fase 2 - Modularizacion frontend

Objetivo: que el producto sea escalable.

1. Extraer API client y helpers de formato.
2. Extraer shell y navegacion.
3. Extraer ficha de paciente.
4. Extraer Copilot.
5. Extraer agenda.
6. Crear `components/ui` y eliminar duplicidades de cards, empty states, badges y tablas.

### Fase 3 - Backend premium y observabilidad

Objetivo: robustez de producto comercial.

1. Servicios backend por dominio: agenda, telegram, ejercicios, documentos, finanzas.
2. Codigos de error estables.
3. Idempotencia explicita en cita y envio Telegram.
4. Panel admin de readiness + ultimos fallos.
5. Smoke tests remotos y locales documentados.

### Fase 4 - Capa comercial y experiencia final

Objetivo: que parezca producto listo para vender.

1. Reserva publica con branding real de clinica.
2. Portal paciente ligero para planes, documentos y citas.
3. Biblioteca terapeutica con filtros por zona, fase, objetivo y contraindicaciones.
4. Outcomes: EVA, adherencia y progreso visibles por caso.
5. Exportaciones premium: PDF clinico, resumen de evolucion, informe administrativo.

## Proximo bloque recomendado

Continuar Fase 1.4:

- reducir duplicidad interna de tablas, resumenes y acciones financieras,
- mantener el sistema pequeno de toast + confirmacion reutilizable ya implementado,
- limpiar estilos inline y recortar UI poco practica,
- validar con `npm run check` y `npm run build`.

Esto da un salto visible de producto sin tocar contratos backend ni n8n.
