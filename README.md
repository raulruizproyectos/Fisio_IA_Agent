# Fisio Clinical

Plataforma CRM y asistente de gestión clínica para clínicas de fisioterapia. Integra gestión integral de pacientes, agenda conectada con Google Calendar, control de cobros y facturación, generación de documentos clínicos, canal de mensajería con Telegram y asistente para prescripción de planes terapéuticos guiados.

## Stack
- **Frontend**: Astro 7.3.7 estático, Tailwind CSS 4 y CSS con tokens y capa final única `premium-system.css` (Inter Tight), controladores JS/TS y Nanostores.
- **Backend**: Node.js / Express (ESM), Supabase Auth mediante cookies HttpOnly/CSRF y PostgreSQL con RLS, Google Calendar API/puentes OAuth n8n, Telegram Bot API, PDFKit.
- **Automatización**: n8n (workflows modulares versionados en `n8n/Fisio_IA_Agent`).

## Quick Start
```bash
# Frontend
cd frontend
npm ci
npm run check
npm run build

# Backend
cd ../backend
npm ci
npm run lint
npm test
```

## Environment
Los secretos nunca se versionan en Git. En desarrollo local se cargan desde `.env.local` en la raíz.
- **Backend**: `PORT`, `NODE_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `INTERNAL_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `GOOGLE_CALENDAR_CLIENT_EMAIL`, `GOOGLE_CALENDAR_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`.
- **Frontend**: `PUBLIC_SUPABASE_URL`, `PUBLIC_BACKEND_URL`. Auth pasa por backend; runtime no publica clave Auth. La guarda de configuración antigua sigue validando cualquier `PUBLIC_SUPABASE_ANON_KEY` existente como pública.

## Architecture
- Arquitectura de backend autoritativo con cliente Supabase por petición según JWT del profesional y RLS estricto en PostgreSQL.
- Frontend «Noche clínica aguamarina» (`DESIGN.md` v8, derivada del logo de Fisioteràpia CarlaJL): navegación en tinta `#0c1314`, lienzo `#f2f6f6`, acción/foco aguamarina `#136f74`, movimiento reducido.
- Detalle completo y diagrama ER en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation
- [docs/STATUS.md](docs/STATUS.md): **fuente canónica** del estado: punto de situación vigente, pendientes por prioridad y entradas por fecha.
- [docs/PROMPT_CONTINUAR.txt](docs/PROMPT_CONTINUAR.txt): prompt vigente para retomar el trabajo en una sesión nueva.
- [DESIGN.md](DESIGN.md): sistema de diseño vigente (v8) y su historia (v7, v6).
- [docs/CHANGELOG.md](docs/CHANGELOG.md): registro de cambios y checkpoints.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): componentes, seguridad, modelo de datos y flujos críticos.
- [docs/OPERATIONS.md](docs/OPERATIONS.md): guía operativa, despliegue en EasyPanel y migraciones.
- [docs/SEGUIMIENTO.md](docs/SEGUIMIENTO.md) y [docs/CONTINUAR.md](docs/CONTINUAR.md): seguimiento y cierres hasta el 16-oct (historia; el estado vigente está en STATUS).
- [docs/PUNTO_SITUACION_2026-10-16.md](docs/PUNTO_SITUACION_2026-10-16.md), [docs/AUDITORIA_FINAL_2026-10-16.md](docs/AUDITORIA_FINAL_2026-10-16.md), [docs/AUDITORIA_SEGUNDA_PASADA.md](docs/AUDITORIA_SEGUNDA_PASADA.md): auditorías y evidencias anteriores.
- [docs/PRODUCTION_TESTING.md](docs/PRODUCTION_TESTING.md): versiones desplegadas y comprobaciones reales de la primera prueba.
- [AGENTS.md](AGENTS.md): reglas canónicas del proyecto.

## Current Status

18 de octubre de 2026: producción con frontend `cf4e236` y backend `fb20a11` (EasyPanel, CI verde). El CRM ya lleva la marca y la paleta de Fisioteràpia CarlaJL; la demo al cliente se hace en local (`?demo=true`). Pendientes por prioridad en [docs/STATUS.md](docs/STATUS.md).

CRM público: https://fisio-frontend.b5xbaf.easypanel.host/login/ . Una clínica, RLS y aprobación profesional antes de PDF/envío. El agente de citas y el piloto de reservas siguen en pausa hasta la prueba de Raúl; [requisitos y límites](docs/PILOTO_MENSAJERIA.md). Nuevas acciones externas requieren autorización explícita para acción y destino.
