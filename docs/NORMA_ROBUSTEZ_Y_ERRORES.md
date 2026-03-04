# Norma Obligatoria de Robustez

Regla no negociable del proyecto:

`El sistema debe ser muy robusto y con control de errores.`

## Aplicacion obligatoria

- Todo flujo critico debe tener fallback funcional.
- Todo error debe dejar trazabilidad (`request_id`, contexto, estado).
- Ningun fallo de un servicio externo debe bloquear completamente el flujo principal.
- Respuestas al usuario deben ser seguras y claras incluso en degradacion.
- Cambios nuevos deben incluir validacion tecnica minima (sintaxis, contrato de payload, casos de error).

## Criterio de cierre de tarea

Una tarea no se considera cerrada si:

- rompe flujo en caso de timeout o error externo, o
- no registra errores de forma auditable, o
- no tiene comportamiento de degradacion controlada.
