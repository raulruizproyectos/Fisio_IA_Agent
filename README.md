# Fisio_IA_Agent

CRM + Agents para centros de fisioterapia: gestion de pacientes, citas y recomendaciones de ejercicios desde Telegram y CRM Web, orquestado con n8n y Supabase.

## Alcance activo (pivot)
- CRM Web para operacion clinica.
- Agente de Citas (Telegram + n8n + Google Calendar + Supabase).
- Agente IA de Ejercicios (Telegram + boton CRM + n8n OpenAI + Supabase + Storage).
- Source of truth unico: Supabase del proyecto Fisio_IA_Agent.

## En pausa
- Generación de video (desactivada en backend y eliminada del frontend/n8n activo).

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
- `GET /api/profesional/program-templates`
- `POST /api/profesional/program-templates/clone`
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
- Produccion actual: `n8n/Fisio_IA_Agent/production/` (sin workflows de video).
- Canonicos vNext: `n8n/Fisio_IA_Agent/vnext/`
  - `telegram-chat.json` (W0 trigger Telegram nativo)
  - `fisio-agent-core.json` (W0 router core)
  - `w1-appointment-agent.json`
  - `w2-exercise-agent.json`
  - `w3-crm-trigger.json`
  - `sw-fisio-pending-intakes.json`

## Storage de imagenes de movimientos
- Bucket: `ejercicios` (private).
- En DB se persiste `object_key` (no signed URL).
- Signed URL JIT generado en n8n con service role key.

## Importar catalogo PROET (programas + ejercicios)
Se puede extraer un snapshot reutilizable desde `app.exerciciterapeutic.cat` para alimentar W2:

```bash
node scripts/proet-export.mjs --email=<tu_email> --locale=val
```

- Salida por defecto: `docs/data/proet_snapshot_YYYYMMDD.json`
- Incluye:
  - perfil origen
  - templates mas usados
  - programas del profesional
  - ejercicios unicos (descripcion e imagen)
- No guarda credenciales en el repo.

## Sincronizar snapshot PROET a Supabase
Para poblar `crm_ejercicios_catalogo` (y `dolencias`) desde el snapshot:

```bash
node scripts/proet-sync-supabase.mjs
```

- Usa por defecto:
  - snapshot mas reciente en `docs/data/proet_snapshot_YYYYMMDD.json`
  - credenciales de `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Modo simulacion:
  - `node scripts/proet-sync-supabase.mjs --dry-run=true`

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
- Analisis PROET (frontend + backend): `docs/proet/platform_analysis_20260304.md`
- Norma n8n obligatoria (carpeta/tag): `docs/n8n/NORMA_CARPETA_FISIO_IA_AGENT.md`
- Norma obligatoria de robustez y control de errores: `docs/NORMA_ROBUSTEZ_Y_ERRORES.md`
