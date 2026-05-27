# PROJECT_CONTEXT

## Proposito
SaaS clinico para fisioterapia: CRM, agenda, pagos, documentos, Telegram y Copiloto IA para planes de ejercicios.

## Stack
Frontend Astro + Nanostores + CSS (`global-shell.css`, `assistant-rail.css`, `premium-clinic-ui.css`). Backend Express + Supabase + Google Calendar + Telegram + PDFKit. n8n orquesta workflows W0/W1/W2/W3/W5/W6.

## Estructura
- `frontend/src/pages/index.astro`: monolito funcional; conserva IDs/data hooks.
- `frontend/src/components/views/*`: markup de vistas CRM.
- `frontend/src/styles/assistant-rail.css`: Copiloto IA.
- `frontend/src/styles/premium-clinic-ui.css`: UI SaaS responsive.
- `backend/src/routes/*`: API CRM/Calendar/Telegram/IA.
- `n8n/Fisio_IA_Agent/{production,vnext}`: workflows versionados.
- `database/migrations`: cambios SQL.

## Estado 2026-05-27
- EasyPanel vuelve a desplegar. Causa real del bloqueo: repo privado/sin Git key valida; no era fallo de Astro/Node.
- Source EasyPanel: usar SSH `git@github.com:raulruizproyectos/Fisio_IA_Agent.git`, rama `main`, build paths `frontend` y `backend` sin slash inicial.
- `origin/main` incluye fixes UI responsive, Mensajes, Agenda semanal visual y hardening backend para health/puertos.
- Validado reciente: frontend `npm.cmd run check/build` OK, backend `npm.cmd run lint` OK, n8n JSON OK.
- Workspace local principal puede tener cambios backend/sidebar previos no publicados. No mezclarlos sin revisar.

## Cambios recientes
- Copiloto IA: abre/cierra estable; drawer desktop y panel movil.
- Mensajes: tabla convertida a cards responsive en portatil/tablet.
- Agenda: `renderAgendaCalendar()` ya se ve como calendario semanal real; bloqueos/festivos Google Calendar diferenciados.
- Layout global: hardening responsive para evitar scroll horizontal accidental.
- Backend deploy: `/`, `/health` y `/api/health` responden 200; soporte de puerto EasyPanel `PORT`, `3001` y compat `3000`; Node 20 fijado para Nixpacks.

## Problemas conocidos
- `frontend/src/pages/index.astro` es grande (~8k lineas); dividir por controladores de dominio.
- `backend/src/routes/professional.js` y `telegram.js` son grandes; extraer servicios por contexto.
- CSS usa mucho `!important` por deuda de cascada; evitar nuevas capas salvo necesidad.
- Hay backups/raw n8n ignorados localmente; no versionar exports con secretos.

## Comandos
```powershell
cd frontend; npm.cmd run check; npm.cmd run build
cd backend; npm.cmd run lint
git status --short --branch
```

## EasyPanel
- Repo privado: requiere Deploy Key en GitHub o conexion GitHub activa.
- URL recomendada: `git@github.com:raulruizproyectos/Fisio_IA_Agent.git`.
- Frontend: build path `frontend`, Dockerfile, puerto `80`, health `/health`.
- Backend: build path `backend`, Nixpacks/Node 20, start `node src/index.js`, puerto `3001`, health `/health` o `/api/health`.
- Si aparece `Git key not found` o `Cannot access repository`, revisar Source/Deploy Key antes de tocar codigo.

## Seguridad
`.env.local` no se versiona. Requeridos: Supabase, OpenAI, Telegram, n8n, Google Calendar. No pegar claves en docs, issues ni commits.

## Proximos pasos
1. Smoke visual post-deploy: Inicio, Pacientes, Mensajes, Agenda, Finanzas, Documentos, Copiloto.
2. Resolver o aislar cambios backend locales.
3. Extraer controladores de `index.astro`: agenda, pacientes, finanzas, assistant.
4. Reducir CSS duplicado y mantener tokens en `premium-clinic-ui.css`.
