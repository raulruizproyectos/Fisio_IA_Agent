# Fisio IA Agent - Arquitectura Objetivo (Producto Pro)

## Vision
Plataforma clinica para fisioterapia con foco en 4 bucles: captacion, atencion, adherencia y cobro.

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
