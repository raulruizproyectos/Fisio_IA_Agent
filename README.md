# Fisio IA Agent

CRM clinico para fisioterapia con agenda Google Calendar, pacientes, finanzas, documentos, Telegram y Copiloto IA.

## Stack
- Frontend: Astro, Tailwind utilities, Nanostores, CSS modular.
- Backend: Node/Express, Supabase, Google Calendar, Telegram, PDFKit.
- Automatizacion: n8n workflows versionados en `n8n/Fisio_IA_Agent`.

## Arranque rapido
```powershell
cd frontend
npm.cmd ci
npm.cmd run check
npm.cmd run build

cd ..\backend
npm.cmd ci
npm.cmd run lint
npm.cmd test
```

## Contexto vivo
Lee primero `PROJECT_CONTEXT.md`. Es la fuente compacta para futuras sesiones.

## Estado de continuidad — 2026-09-01

- Trabajo activo: rama `production-hardening` y PR borrador [#1](https://github.com/raulruizproyectos/Fisio_IA_Agent/pull/1). `main` sigue intacta.
- Auditoria 2.0 implementada: seguridad, Supabase Auth/RLS, revision humana obligatoria de informes IA, trazabilidad, UX premium, rendimiento y endurecimiento de n8n.
- Validacion local completada: frontend (`check` y `build`), backend (`lint` y 9 pruebas), dependencias sin vulnerabilidades conocidas y JSON de n8n validos.
- Staging temporal: el proyecto Supabase vacio `CRM` recibio el esquema y la migracion; paso asesores de seguridad/rendimiento y pruebas transaccionales de aislamiento, aprobacion y solapamiento. Los datos de prueba se revirtieron. No se ha aplicado la migracion a produccion.
- Estado de n8n: los 15 workflows versionados permanecen desactivados; los 9 webhooks de produccion requieren autenticacion por cabecera. Gmail solo se usa para alertas tecnicas internas, no para pacientes.
- Pendiente antes de produccion: desplegar staging en EasyPanel, QA visual desktop/movil, smoke tests autenticados, probar credenciales reales de Supabase/OpenAI/Google Calendar/Telegram/n8n/Gmail, revisar RGPD/backups/observabilidad, aplicar la migracion productiva con confirmacion, activar workflows uno a uno, limpiar los objetos temporales de `CRM` y fusionar la PR.
- Restriccion: no crear recursos con coste y eliminar todo dato u objeto creado exclusivamente para pruebas cuando finalice la validacion.

### Orden para reanudar

1. Comprobar el ultimo commit remoto de `production-hardening` y el CI de la PR #1.
2. Abrir el staging de EasyPanel y ejecutar QA visual y funcional sin tocar produccion.
3. Validar integraciones reales mediante lectura o `dry run`; no enviar mensajes, correos ni citas reales sin confirmacion.
4. Corregir cualquier incidencia y repetir frontend, backend, dependencias y workflows.
5. Solicitar confirmacion antes de modificar Supabase productivo, desplegar produccion, activar n8n o fusionar a `main`.

## Reglas criticas
- No subir secretos. `.env.local` esta ignorado y es la fuente local.
- No romper IDs, `data-*` ni eventos del frontend: muchas vistas se hidratan desde `frontend/src/pages/index.astro`.
- `assistant-rail.css` es la fuente canonica del Copiloto IA.
- Google Calendar se renderiza en Agenda desde `renderAgendaCalendar()` y estilos `.agenda-*`.

## Deploy
- Rama productiva: `main`.
- Frontend EasyPanel: `fisio-frontend`.
- Backend EasyPanel: `fisio-backend`.
- Repo privado: usar Deploy Key/SSH en EasyPanel.
- URL SSH recomendada: `git@github.com:raulruizproyectos/Fisio_IA_Agent.git`.
- Build paths: `frontend` y `backend` sin `/` inicial.
- Checklist y orden seguro: `docs/PRODUCTION_READINESS.md`.

## Seguridad

- El panel profesional usa Supabase Auth; no hay UUID de profesional fijo en frontend.
- Las rutas clínicas usan JWT + RLS. Las rutas internas usan `INTERNAL_API_KEY`.
- Telegram y n8n utilizan secretos de webhook independientes.
- Todo informe generado por IA requiere aprobación profesional antes de PDF o envío al paciente.
