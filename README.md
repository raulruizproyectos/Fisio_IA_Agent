# Fisio_IA_Agent

CRM + Agents para centros de fisioterapia: gestion de pacientes, citas y recomendaciones de ejercicios desde Telegram y CRM Web, orquestado con n8n y Supabase.

## Alcance activo (pivot)
- CRM Web para operacion clinica.
- Agente de Citas (Telegram + n8n + Google Calendar + Supabase).
- Agente IA de Ejercicios (Telegram + boton CRM + n8n OpenAI + Supabase + Storage).
- Source of truth unico: Supabase del proyecto Fisio_IA_Agent.

## En pausa
- Pipeline de video fuera del alcance actual.
- Se mantiene trazabilidad historica en CHANGELOG, pero el repo se limpia de workflows de video legacy.

## Arquitectura actual
- Frontend CRM: Astro
- Backend API: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Storage: Supabase Storage bucket `ejercicios` (private)
- Automatizacion: n8n
- IA de seleccion: OpenAI node en n8n
- Agenda: Google Calendar (via n8n)

## Endpoints backend principales
- `POST /api/telegram/incoming`
- `POST /api/telegram/link-code/:patientId`
- `POST /api/agent/message`
- `GET /api/profesional/intakes/pending`
- `GET /api/profesional/appointments`
- `POST /api/profesional/appointments`
- `PATCH /api/profesional/appointments/:appointmentId`
- `GET /api/profesional/patients/:patientId/history`
- `POST /api/profesional/notes`

## Tablas base existentes
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

## Propuesta vNext
- `database/schema_vnext.sql` contiene una propuesta aditiva para CRM + Agents.

## Workflows n8n versionados en repo
- `Fisio_IA_Agent / Nucleo Agente`
- `Fisio_IA_Agent / Subflujo Pendientes`
- `Fisio_IA_Agent / Telegram Chat`
- `Fisio_IA_Agent / W1 Appointment Agent`

## Storage de imagenes de movimientos
- Bucket: `ejercicios` (private).
- En DB se persiste `object_key` (no signed URL).
- Signed URL JIT generado en n8n con service role key.

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
- Arquitectura objetivo: `ARCHITECTURE.md`
