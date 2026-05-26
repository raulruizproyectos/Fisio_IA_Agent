# UX Audit And Redesign Proposal

## Diagnostico
El producto esta migrando de CRM tradicional a copiloto clinico con memoria. La deuda principal no es visual aislada: es arquitectura de UI monolitica y cascada CSS acumulada.

## Direccion
- IA como flujo de trabajo principal, no widget secundario.
- Un solo lenguaje visual: clinico, claro, premium, con menos ruido.
- Responsive por defecto en portatil, desktop, tablet y movil.
- Acciones clinicas trazables: plan, PDF, Telegram, historial.

## Quick wins
1. Mantener Agenda/Mensajes/Pacientes como vistas operativas limpias.
2. Convertir tablas densas a cards responsive bajo breakpoints.
3. Evitar nuevos estilos inline y nuevos overrides globales.
4. Smoke visual en EasyPanel antes de cada ronda UI.

## Refactor recomendado
Extraer de `frontend/src/pages/index.astro`:
- `appointmentsController`
- `patientsController`
- `financeController`
- `assistantController`
- `documentsController`

No hacerlo en una sesion de hotfix visual.
