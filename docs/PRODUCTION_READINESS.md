# Paso a producción — Fisio IA Agent

## Estado del código

- El panel profesional exige una sesión de Supabase Auth y obtiene el perfil desde `/api/me`.
- El backend usa el JWT del usuario y RLS para las operaciones clínicas; `service_role` queda reservado a procesos internos autenticados.
- Los informes de ejercicios nacen en `requiere_revision`. PDF y Telegram se bloquean hasta la aprobación del fisioterapeuta.
- Citas e informes disponen de protección contra duplicados; las citas solapadas quedan bloqueadas en PostgreSQL.
- Webhooks de Telegram, cron y n8n usan secretos distintos.
- Frontend y backend tienen lockfiles, auditoría sin vulnerabilidades conocidas de severidad alta y CI reproducible.

## Orden de despliegue

1. Hacer backup de Supabase y exportar los workflows activos de n8n.
2. Probar `database/migrations/20260901_production_security_hardening.sql` en una rama o proyecto de staging.
3. Aplicar la migración en producción durante una ventana sin escrituras.
4. Crear o verificar el usuario de Supabase Auth y su fila activa en `crm_perfiles`.
5. Configurar secretos del backend y n8n.
6. Desplegar backend y comprobar `/api/health` y `/api/health/readiness` con autenticación.
7. Desplegar frontend y probar acceso, recuperación de contraseña y cierre de sesión.
8. Importar vNext en n8n desactivado, vincular credenciales y hacer el cambio flujo a flujo.
9. Ejecutar las pruebas de humo de este documento antes de admitir datos reales.

## Variables imprescindibles

Backend:

- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`
- `INTERNAL_API_KEY` (mínimo 32 bytes aleatorios)
- `TELEGRAM_WEBHOOK_SECRET` (distinto del token del bot)
- `N8N_WEBHOOK_SECRET`
- tokens Telegram y credenciales Calendar que utilice la instalación
- `N8N_AGENT_WEBHOOK_URL`, `N8N_EXERCISE_WEBHOOK_URL`, `N8N_APPOINTMENT_WEBHOOK_URL`

Frontend:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY` o publishable key
- `PUBLIC_BACKEND_URL`

Nunca se expone `SUPABASE_SERVICE_ROLE_KEY` en variables `PUBLIC_*`.

## Supabase Auth

El usuario debe existir en Auth y tener una fila en `crm_perfiles` con:

- `auth_user_id`: UUID del usuario Auth.
- `rol`: `admin` o `fisioterapeuta`.
- `activo`: `true`.
- nombre y correo profesionales.

El frontend no utiliza un UUID de fisioterapeuta fijo. Si falta el perfil activo, el backend devuelve 403.

## n8n

Seguir `n8n/README.md`. En particular, crear la credencial Header Auth `Fisio Internal Webhook` y configurar las cuatro variables compartidas. No activar simultáneamente los JSON de `production/` y `vnext/` que tengan el mismo trigger.

## Pruebas de humo

1. Abrir `/login`, iniciar sesión y cerrar sesión.
2. Solicitar recuperación de contraseña con una cuenta de prueba.
3. Crear un paciente y confirmar que otro usuario no puede leerlo.
4. Crear y editar una cita; intentar otra cita solapada y esperar HTTP 409.
5. Generar un plan de ejercicios: PDF y Telegram deben permanecer bloqueados.
6. Aprobar el plan y comprobar que PDF y Telegram se habilitan.
7. Generar un plan con alerta roja: exigir nota clínica antes de aprobar.
8. Repetir una solicitud con el mismo `Idempotency-Key`: no debe duplicarse.
9. Invocar cron y webhooks sin secreto: esperar 401.
10. Confirmar que facturas y documentos no abren sin sesión.
11. Revisar móvil (360 px), portátil (1280 px) y escritorio; navegar solo con teclado.
12. Ejecutar `npm ci`, lint, tests, check, build y audit igual que CI.

## Operación y RGPD

- Mantener el repositorio privado y exigir revisión de pull request para `main`.
- Configurar backups/PITR, retención y restauración probada de Supabase.
- Definir plazos de conservación para datos clínicos, auditoría, documentos y ejecuciones n8n.
- Evitar PHI en logs. Usar `request_id`, IDs internos y códigos de error.
- Documentar encargado del tratamiento, contratos/DPA, derechos de acceso/supresión y procedimiento de brechas.
- Mantener n8n, Node y dependencias actualizados mediante una revisión mensual.

## Rollback

- Frontend/backend: redeplegar el commit anterior.
- n8n: desactivar el flujo nuevo y reactivar el export anterior, nunca ambos.
- Base de datos: la migración añade columnas/tablas y endurece políticas. Restaurar las políticas anteriores únicamente desde un backup o script revisado; no improvisar desactivando RLS.
