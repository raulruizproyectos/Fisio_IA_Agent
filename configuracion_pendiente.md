# Pendiente operativo

## Deploy/smoke
1. Redeploy `fisio-frontend` en EasyPanel desde `main`.
2. Hard refresh.
3. Probar Inicio, Pacientes, Mensajes, Agenda, Finanzas, Documentos y Copiloto.
4. Confirmar Google Calendar: semana visible, bloqueos/festivos y refresco.
5. Probar plan IA, PDF, Telegram e historial.

## Deuda controlada
- Modularizar `frontend/src/pages/index.astro`.
- Separar servicios backend de `professional.js`, `telegram.js`, `exercises.js`.
- Reducir cascada CSS con `!important`.
- Revisar cambios locales backend/auth antes de publicar.
