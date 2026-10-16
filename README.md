# Fisio Clinical

Plataforma CRM y asistente de gestión clínica para clínicas de fisioterapia. Integra gestión integral de pacientes, agenda conectada con Google Calendar, control de cobros y facturación, generación de documentos clínicos, canal de mensajería con Telegram y asistente para prescripción de planes terapéuticos guiados.

## Stack
- **Frontend**: Astro 7.3.7 estático, Tailwind CSS 4 y CSS modular con Design Tokens (DM Sans `ss03`), controladores JS/TS y Nanostores.
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
- Frontend con Precisión azul (`DESIGN.md`): superficies blancas, lienzo `#f4f7fb`, acción/foco azul `#175dd0`, lectura clínica y movimiento reducido.
- Detalle completo y diagrama ER en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation
- [docs/PUNTO_SITUACION_2026-10-16.md](docs/PUNTO_SITUACION_2026-10-16.md): Estado actual, evidencias, pendientes y alcance de la segunda revisión.
- [docs/CONTINUAR.md](docs/CONTINUAR.md): Cierre vigente y encargo actual; los cierres anteriores quedan como historia.
- [docs/PROMPT_AUDITORIA_CLOUDCODE.txt](docs/PROMPT_AUDITORIA_CLOUDCODE.txt): Prompt vigente: contexto, recomendación inicial de modelos/razonamiento/agentes y segunda auditoría independiente, con límites y referencias de diseño.
- [docs/PRODUCTION_TESTING.md](docs/PRODUCTION_TESTING.md): Versiones desplegadas, comprobaciones reales y límites de la primera prueba.
- [docs/SEGUIMIENTO.md](docs/SEGUIMIENTO.md): Documento integral de seguimiento, post-mortem, matriz E2E y despliegue EasyPanel.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Componentes, seguridad, modelo de datos y flujos críticos.
- [docs/STATUS.md](docs/STATUS.md): Estado actual del proyecto, componentes estables, prioridades y decisiones.
- [docs/OPERATIONS.md](docs/OPERATIONS.md): Guía operativa, despliegue en EasyPanel/producción y migraciones.
- [docs/CHANGELOG.md](docs/CHANGELOG.md): Registro histórico de cambios y checkpoints.
- [AGENTS.md](AGENTS.md): Reglas canónicas del proyecto.

## Current Status

Punto de situación del 16 de octubre de 2026, lectura remota a las 18:18 Europe/Madrid: frontend ea7f998, backend 3d4cce7 y Calendar healthy; W5 publicado con intervalo correcto. [Estado, evidencia y límites](docs/PUNTO_SITUACION_2026-10-16.md). Las reparaciones están desplegadas y la primera prueba de Raúl ya comenzó. CI de producto verde; esta entrega solo documental no necesita redeploy.

Raúl solicita ahora que Calcode/Claude Code continúe una segunda revisión independiente de código, diseño y funcionalidades para el testing final. Antes de auditar debe leer el contexto y proponer modelos, razonamiento y reparto por agentes con consumo ajustado, esperando confirmación. [Prompt listo para copiar](docs/PROMPT_AUDITORIA_CLOUDCODE.txt). La fuente es la carpeta `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`, rama main; no descartar el árbol ni publicar .claude/ o privados.

CRM público: https://fisio-frontend.b5xbaf.easypanel.host/login/ . Una clínica, RLS y aprobación profesional antes de PDF/envío. No se acredita IA de pago ni entrega clínica real por las suites o fixtures. El booking bajo pausa no se activa ni se reimplementa por esta revisión; [requisitos y límites](docs/PILOTO_MENSAJERIA.md). Nuevas acciones externas requieren autorización explícita para acción y destino.
