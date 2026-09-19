# Fisio IA Agent

Plataforma CRM y asistente clínico inteligente para clínicas de fisioterapia. Integra gestión integral de pacientes, agenda conectada con Google Calendar, control de cobros y facturación, generación de documentos clínicos, canal de mensajería con Telegram y Copiloto IA para prescripción de planes terapéuticos guiados.

## Stack
- **Frontend**: Astro 5 (modo estático con islas interactivas), CSS modular con Design Tokens (DM Sans `ss03`), Nanostores.
- **Backend**: Node.js / Express (ESM), Supabase Auth (JWT) + PostgreSQL con RLS, Google Calendar API (Service Account), Telegram Bot API, PDFKit.
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
- **Frontend**: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_BACKEND_URL`.

## Architecture
- Arquitectura de backend autoritativo con cliente Supabase por petición según JWT del profesional y RLS estricto en PostgreSQL.
- Frontend con diseño editorial clínico (*Turn.io style*) estructurado en habitaciones cromáticas pasteles con *Canopy Green* como ancla de marca y *Coral Pulse* exclusivo para acciones primarias.
- Detalle completo y diagrama ER en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Componentes, seguridad, modelo de datos y flujos críticos.
- [docs/STATUS.md](docs/STATUS.md): Estado actual del proyecto, componentes estables, prioridades y decisiones.
- [docs/OPERATIONS.md](docs/OPERATIONS.md): Guía operativa, despliegue en EasyPanel/producción y migraciones.
- [docs/CHANGELOG.md](docs/CHANGELOG.md): Registro histórico de cambios y checkpoints.
- [AGENTS.md](AGENTS.md): Reglas canónicas obligatorias para agentes IA.

## Current Status
El sistema cuenta con backend endurecido (18/18 tests unitarios/integración pasando), verificación estática limpia de Astro (0 errores) y reconstrucción visual v4.0 terminada. Listo para despliegue y aplicación de migración en Supabase Cloud. Ver [docs/STATUS.md](docs/STATUS.md).
