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
- [docs/CONTINUAR.md](docs/CONTINUAR.md): Cierre vigente y encargo actual; los cierres anteriores quedan como historia.
- [docs/PROMPT_AUDITORIA_CLOUDCODE.txt](docs/PROMPT_AUDITORIA_CLOUDCODE.txt): Prompt completo para la segunda auditoría independiente, con contexto, repositorio, límites y 25 recursos de diseño.
- [docs/PRODUCTION_TESTING.md](docs/PRODUCTION_TESTING.md): Versiones desplegadas, comprobaciones reales y límites de la primera prueba.
- [docs/SEGUIMIENTO.md](docs/SEGUIMIENTO.md): Documento integral de seguimiento, post-mortem, matriz E2E y despliegue EasyPanel.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Componentes, seguridad, modelo de datos y flujos críticos.
- [docs/STATUS.md](docs/STATUS.md): Estado actual del proyecto, componentes estables, prioridades y decisiones.
- [docs/OPERATIONS.md](docs/OPERATIONS.md): Guía operativa, despliegue en EasyPanel/producción y migraciones.
- [docs/CHANGELOG.md](docs/CHANGELOG.md): Registro histórico de cambios y checkpoints.
- [AGENTS.md](AGENTS.md): Reglas canónicas del proyecto.

## Current Status
Actualizado el 13 de octubre de 2026: frontend `c062967` y backend `ee3449c` desplegados en EasyPanel, ambos CI verdes. Readiness 13/13, Supabase sano y Calendar sync healthy; doce workflows n8n activos y coincidentes con fuente. El handler backend ya evita alertas CRITICAL por rechazos esperados 4xx. Backend lint/108 pruebas y frontend check/build pasan. [Evidencia y límites](docs/design-exploration/reviews/2026-10-13/production.md).

CRM público: https://fisio-frontend.b5xbaf.easypanel.host/login/ . Una clínica, aprobación profesional obligatoria antes de PDF/envío. No se acreditan generación IA con gasto ni entrega clínica real a pacientes en esta sesión; sí hubo un correo automático de monitorización antes de corregir el handler. Pilotos WhatsApp/Telegram booking desactivados, distintos del bot Telegram activo y de la reserva pública web.

El usuario pide ahora una segunda opinión profunda con CloudCode antes de su primera prueba manual y completar localmente el agente de citas Telegram. Aceptará nuevos/existentes con contacto verificado, reserva/consulta/cambio/cancelación/recordatorio; cambios/cancelaciones hasta 24 horas antes, después clínica. WhatsApp queda previsto para el futuro. Son requisitos nuevos, no una afirmación de que el piloto actual ya los cumpla. Documentación de traspaso actualizada en local; [prompt de auditoría e implementación](docs/PROMPT_AUDITORIA_CLOUDCODE.txt), [contrato del agente](docs/PROMPT_AGENTE_CITAS.txt) y [requisitos](docs/PILOTO_MENSAJERIA.md). Carpeta exacta del repositorio: `C:\Visual Code\FISIO_IA_AGENT\Fisio_IA_Agent`. No clonar/resetear para descartar el árbol de trabajo.
