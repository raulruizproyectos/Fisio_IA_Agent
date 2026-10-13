# Plan de mejoras

Esfuerzo: S ≈ menos de medio día, M ≈ 1–2 días, L ≈ más de 2 días. Son estimaciones aproximadas, sin falsa precisión. Todo lo que toque Cloud, n8n, envíos o gasto requiere tu autorización expresa.

## 1. Bloqueos antes de usar el bot con pacientes reales

| Cambio | Esfuerzo | Riesgo | Depende de | Aceptación |
| --- | --- | --- | --- | --- |
| **Retirar el bot heredado de pacientes** (P0-1): activar el agente nuevo o, de forma provisional, desactivar el flujo n8n «Bot paciente» | S (desactivar) / M (activar) | Bajo / medio | Tu autorización | Ningún mensaje de paciente llega a `/api/telegram/incoming` en modo `patient_appointments` |
| **Activar el agente de citas** (pasos en [AGENTE_CITAS.md](AGENTE_CITAS.md)) | M | Medio | Contacto de la clínica, franjas, decisión sobre festivos, migración, despliegue y flujo n8n | Parte B de [PRIMERA_PRUEBA.md](PRIMERA_PRUEBA.md) completa sin `revision_manual` inesperados |
| **Códigos de vinculación seguros** (P1-1) | Incluido en la activación | Bajo | Agente activo | Un código usado o caducado se rechaza desde otro chat |

La primera prueba del **CRM** (parte A) no depende de estos bloqueos.

## 2. Mayor valor después

| Cambio | Esfuerzo | Riesgo | Aceptación |
| --- | --- | --- | --- |
| Trazabilidad del motor clínico (P1-3): versionar `exercise-recommend` y guardar el modelo y la versión que devuelve | M | Bajo | Cada informe muestra motor, versión y prompt confirmados por el motor |
| Aviso a la clínica cuando el agente deriva o queda en revisión (n8n, prioridad 2) | M | Bajo | Un caso derivado genera un aviso confirmado al fisio, sin datos clínicos |
| `PUBLIC_BOOKING_WINDOWS` obligatoria en readiness (P2-2) | S | Bajo | Readiness falla sin la variable cuando la reserva o el agente están activos |
| Limitador global sin las rutas autenticadas por secreto (P2-4) | S | Bajo | Prueba: 300 mensajes del bot no bloquean `sync-calendar` |
| Ficha: una acción principal «Registrar sesión», identidad primero en móvil y próxima cita en cabecera (Propuesta 1.1–1.3) | M | Medio (DOM) | Contratos DOM intactos; un clic menos para la nota; nombre visible a 375 px |
| Textos con tildes y formato de moneda (P3) | S | Nulo | Cero cadenas afectadas por búsqueda |
| Resumen diario de agenda (n8n, prioridad 3) | S–M | Bajo | Mensaje diario solo en laborables, con datos correctos |

## 3. Trabajo posterior

| Cambio | Esfuerzo | Nota |
| --- | --- | --- |
| Eliminar la rama heredada `patient_appointments` de `/incoming` (unas 1.000 líneas) tras una semana con el agente | M | Reduce superficie y coste de mantenimiento |
| Extraer agenda y Calendar de `professional.js` a `lib/` | M | Solo cuando un cambio lo requiera; sin reescritura |
| Gráfico de evolución EVA (Propuesta 3) | S–M | SVG nativo |
| Recordatorio tras cambio de hora (permitir un recordatorio por versión de cita) | S | Requiere una migración pequeña |
| WhatsApp con la API oficial y alta de pacientes por ese canal | L | Proveedor, coste y verificación de negocio |
| Agente de llamadas | L | Proveedor de voz, presupuesto y RGPD |
| Comprensión de texto libre con un LLM limitado a intención y redacción | M | Solo si los pacientes lo necesitan; presupuesto autorizado |

## Preguntas para ti (afectan a negocio)

1. ¿Qué teléfono y/o email de la clínica debe dar el agente al derivar? Se guarda en `crm_clinicas`.
2. ¿La clínica trabaja en festivos? Hoy los festivos no bloquean la reserva.
3. Las citas de pacientes **nuevos** del bot: ¿confirmadas directamente (como ahora) o pendientes de revisión por la clínica?
