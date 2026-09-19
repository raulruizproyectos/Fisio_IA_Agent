# Operations

Guía de desarrollo local, validación, despliegue y mantenimiento de Fisio IA Agent.

## Local Development

### Requisitos
- Node.js 20+
- PowerShell (Windows) o Bash (Linux/macOS)
- Archivo `.env.local` en la raíz con las credenciales requeridas.

### Inicio Rápido
```bash
# Frontend (puerto 4321)
cd frontend
npm run dev

# Backend (puerto 3001)
cd backend
npm run dev
```

### Scripts de Apoyo en `scripts/`
- `powershell -ExecutionPolicy Bypass -File scripts/check-secrets.ps1`: Verifica que `.env.local` contiene todas las claves requeridas.
- `powershell -ExecutionPolicy Bypass -File scripts/doctor-windows-workspace.ps1`: Diagnóstico del entorno de desarrollo local.

## Build & Validation

Ejecutar siempre antes de hacer commit o desplegar:

```bash
# Validación Backend
cd backend
npm run lint
npm test

# Validación Frontend
cd ../frontend
npm run check
npm run build
```

## Environment Variables

### Backend (`backend/.env` o variables de hosting)
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
FRONTEND_URL=https://crm.tudominio.com
INTERNAL_API_KEY=<secreto-interno-min-32-chars>
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_BOT_USERNAME=<bot-username>
TELEGRAM_WEBHOOK_SECRET=<webhook-secret>
N8N_BASE_URL=https://n8n.tudominio.com
N8N_API_KEY=<n8n-api-key>
N8N_WEBHOOK_SECRET=<n8n-webhook-secret>
OPENAI_API_KEY=sk-...
GOOGLE_CALENDAR_CLIENT_EMAIL=<service-account@iam.gserviceaccount.com>
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CALENDAR_ID=<calendar-id>
```

### Frontend (`frontend/.env` o variables de hosting)
```env
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
PUBLIC_BACKEND_URL=https://api.tudominio.com
```

## Database & Migrations

### Migración de Producción
1. Conectar a Supabase Cloud (SQL Editor).
2. Ejecutar los scripts de verificación previa (no destructivos):
   - `database/preflight/preflight_01_tablas_columnas.sql`
   - `database/preflight/preflight_02_estado_entorno.sql`
3. Aplicar el script de endurecimiento:
   - `database/migrations/20260901_production_security_hardening.sql`
   *(Habilita RLS en tablas `crm_*`, crea políticas de aislamiento y tabla `crm_audit_log` restringida a `service_role`).*

## Deployment (EasyPanel / VPS)

### Configuración General
- **Repositorio**: `git@github.com:raulruizproyectos/Fisio_IA_Agent.git` (usar Deploy Key SSH en EasyPanel).
- **Rama productiva**: `main`.
- **Servicio Frontend**:
  - Nombre: `fisio-frontend`
  - Build Path: `frontend` (sin barra inicial)
  - Método: Dockerfile
  - Puerto: `80`
  - Healthcheck: `/health`
- **Servicio Backend**:
  - Nombre: `fisio-backend`
  - Build Path: `backend` (sin barra inicial)
  - Método: Nixpacks (Node 20)
  - Comando de inicio: `node src/index.js`
  - Puerto: `3001`
  - Healthcheck: `/health` o `/api/health`

### Verificación Post-Despliegue
1. `GET /api/health`: Debe responder `{"status":"ok"}` con código 200.
2. `GET /api/health/readiness`: Requiere cabecera `Authorization: Bearer <JWT>` o `x-internal-key: <INTERNAL_API_KEY>`.
3. Smoke visual: Acceder a `/` y verificar que el inicio de sesión o panel de demostración cargan correctamente sin errores de consola.
