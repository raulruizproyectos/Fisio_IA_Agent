# Pendiente operativo

## Deploy/smoke
1. EasyPanel source: repo privado con Deploy Key/SSH activa.
2. Frontend: repo `git@github.com:raulruizproyectos/Fisio_IA_Agent.git`, rama `main`, build path `frontend`.
3. Backend: mismo repo/rama, build path `backend`, Nixpacks Node 20, start `node src/index.js`.
4. Smoke: Inicio, Pacientes, Mensajes, Agenda, Finanzas, Documentos y Copiloto.
5. Confirmar Google Calendar: semana visible, bloqueos/festivos y refresco.
6. Probar plan IA, PDF, Telegram e historial.

## Incidencia resuelta 2026-05-27
- Error `Git key not found` / `Cannot access repository`: repo privado sin key valida en EasyPanel.
- Solucion: generar SSH key en EasyPanel, anadirla como GitHub Deploy Key y usar URL SSH.
- No tocar codigo si el error ocurre antes de build.

## Deuda controlada
- Modularizar `frontend/src/pages/index.astro`.
- Separar servicios backend de `professional.js`, `telegram.js`, `exercises.js`.
- Reducir cascada CSS con `!important`.
- Revisar cambios locales backend/auth antes de publicar.

## Pendiente tras auditoria 2026-09-15
Informe completo y evidencia: `docs/AUDITORIA_CRM_IA_20260915.md`.

### Bloque 1 — desplegar lo ya hecho (72 h)
- **R-1 (P0)**: merge `--ff-only` de `origin/production-hardening` (`f4c04d4`) en `main` y aplicar `database/migrations/20260901_production_security_hardening.sql` en staging y produccion. Sin esto, produccion sigue con la API abierta y sin RLS.
- **R-11 (bloqueo de entorno)**: el frontend **no se puede compilar en este equipo**. La politica de Control de Aplicaciones de Windows bloquea `frontend/node_modules/@astrojs/compiler-binding-win32-x64-msvc/astro.win32-x64-msvc.node` (error aparente: "Cannot find native binding"). Astro 7 usa binario nativo; `main` usaba Astro 5 (compilador sin binario bloqueado) y por eso antes si compilaba. Alternativas: validar en CI (ubuntu), anadir excepcion de politica o trabajar el frontend en una maquina sin esa restriccion. Backend si validable en local.
- Ejecutar las 13 pruebas de humo de `docs/PRODUCTION_READINESS.md` (incluye aislamiento entre dos profesionales y cron/webhooks sin secreto -> 401).
- **R-9**: archivar o descartar el trabajo divergente de `C:\Visual Code\PROYECTOS_IA\Fisio_IA_Agent` (auth antiguo con fallback a cliente admin, justo lo que la version buena prohibe).

### Bloque 2 — RGPD y trazabilidad (2 semanas)
- **R-2 (P0 privacidad)**: `crm_audit_log` existe y esta protegida, pero **ningun flujo escribe en ella**. Implementar helper `recordAudit()` en escrituras clinicas y lecturas de ficha/informes.
- **R-3**: supresion/anonimizacion real (todas las tablas + Storage) y plazos de retencion; hoy `DELETE /api/pacientes/:id` solo borra la tabla legacy `pacientes`.
- **R-6**: cuota de generacion IA por usuario (hoy solo el limite global de 300/15 min).

### Bloque 3 — seguridad clinica y pruebas (3-4 semanas)
- **R-4**: `improveSelectionImageCoverage` sustituye ejercicios del modelo y **hereda `cautions` y dosis del ejercicio original**; corregirlo.
- **R-5**: pruebas de aislamiento A/B/admin, de bloqueo de PDF/Telegram sin aprobacion y validacion declarativa de payloads.

### Bloque 4 — deuda estructural (continuo)
- **R-7**: migracion batch legacy -> CRM y fin de las altas implicitas (`resolveCrmPatientId` durante peticiones).
- **R-8**: extraer controladores de `index.astro` (8.651 lineas) y reducir `!important` del CSS (2.122 lineas).
- **R-10**: restringir CORS sin cabecera `Origin`.
