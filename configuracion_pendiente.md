# Pendiente operativo

## Deploy/smoke
1. EasyPanel source: repo privado con Deploy Key/SSH activa.
2. Frontend: repo `git@github.com:raulruizproyectos/Fisio_IA_Agent.git`, rama `main`, build path `frontend`.
3. Backend: mismo repo/rama, build path `backend`, Nixpacks Node 20, start `node src/index.js`.
4. Smoke: Inicio, Pacientes, Mensajes, Agenda, Finanzas, Documentos y Copiloto.
5. Confirmar Google Calendar: semana visible, bloqueos/festivos y refresco.
6. Probar plan IA, PDF, Telegram e historial.

## Incidencia resuelta 2026-05-27
- Error `Git key not found` / `Cannot access repository`: repo privado sin key valida en EasyPanel.
- Solucion: generar SSH key en EasyPanel, anadirla como GitHub Deploy Key y usar URL SSH.
- No tocar codigo si el error ocurre antes de build.

## Deuda controlada
- Modularizar `frontend/src/pages/index.astro`.
- Separar servicios backend de `professional.js`, `telegram.js`, `exercises.js`.
- Reducir cascada CSS con `!important`.
- Revisar cambios locales backend/auth antes de publicar.
