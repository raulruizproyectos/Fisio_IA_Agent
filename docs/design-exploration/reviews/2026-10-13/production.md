# Publicación y operatividad — 13 de octubre de 2026

El usuario autorizó commit, push a `main` y despliegue de `fisio-frontend` en el proyecto EasyPanel `fisio-ia-agent`, además de comprobar BBDD y funcionalidades. No se repiten migraciones ni se actualiza el software n8n. Los cambios previos de `CONTINUAR.md` y `PROMPT_CONTINUAR.txt` se conservan locales.

## Verificación previa a publicar

- Supabase `uewhbaejcouenoufuwlq`: ACTIVE_HEALTHY, cinco migraciones del cierre presentes, 35 tablas públicas con RLS activo. Una clínica; cero perfiles o pacientes sin clínica. Cero citas con `calendar_sync_pending` o `calendar_sync_in_flight`.
- API real: readiness 13/13, seis integraciones configuradas y cero ausentes. Diez controles HTTP/CSP/cookies/CSRF/rechazo anónimo pasan. El acceso ficticio inválido se rechaza correctamente; no se dispone de contraseña profesional en esta sesión y no se solicita introducirla en el chat.
- Doce workflows n8n activos con nodos/conexiones coincidentes con la fuente. Calendar OAuth responde a lectura filtrada ficticia; sincronización `healthy`, intervalo 120000 ms. Recordatorios activos con vista previa de cero candidatos. Tokens Telegram válidos y ambos modos backend responden en `dry_run`, sin envíos.
- Backend lint y 106/106 pruebas. Frontend check: 40 archivos, cero diagnósticos; build: cuatro páginas. Regresiones de Auth, reserva pública, recuperación de altas, contexto de citas, foco/movimiento, guardado de ficha, confirmación y toast pasan.
- PostgreSQL 18 aislado, filas sintéticas y tres conexiones: solapamientos de alta/edición rechazados, IDs de solicitud únicos, Calendar reclamado y desbloqueado una sola vez y versiones antiguas/en curso rechazadas. Servidor de ensayo cerrado al finalizar.
- Chromium sobre build real con API/Auth ficticias: 375/768/1280, pestañas, mapa corporal, notas, paneles y movimiento reducido, sin overflow ni errores JS/red externa. [Detalle](README.md).

Recibos privados en `.private-backups/local-validation/production/2026-10-13/`; las capturas ficticias permanecen en la carpeta privada de QA premium. No publicar secretos ni recibos.

## Alcance de la conclusión

La preparación y las verificaciones anteriores pasan. Publicación, CI del commit y despliegue están pendientes de completar y verificar en esta sesión; no se declara desplegada la nueva versión por haber pasado las comprobaciones locales.

Los flujos de pacientes, citas, notas, pagos/facturas/bonos, planes/aprobación y recuperación tienen pruebas automatizadas; esto no equivale a haber ejecutado cada recorrido con la cuenta profesional en producción. La primera prueba del usuario sigue siendo necesaria. No se han acreditado entrega real Telegram/email, IA con gasto, móvil físico/Safari/Firefox ni restauración completa de Supabase gestionado. Gmail conserva la comprobación histórica por lectura, no una reconexión o envío nuevo. No se observa el primer tick de recordatorios ni se provocan envíos.
