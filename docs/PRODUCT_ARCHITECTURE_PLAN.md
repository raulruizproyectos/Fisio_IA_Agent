# Fisio IA Agent - Arquitectura Objetivo (Producto Pro)

## Vision
Plataforma clinica para fisioterapia con foco en 4 bucles: captacion, atencion, adherencia y cobro.

## Nuevo rumbo de producto y diseno (2026-05-05)
Fisio_IA_Agent pasa a tomar como referencia operativa la filosofia de Fikri Studio aplicada a productos SaaS: menos pantallas aisladas, mas workspace continuo; menos modales bloqueantes, mas paneles deslizantes contextuales; menos decoracion, mas claridad accionable.

Referencias principales para esta fase:
- Zendenta: gestion clinica limpia, simple y profesional para usuarios sanitarios.
- Schedulo: calendario como centro de trabajo con drawers para crear, revisar y resolver citas sin perder el contexto.
- Chatform: inbox multicanal con panel de contexto y acciones rapidas.
- RecruitSmart: arquitectura de informacion para productos complejos usados por perfiles no tecnicos.
- Refero Styles / Cycle: base visual principal para el CRM operativo: canvas claro, bloques suaves pero precisos, acentos funcionales por estado y elevacion minima.
- Refero Styles / Public + Amie: claridad editorial y superficie de trabajo blanca para que agenda, finanzas y agente IA se lean rapido durante consulta.

Principios del nuevo redisenio:
1. El CRM debe sentirse como una plataforma premium de operacion clinica, no como una suma de formularios.
2. Agenda, ficha, mensajes, copilot y finanzas deben funcionar como workspaces con paneles laterales.
3. El usuario nunca debe perder el contexto principal al crear una cita, revisar un paciente, responder Telegram o lanzar una accion IA.
4. La IA debe aparecer como capa contextual y accionable, no como chat generico flotante.
5. El agente IA de informes de ejercicios es pieza diferencial del producto: debe tratarse como flujo premium guiado para evaluar sintomas, seleccionar ejercicios, generar informe, archivar PDF y entregar por Telegram con trazabilidad.
6. Cada pantalla debe tener una accion dominante y estados claros: pendiente, confirmado, riesgo, parcial, error y completado.
7. Todo redisenio debe ser plenamente compatible con web y movil desde el primer bloque: sin solapes, sin overflow roto, acciones criticas accesibles y drawers adaptados a pantallas pequenas.
8. La arquitectura frontend debe avanzar hacia componentes y tokens reutilizables antes de partir modulos grandes.

Patron base adoptado:
- workspace principal visible,
- drawer derecho para detalle/accion,
- paneles compactos de estado,
- tablas solo cuando aportan densidad,
- tarjetas solo para unidades funcionales reales,
- motion sobria y rapida,
- lenguaje clinico en espanol directo,
- responsive real: desktop con drawer lateral, movil con panel a pantalla completa o bottom sheet cuando el flujo lo requiera.

Prioridad diferencial IA:
- Desde ficha: crear o progresar informe de ejercicios con contexto clinico cargado.
- Desde agenda: abrir panel IA vinculado a la cita/paciente para preparar sesion o plan domiciliario.
- Desde mensajes: convertir sintomas de Telegram en borrador de informe, con confirmacion profesional antes de enviar.
- Desde documentos/biblioteca: consultar informes archivados, PDF y estado de entrega/adherencia.

## Referentes de mercado (benchmark rapido)
- WebPT: suite completa (documentacion, agenda/front-office, billing, outcomes, AI).
- Jane: UX simple en un solo flujo (booking, charting, pagos, telehealth, AI scribe).
- Cliniko: PM limpio y estable (agenda, historias, facturacion, pagos, seguridad).
- Physitrack: adherencia domiciliaria y seguimiento remoto (ejercicios, dolor, outcomes, integraciones profundas).

## Principios de producto
1. Una pantalla = una decision operativa.
2. Menos modulos visibles, mas acciones claras.
3. Todo con estado: vacio, cargando, error, exito.
4. Lenguaje 100% espanol clinico simple.
5. Trazabilidad completa paciente -> plan -> entrega -> resultado -> cobro.

## Arquitectura funcional objetivo
### 1) Inbox Unificado
- Canal: Telegram / Web / Otros
- Triage por prioridad
- Accion en 1 clic: abrir ficha, responder, convertir en cita

### 2) Historia Clinica Operativa
- Resumen ejecutivo + linea temporal
- Notas estructuradas
- Riesgo, proximo paso, adherencia

### 3) Motor IA Clinico
- Generacion/progresion de plan
- Entrega PDF + Telegram
- Estado de adherencia y feedback

### 4) Agenda + Reserva
- Semana tactica
- Bloqueos externos visibles
- Conversion de intake a cita

### 5) Finanzas
- Pagos + bonos + facturacion
- KPIs minimos: facturado, cobrado, pendiente

## Arquitectura tecnica objetivo (siguiente fase)
1. Separar `index.astro` por modulos de pagina.
2. Crear capa de estado compartido (store) para paciente seleccionado, filtros y resumenes.
3. Crear capa API unificada (`services/*`) con manejo comun de errores.
4. Estandarizar componentes UI (card, table, badge, empty-state, toolbar).
5. Sistema de copy centralizado (`i18n/es.ts`) para evitar textos mezclados.

## Criterios de calidad (Definition of Done)
- Contraste AA minimo en texto funcional.
- Sin overflow ni solapes en mobile/desktop.
- Mensajes de sistema en espanol claro.
- Todas las vistas con estado vacio y error comprensible.
- Tiempo a accion principal < 2 clics.

## Orden de ejecucion recomendado
1. Modulo Mensajes (completado: filtro por canal + resumen de canales).
2. Modulo Pacientes (compactacion final + columnas accionables).
3. Modulo Agenda (conversion intake -> cita).
4. Modulo IA (flujos de plan por objetivo clinico).
5. Modulo Finanzas (dashboard de cobro/factura).

## Estado actual (2026-04-16)
- Mensajes: `completado` (canal + prioridad + acciones 1 clic).
- Agenda desde captacion: `completado` (mensaje -> modal cita con paciente y motivo precargados).
- Historia clinica: `completado` en base operativa + circuito visual IA en ficha.
- Motor IA trazable: `completado` en visualizacion de circuito (plan -> entrega -> feedback -> ajuste).
- Finanzas: `completado` en KPIs principales + resumen cruzado cobrado/pendiente/bonos.
- Proxima fase: modularizar `index.astro` y cerrar estandar de copy/servicios para escalar sin friccion.
