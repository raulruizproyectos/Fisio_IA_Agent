# Preparación del testing en producción — 2026-10-08

El usuario acepta por ahora Precisión azul y pide continuar hasta probar en producción, corregir los fallos encontrados y actualizar GitHub. Ha elegido publicar la rama `mejoras/auditoria-20260915` y abrir un PR hacia `main`. Esto no autoriza todavía fusionar el PR, aplicar SQL ni desplegar servicios.

## Destinos comprobados

- Panel existente: `https://b5xbaf.easypanel.host`. Su API acepta el token ya guardado en `.env.local`; no hace falta recordar la contraseña para operar por API.
- Proyecto EasyPanel: `fisio-ia-agent`. Servicios `fisio-frontend` (Dockerfile, puerto 80) y `fisio-backend` (Nixpacks, puerto 3001), ambos habilitados y con HTTPS.
- CRM: `https://fisio-frontend.b5xbaf.easypanel.host`.
- API: `https://fisio-backend.b5xbaf.easypanel.host`.
- Ambos servicios apuntan al repositorio `raulruizproyectos/Fisio_IA_Agent`, rama `main`, commit `aa2112054300aaa43cc602cdf623d6baea30898c`, del 20 de septiembre. El trabajo local actual aún no está desplegado.
- Supabase existente: `uewhbaejcouenoufuwlq`, activo y sano. Consultas de metadatos, sin mostrar filas clínicas: 35 tablas públicas, una cuenta Auth, ningún objeto Storage y ninguna factura histórica.

## Verificaciones realizadas

- Backend lint y 100/100 pruebas pasan. La ejecución inicial no pudo conectar a localhost por la restricción del entorno; la ejecución con permiso para esos sockets pasa.
- Frontend: 39 archivos sin errores/avisos/hints y cuatro páginas compiladas. Sigue el aviso de Astro sobre Shiki y estilos inline; la regresión de CSP del HTML pasa.
- Guardas de configuración pública y 33 casos runtime pasan; `envsubst` sigue siendo un doble local. Docker/nginx reales aún no ejecutados aquí.
- CI GitHub en `28c201d`: backend, n8n y frontend pasan. El contenedor frontend real pasa build Docker con `npm ci`, `nginx -t`, salud, CSP de conexiones runtime y ausencia de caché en HTML. Los audits npm de producción de ambos paquetes devuelven cero vulnerabilidades en esta preparación.
- Producción actual: `/health` del frontend y `/api/health` del backend responden 200; readiness sin credenciales responde 401. La cabecera CSP nueva no aparece en la respuesta de salud del frontend antiguo.
- El navegador abre el panel antiguo sin mostrar login, con identidad predeterminada. Esto requiere comprobar de nuevo el acceso protegido tras actualizar; la observación visual no acredita los permisos ni identifica el origen de los datos. Al abrir, la versión antigua informa de reconciliación automática de Calendar con cero cambios; no se pulsaron acciones clínicas.
- Preparación Docker: excluir `.env` y `.env.*` del contexto frontend y usar solamente `npm ci`, para fallar ante un lockfile inválido en vez de resolver otras dependencias. Las variables públicas se proporcionarán explícitamente desde EasyPanel.

## Bloqueos antes de aplicar cambios externos

1. **Copia nativa creada y ensayada.** El usuario completó el cambio de contraseña PostgreSQL y la guardó localmente. URI Session pooler construida con percent-encoding/TLS, conservada únicamente como `SUPABASE_DB_URL` en `.env.local`; retirada la variable temporal de contraseña. Archivo nativo del 8 de octubre a las 16:48 UTC, checksum y estructura comprobados, en `.private-backups/2026-10-08T16-48-39-268Z/`. Restauración local aislada: las 35 tablas públicas y 27 Auth coinciden con origen en cantidades y hashes de contenido; las cinco migraciones pasan y conservan cantidades. Conexión de comprobación validada con el certificado oficial. Recibo privado y manifest actualizados; PostgreSQL local detenido. Alcance: CRM/Auth, objetos, políticas y grants; propietarios locales distintos. No acredita restauración completa de pg_net/Vault, Storage/Realtime, internos gestionados ni contraseñas de roles globales; `restore_verified` completo permanece falso. No cambiaron claves API ni contraseñas Auth. Cualquier herramienta externa que usara la contraseña PostgreSQL anterior necesita actualizarla.
2. **Cinco migraciones pendientes**, en este orden:
   - `20261007154552_financial_integrity.sql`
   - `20261007201534_clinic_creation_retries.sql`
   - `20261007214504_public_booking_retries.sql`
   - `20261008064542_appointment_calendar_pending.sql`
   - `20261008090742_appointment_calendar_verification.sql`
   Las columnas/tabla correspondientes no existen en Cloud. No repetir las migraciones históricas por diferencias de timestamps. La actualización financiera exige que no existan facturas históricas; la consulta actual cumple esa condición, pero debe repetirse justo antes de aplicar.
