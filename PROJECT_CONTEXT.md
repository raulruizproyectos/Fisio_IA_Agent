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

## Estado 2026-09-15 (auditoria: leer antes de tocar nada)
- Informe de referencia: `docs/AUDITORIA_CRM_IA_20260915.md`. Plan de mejoras en su seccion 7; como retomar en la seccion 11.
- Hay **tres estados** del repo: `main` (`8c208cf`, 2026-05-27, sin hardening), la copia `C:\Visual Code\PROYECTOS_IA\Fisio_IA_Agent` (`main` -4 con una implementacion de auth antigua sin commitear) y `origin/production-hardening` (`f4c04d4`, 2026-09-03, **codigo actual** con JWT + RLS + rate limit + aprobacion clinica).
- Ramas de la auditoria: `docs/auditoria-20260915` (informe, publicada en origin) y `mejoras/auditoria-20260915` (base = `origin/production-hardening`, para implementar R-1..R-11).
- R-1 (P0 operativo): el hardening no esta en `main` y la migracion `database/migrations/20260901_production_security_hardening.sql` sigue sin aplicar. Es el primer trabajo al retomar.
- Para que el merge sea directo, `main` local debe estar igual a `origin/main` antes de `git merge --ff-only origin/production-hardening`.
- Bloqueo de entorno: en este equipo **no se puede compilar el frontend actual** (politica de Control de Aplicaciones bloquea el binario nativo de Astro 7; ver R-11). El backend si: `npm ci`, `npm run lint`, `npm test` (11/11).

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
Plan completo: `docs/AUDITORIA_CRM_IA_20260915.md` (seccion 7).

### Bloque 1 — desplegar lo que ya esta hecho (72 h)
1. R-1: merge `--ff-only` de `origin/production-hardening` en `main` y aplicar `database/migrations/20260901_production_security_hardening.sql` en staging y luego produccion.
2. Configurar `INTERNAL_API_KEY` (>= 32 bytes), `TELEGRAM_WEBHOOK_SECRET` (distinto del token del bot) y `N8N_WEBHOOK_SECRET` en backend y n8n.
3. Ejecutar las 13 pruebas de humo de `docs/PRODUCTION_READINESS.md`.
4. R-11: validar el frontend en CI (`npm ci`, `npm run check`, `npm run build`) o con excepcion de Control de Aplicaciones; en local no es posible.
5. R-9: archivar o descartar el trabajo local divergente de `C:\Visual Code\PROYECTOS_IA\Fisio_IA_Agent`.

### Bloque 2 — RGPD y trazabilidad (2 semanas)
6. R-2: escribir en `crm_audit_log` (helper + lecturas clinicas); hoy la tabla existe pero nadie escribe en ella.
7. R-3: supresion/anonimizacion completa (tablas + Storage) y plazos de retencion; hoy `DELETE /api/pacientes/:id` solo borra la tabla legacy.
8. R-6: cuota de generacion IA por usuario y registro de coste.

### Bloque 3 — seguridad clinica y pruebas (3-4 semanas)
9. R-4: corregir `improveSelectionImageCoverage` (hereda `cautions` y dosis del ejercicio original al sustituirlo).
10. Ampliar catalogo de red flags y exigir nota clinica cuando haya alerta roja antes de aprobar.
11. R-5: pruebas de aislamiento A/B/admin, de bloqueo de PDF/Telegram sin aprobacion y validacion de payloads.

### Bloque 4 — deuda estructural (continuo)
12. R-7: migracion batch legacy -> CRM y fin de las altas implicitas.
13. R-8: extraer controladores de `index.astro` y reducir `!important` (mantener tokens en `premium-clinic-ui.css`).
14. R-10: restringir CORS sin cabecera `Origin` y revision mensual de dependencias, n8n y Node.
