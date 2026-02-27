# Fisio_IA_Agent

Asistente IA para fisioterapia: centraliza la introduccion de sintomas por Telegram/web, permite al profesional revisar casos y automatiza la generacion, revision y envio de videos de ejercicios.

## Estado actual (2026-02-27)
- Backend y esquema de datos migrados a nomenclatura en espanol.
- Flujo n8n operativo con subworkflows:
  - Pendientes de ingesta
  - Crear y render de video
  - Revision y envio de video
- Orquestador activo con webhooks:
  - `GET /webhook/fisio/intakes/pending`
  - `POST /webhook/fisio/video/crear`
  - `POST /webhook/fisio/video/review`

## Arquitectura
- Frontend: Astro
- Backend: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Automatizacion: n8n

## Endpoints backend principales
- `POST /api/telegram/incoming`
- `POST /api/telegram/link-code/:patientId`
- `POST /api/agent/message`
- `GET /api/profesional/intakes/pending`
- `GET /api/profesional/patients/:patientId/history`
- `POST /api/profesional/notes`
- `POST /api/profesional/video-jobs`
- `POST /api/profesional/video-jobs/:jobId/render`
- `POST /api/profesional/video-jobs/:jobId/review`
- `POST /api/profesional/video-jobs/:jobId/send`

## Tablas necesarias (espanol)
- `profesionales`
- `pacientes`
- `dolencias`
- `ejercicios`
- `planes`
- `items_plan`
- `sesiones`
- `vinculos_telegram_pacientes`
- `mensajes_ingesta_paciente`
- `notas_seguimiento_paciente`
- `trabajos_video_ejercicio`
- `eventos_visualizacion_video`

## Workflows n8n activos (Fisio)
- `Fisio_IA_Agent / Nucleo Agente`
- `Fisio_IA_Agent / Subflujo Pendientes`
- `Fisio_IA_Agent / Subflujo Crear y Render Video`
- `Fisio_IA_Agent / Subflujo Revision Video`
- `Fisio_IA_Agent / Orquestador Intake-Video`
- `Fisio_IA_Agent / Puente Error Backend`

## Inicio rapido
```bash
# backend
cd backend
npm install
cp .env.example .env
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

## Continuidad
- Estado detallado por sesion: `CHANGELOG.md`
- Checklist operativo para retomar: `configuracion_pendiente.md`