3. **Configuración para esta versión.** El backend remoto no declara `SUPABASE_ANON_KEY` ni los secretos internos/webhook actuales. Preparar el cambio conservando los valores existentes; verificar presencia y destino sin imprimirlos. Fijar `NODE_ENV=production`, origen exacto del frontend, URL pública del backend y flags del piloto desactivados. No trasladar la configuración raíz completa al contenedor.
   Clave anon existente del proyecto y clave interna nueva preparadas únicamente en `.env.local`. Cambios concretos backend: esas dos variables, `NODE_ENV=production`, `FRONTEND_URL=https://fisio-frontend.b5xbaf.easypanel.host`, `OPENWA_PILOT_ENABLED=false`, `TELEGRAM_PILOT_BOOKING_ENABLED=false`; conservar las demás variables remotas. Frontend: `PUBLIC_BACKEND_URL=https://fisio-backend.b5xbaf.easypanel.host` y `PUBLIC_SUPABASE_URL=https://uewhbaejcouenoufuwlq.supabase.co`, sin claves. No inventar secretos de n8n/Telegram sin coordinarlos con el emisor: el webhook Telegram legado quedará rechazado (503) sin su secreto, y procesos cron sin la nueva clave serán rechazados. Aprobar ese alcance o coordinar esas integraciones antes de desplegar; no acreditar mensajería/IA como operativas por el smoke del CRM.
4. **Autorización concreta.** Fusionar a `main`, aplicar las cinco migraciones en ese proyecto y desplegar ambos servicios/configuración requiere aprobación para esas acciones y destinos, conforme a las preferencias del usuario. Metadatos EasyPanel anteriores guardados privadamente (fuente, build, commit y réplicas); no constituyen copia de imagen ni de secretos. La revisión automática rechazó guardar entornos/tokens fuera de `.env.local`; se conservaron solo metadatos. Confirmar recuperación de la versión anterior antes de desplegar. No activar nuevos canales ni enviar mensajes a pacientes.

## Prueba después del despliegue autorizado

Comprobar primero salud, readiness autenticado, HTTPS/proxy/CORS, ausencia de caché en Auth y cookies HttpOnly/Secure. Verificar que el acceso anónimo no abre el CRM ni sus datos, y que la sesión profesional corresponde a la clínica existente. Después, con un registro ficticio identificable y alcance autorizado, probar alta/recarga, notas, cita y recuperación de reserva; verificar Calendar real antes de usar escrituras. Registrar cada fallo y su reproducción, hacer el ajuste mínimo y repetir solo el flujo afectado. No emitir facturas reales, enviar mensajes, gastar en IA ni tocar citas reales como parte de este primer recorrido.

Referencias oficiales: [servicios y fuentes EasyPanel](https://easypanel.io/docs/services/app), [API EasyPanel](https://easypanel.io/docs/api), [copias Supabase](https://supabase.com/docs/guides/platform/backups).

## Publicación y CI

Rama publicada y [PR #2](https://github.com/raulruizproyectos/Fisio_IA_Agent/pull/2) abierto en borrador hacia `main`. Corregidas entradas opcionales del lockfile con npm 11.19.0, importación de dotenv por el scanner sin instalar backend, variables libpq vacías y espera de arranque del contenedor. Las tres comprobaciones del commit `28c201d` pasan, incluido Docker/nginx real. Solo falta actualizar estos documentos y comprobar CI sobre su commit final. `main` y producción siguen en su versión anterior.
