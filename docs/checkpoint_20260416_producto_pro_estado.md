# Checkpoint Producto Pro - 2026-04-16

## Punto de situacion
- Estado general: `en progreso`, con base funcional estable y enfoque claro a producto comercializable.
- Rama: `main`.
- Ultimo bloque ejecutado: integracion de flujo completo `Mensajes -> Cita -> Ficha -> Plan IA -> Finanzas`.

## Avances cerrados hasta este punto
1. Inbox unificado
- Navegacion y copy en espanol simplificados (`Mensajes`).
- Filtro por canal (`Telegram`, `Web/Formulario`, `Otros`).
- Filtro por prioridad (`Alta`, `Normal`).
- Resumen de volumen por canal y alta prioridad.
- Acciones en un clic por fila: `Ficha`, `Cita`, `Historial`.

2. Agenda conectada a captacion
- Desde `Mensajes`, boton `Cita` abre modal de agenda.
- Paciente precargado automaticamente.
- Motivo precargado con el texto del mensaje para acelerar triage a cita.

3. Historia clinica operativa
- Ficha con resumen, timeline, decisiones y accion recomendada.
- Nuevo bloque visual del circuito IA en 4 pasos:
  - `Plan generado`
  - `Entrega`
  - `Feedback`
  - `Ajuste recomendado`
- Version responsive del circuito (desktop, tablet, movil).

4. Motor IA clinico trazable
- Ya existe trazabilidad en datos de recomendacion, entrega y feedback.
- El estado del circuito ahora se ve en una sola zona de la ficha.

5. Finanzas integradas
- KPIs en `Pagos`: total, sesiones, efectivo, tarjeta.
- Nuevo resumen cruzado visible:
  - `Cobrado` (pagos del filtro)
  - `Pendiente` (facturas no pagadas)
  - `Bonos activos` (sesiones disponibles)

## Deuda tecnica viva (siguiente ronda)
1. Separar `frontend/src/pages/index.astro` por modulos para reducir riesgo y acelerar cambios.
2. Unificar textos y estados en un diccionario de copy (`es`) para evitar mezcla de estilos.
3. Consolidar capa de servicios API para errores consistentes entre modulos.

## Criterio de calidad operativo
- Flujos criticos en menos de 2 clics:
  - Mensaje pendiente -> cita creada.
  - Ficha paciente -> proximo paso visible.
  - Estado IA -> lectura del circuito sin cambiar de pestana.
  - Finanzas -> cobrado y pendiente visibles en la misma pantalla.

