# Arquitectura

## Principio
Fisio_IA_Agent usa arquitectura hibrida:
- Backend autoritativo para API, validacion, persistencia, PDF y contratos.
- n8n para orquestacion conversacional y automatizacion.
- Frontend como superficie de producto, sin logica clinica critica.

## Componentes
| Componente | Rol |
| --- | --- |
| Astro frontend | CRM web, shell, vistas, agente IA |
| Express backend | API, PDF, Supabase, readiness, Telegram bridge |
| Supabase DB | Source of truth operativo |
| Supabase Storage | Media privada de ejercicios |
| n8n | Workflows W0/W1/W2/W3/W5/W6 |
| Telegram | Canal paciente/fisio |
| Google Calendar | Disponibilidad y citas |
| OpenAI | Razonamiento clinico/ejercicios |

## Workflows vivos
- W0: entrada Telegram/router.
- W1: citas.
- W2: agente de ejercicios.
- W3: trigger CRM.
- W5: lector Calendar.
- W6: escritor/sync Calendar.

## Estado frontend
- Archivo critico: `frontend/src/pages/index.astro`.
- Riesgo principal: monolito grande con HTML, CSS y JS juntos.
- Capa actual de navegacion:
  - router principal `navigateTo`,
  - fallback temprano `__fisioShellNavigate`,
  - paginas no activas ocultas con `hidden`.
- Siguiente refactor recomendado:
  - extraer shell/router,
  - extraer finanzas,
  - extraer agenda,
  - extraer agente IA.

## Contratos que no se deben romper
- `/api/profesional/appointments`
- `/api/profesional/appointments/sync-calendar/status`
- `/api/pagos`
- `/api/facturas`
- `/api/bonos`
- `/api/documentos`
- `/api/exercises/recommend`
- `/api/exercises/recommend/async`
- `/api/telegram/*`

## Direccion producto
- Premium clinico sobrio.
- Menos ruido, mas accion directa.
- Cada pantalla debe responder: que miro, que hago ahora, que puede esperar.
- Evitar nuevas capas CSS correctivas sin retirar deuda antigua.
