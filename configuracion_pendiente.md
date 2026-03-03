# Configuracion Pendiente - Fisio_IA_Agent

Estado actualizado para retomar sin perdida.

## Estado actual (2026-03-03, Sesion 33)
- Frontend redisenado con look&feel mas profesional/moderno (tipografia, paleta, jerarquia visual, microinteracciones).
- Inspiracion funcional tomada de referencia publica `fisiomap-ia`:
  - prevencion
  - continuidad asistencial
  - interoperabilidad
  - gobernanza de datos
- Prompt de Agente IA de Ejercicios ajustado con triage de 4 preguntas para Telegram.
- Nota tecnica local:
  - `npm run build` falla por `astro` no disponible en PATH del host local actual.
  - Requiere revisar entorno de build/dependencias antes de validar compilacion local.

## Estado actual (2026-03-04, Sesion 34)
- Hardening aplicado para despliegue frontend:
  - `index.astro` usa `<script lang="ts">` (coherencia con tipado usado en el script cliente).
  - `package.json` frontend: `build` pasa a `astro build` y `astro check` queda como script separado.
- Se lanzan redeploys por endpoint API de EasyPanel para recuperar `fisio-frontend`.

## Estado actual (2026-03-04, Sesion 35)
- Validacion local fuerte del frontend completada:
  - `scripts/frontend-local-build.ps1` -> build correcto en copia limpia (`astro build` OK).
- Infraestructura remota:
  - `fisio-backend` sigue en `200`.
  - `fisio-frontend` sigue en `502` despues de redeploys por API.
- Diagnostico:
  - El bloqueo actual es de servicio EasyPanel (runtime/config/task), no de compilacion frontend.
- Necesidad para cierre definitivo:
  - acceso a logs/error de servicio en EasyPanel (UI o API autenticada) para aplicar fix exacto y dejar `200`.

## Estado actual (2026-03-03, Sesion 25)
- Migracion SQL productiva aplicada y validada en Supabase.
- Workflows Fisio activos y alineados en n8n.
- Backend productivo desplegado en EasyPanel:
  - Servicio: `fisio-backend` (proyecto `n8n`)
  - URL: `https://fisio-backend.b5xbaf.easypanel.host`
  - Health: `GET /api/health` -> 200
- Backend productivo ampliado con rutas:
  - `/api/profesional/*`
  - `/api/telegram/*`
  - `/api/agent/message`
- Validaciones realizadas:
  - Telegram incoming (custom payload) -> OK + ingesta creada
  - Agent message -> OK (`source: n8n_agent`)
  - Ciclo video crear/review -> OK, estado final `enviado`
- Validacion adicional (2026-03-02):
  - `POST /api/agent/message` en produccion devuelve `data` vacio cuando n8n responde body vacio.
  - Se implemento fallback en backend (`fallback_used`) para no devolver respuesta funcional vacia al cliente.
  - Se detecto tambien error `fetch failed` cuando el webhook n8n no responde.
  - Se amplio fallback con control de disponibilidad n8n: `n8n_unreachable` + `fallback_reason`.
  - Cobertura adicional: si n8n responde `4xx/5xx`, backend tambien devuelve fallback con `fallback_reason = n8n_http_error` y `n8n_status`.
  - Correccion de plataforma aplicada:
    - `fisio-backend` migrado a fuente Git (`main`, `/backend`) en EasyPanel.
    - Build actualizado a `nixpacks`.
    - Redeploy forzado ejecutado por API.
  - Integracion agente validada en produccion:
    - `/api/agent/message` devuelve respuesta funcional con `fallback_used = false`.

## Workflows Fisio (estado)
- `Fisio_IA_Agent / Nucleo Agente` -> ACTIVO (`ZOarR2hpUUOgm3KC`)
- `Fisio_IA_Agent / Orquestador Intake-Video` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Pendientes` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Crear y Render Video` -> ACTIVO
- `Fisio_IA_Agent / Subflujo Revision Video` -> ACTIVO
- `Fisio_IA_Agent / Puente Error Backend` -> ACTIVO

## Supabase (estado)
Tablas necesarias confirmadas:
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
- `trabajos_video_ejercicio`
- `eventos_visualizacion_video`

## Pendiente inmediato (actual)
1. Ejecutar E2E Telegram completo con comandos reales:
- `/start CODIGO`
- `/plan`
- `/dolor <0-10> [nota]`
2. Rotar credenciales usadas/compartidas en sesiones tecnicas:
- API key n8n
- token EasyPanel
- secretos sensibles de entorno

## Riesgos abiertos
- Riesgo operativo reducido: backend y Nucleo Agente ya estan alineados en produccion.
- Si no se rotan credenciales, hay riesgo de seguridad.

## Como retomar rapido
1. Verificar backend `fisio-backend` en EasyPanel y health (`/api/health`).
2. Probar agente web y confirmar `data.reply_text` no vacio.
3. Revisar flags de diagnostico:
- `fallback_used`
- `n8n_unreachable`
- `fallback_reason`
4. Confirmar estado esperado:
- `fallback_used = false`
- `n8n_unreachable = false`
5. Ejecutar prueba real Telegram y revisar escritura en `mensajes_ingesta_paciente`.
6. Mantener prueba de regresion de video (`crear` + `review`).

## Repositorio GitHub (2026-02-27)
- URL: `https://github.com/raulruizproyectos/Fisio_IA_Agent`
- Rama principal: `main`
- CI base: configurada en `.github/workflows/ci.yml`
- Plantillas y gobernanza: ISSUE/PR templates, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`

## Punto de continuidad para proxima sesion (prioridad)
1. E2E Telegram completo con paciente real:
- `/start CODIGO`
- `/plan`
- `/dolor <0-10> [nota]`
2. Confirmar que cada mensaje crea/actualiza registros en `mensajes_ingesta_paciente`.
3. Mantener observabilidad de agente (`fallback_*`) y ajustar prompts de negocio del Nucleo si se requiere mas riqueza funcional.
4. Activar branch protection en GitHub para `main`.
5. Rotar secretos expuestos en sesiones tecnicas.

## Nota de terminologia
- Se reemplazo la expresion `expresion anterior (deprecated)` por `centraliza la introduccion de sintomas` en la descripcion principal del proyecto.


## Cierre de verificacion global (2026-02-27)
- GitHub sincronizado y operativo: `main` al dia.
- n8n/EasyPanel/backend verificados y en estado funcional.
- Webhook Telegram en produccion confirmado.
- Nota tecnica: build frontend pendiente de validar en entorno con `astro` disponible.

## Arranque recomendado para la proxima sesion
1. Ejecutar E2E Telegram de extremo a extremo y revisar resultado clinico en ingestas.
2. Ajustar contenido de respuesta del agente n8n en `/api/agent/message`.
3. Activar branch protection en GitHub.
4. Rotar credenciales sensibles.
5. Iniciar rediseno frontend con `Google Stitch` y trasladar propuesta a Astro.

## Bloqueo local detectado (frontend)
- `npm install` en `frontend/` queda colgado en este host y rompe instalacion de `astro` (`invalid`).
- El resto de plataformas productivas (n8n, EasyPanel, backend, Telegram, GitHub) queda operativo.

### Paso 1 al retomar
- Liberar proceso npm colgado (o reiniciar equipo) y repetir instalacion limpia de frontend.

## Actualizacion de cierre (2026-03-02)
- Se reintento la recuperacion local de frontend y el bloqueo persiste:
  - `npm ping` OK
  - procesos `npm install` colgados detectados y finalizados
  - nuevas instalaciones vuelven a colgarse en este host
- Decision UX/UI ya registrada:
  - usar `Google Stitch` para ideacion/prototipo frontend
- Decision adicional para video IA:
  - plataforma candidata `Google Labs Flow` (usuario Pro Gemini)
  - URL: `https://labs.google/fx/es/tools/flow`
- Decision de IA conversacional en n8n:
  - implementar normalmente con nodo `OpenAI` (o agente con modelo OpenAI)

## Punto de situacion para continuar rapido
1. Ejecutar `frontend/npm install` en entorno alternativo y validar `npm run build`.
2. Si falla otra vez, capturar log con `--verbose` y revisar ultimo paquete antes del cuelgue.
3. Empezar rediseno de `frontend/src/pages/index.astro` con base Stitch.
4. Preparar evaluacion de integracion de Flow para generacion de video en pipeline n8n/backend.

## Punto de situacion actualizado (2026-03-02, cierre rapido)
- Diagnostico confirmado:
  - `npm install` se bloquea en la ruta sincronizada del proyecto (`G:\Mi unidad\...`).
  - El mismo install en `C:\Temp` completa correctamente.
- Frontend:
  - aplicado fix TypeScript en `frontend/src/pages/index.astro` para errores de null/typing en script cliente.
- Validacion tecnica:
  - en `C:\Temp\Fisio_IA_Agent_frontend_local`, `npm run build` -> OK
  - `astro check` sin errores (0)
- Decision operativa temporal:
  - ejecutar install/build del frontend en ruta local no sincronizada hasta cerrar bloqueo del host actual.

## Siguiente sesion (pasos exactos)
1. Copiar `frontend/` a `C:\Temp\Fisio_IA_Agent_frontend_local`.
2. Ejecutar:
   - `npm install --no-audit --no-fund`
   - `npm run build`
3. Si build OK, continuar el rediseno con Google Stitch y aplicar cambios en repo principal.

## Cierre de hoy (2026-03-02)
- Estado frontend:
  - bloqueo de `npm install` persiste solo en ruta sincronizada (`G:\Mi unidad\...`).
  - solucion operativa validada en esta sesion: build por ruta local no sincronizada.
- Script disponible y probado:
  - `scripts/frontend-local-build.ps1`
  - comando: `powershell -ExecutionPolicy Bypass -File .\scripts\frontend-local-build.ps1`
  - resultado validado: `astro check` OK + `astro build` OK.
- Ajuste de limpieza:
  - `.gitignore` incluye `frontend/node_modules_stuck*/`.
- Regla aplicada a partir de ahora:
  - usar skills disponibles en `.agents` cuando aplique, con constancia breve en seguimiento.

## Arranque minimo recomendado (siguiente sesion)
1. **[Infra Manual]**: Crear App `fisio-frontend` en EasyPanel desde GitHub repo, usando `Dockerfile` y path `/frontend`.
2. **[Infra Manual]**: Asegurar branch protection de `main` en configuración web de GitHub.
3. Ejecutar testing funcional manual en Telegram (`/start`, `/plan`, `/dolor`) desde un móvil real.
4. Validar llegada a base de datos en Supabase.
5. Continuar desarrollo de lógicas del Agente IA y vídeos de seguimiento.

## Decision UX/UI registrada (2026-03-03)
- Frontend rediseñado completamente en sesion 24.
- Dashboard profesional dark mode con sidebar, metricas, tabla de intakes, chat del agente IA.
- Proyecto Stitch de referencia: ID 8185935624241829024.
- Paleta: #0f1419 / #1a2332 / #0d9488 (teal).
- Tipografia: Inter + Material Symbols Rounded.

## Docker frontend hardening (2026-03-03, Sesion 25)
- `Dockerfile`: HEALTHCHECK con `wget` contra `/health` cada 30s.
- `nginx.conf`: bloque `location /health` retorna 200 sin access_log.
- Build local validado: 0 errores, 0 warnings.

## Guia despliegue frontend (EasyPanel)
1. EasyPanel → Proyecto `n8n` → **+ Create Service** → **App**.
2. Nombre: `fisio-frontend`.
3. Source: GitHub → `https://github.com/raulruizproyectos/Fisio_IA_Agent.git` → `main` → Root: `/frontend`.
4. Build: Dockerfile.
5. Domains: asignar dominio (ej. `fisio-frontend.b5xbaf.easypanel.host`).
6. Puerto: `80`.
7. Deploy.

## Arranque minimo (siguiente paso)
1. Push a GitHub y crear App en EasyPanel (7 pasos arriba).
2. Verificar `https://fisio-frontend.b5xbaf.easypanel.host/health` → 200.
3. Probar dashboard y chat agente IA desde el frontend desplegado.
4. Ejecutar E2E Telegram (`/start`, `/plan`, `/dolor`).
5. Configurar branch protection en `main`.
6. Rotar credenciales sensibles.

## Actualizacion (2026-03-03, Sesion 27)
- Pendiente de sesion 26 "Frontend Backend Hooks" completado en codigo:
  - Backend:
    - Nuevo endpoint `GET /api/profesional/video-jobs` en `backend/src/routes/professional.js`.
  - Frontend:
    - `frontend/src/pages/index.astro` ya no usa `alert()` para acciones principales.
    - Botones activos:
      - Dashboard/Intakes: `Revisar` -> abre Historial del paciente.
      - Pacientes: `Ver` -> abre Historial del paciente.
      - Videos: `Historial` -> abre Historial del paciente.
    - Sección Videos conectada a datos reales de backend.
    - Sección Historial conectada a:
      - `GET /api/pacientes/:id`
      - `GET /api/profesional/patients/:patientId/history`

## Pendiente inmediato actualizado
1. **[Manual EasyPanel]** crear/desplegar `fisio-frontend` desde `/frontend` y validar `/health`.
2. **[Manual E2E Telegram]** ejecutar flujo real `/start`, `/plan`, `/dolor`.
3. **[Manual GitHub]** activar branch protection en `main`.
4. **[Seguridad]** rotar credenciales sensibles (n8n, EasyPanel, secretos entorno).

## Actualizacion (2026-03-03, Sesion 28)
- Infraestructura reorganizada en EasyPanel:
  - Proyecto `openclaw` eliminado.
  - Proyecto nuevo `fisio-ia-agent` creado.
  - Servicios movidos de `n8n` -> `fisio-ia-agent`:
    - `fisio-backend`
    - `fisio-frontend`
- Backend confirmado operativo:
  - `https://fisio-backend.b5xbaf.easypanel.host/api/health` -> 200.
- Frontend:
  - Dominio corregido a `fisio-frontend.b5xbaf.easypanel.host`.
  - Build configurado en EasyPanel como `dockerfile` (`file: Dockerfile`).
  - Deploy actualizado al commit `c3a8aae`.
  - Estado actual: sigue en `502`.
  - Señales técnicas:
    - `monitor.getDockerTaskStats`: `fisio-ia-agent_fisio-frontend` -> `actual=0`, `desired=1`.
    - `projects.getDockerContainers`: sin contenedor corriendo para frontend.
    - `services.common.getServiceError`: `null` (sin detalle).

## Pendiente inmediato (nuevo)
1. **[Manual EasyPanel UI]** abrir logs/historial de deploy de `fisio-frontend` para capturar causa exacta del task fail.
2. **[Manual Host/Docker Swarm]** revisar reason del servicio `fisio-ia-agent_fisio-frontend` (si hay acceso a consola del nodo).
3. **Aplicar fix de runtime/build** según log y redeploy.
4. Confirmar estado final:
   - `https://fisio-frontend.b5xbaf.easypanel.host/` -> 200
   - `monitor.getDockerTaskStats` frontend -> `actual=1`, `desired=1`.
5. Mantener pendientes ya abiertos:
   - E2E Telegram real.
   - branch protection en `main`.
   - rotación de credenciales.

## Corte tecnico actualizado (2026-03-03, antes de nueva arquitectura)
- Infra:
  - Proyecto de trabajo consolidado: `fisio-ia-agent`.
  - `openclaw` eliminado.
  - `fisio-backend` y `fisio-frontend` ya migrados al nuevo proyecto.
- Estado operativo:
  - Backend: OK (200 en `/api/health`).
  - Frontend: KO (502 en dominio principal).
- Repositorio:
  - `main` sincronizada con commits de fix y documentación.
  - Últimos commits clave:
    - `cd47cba` (documentación de migración y estado actual)
    - `c3a8aae` (fix Dockerfile frontend sin lockfile obligatorio)
- Bloqueo activo para retomar:
  - frontend no llega a levantar task/contendor en runtime de EasyPanel.

## Prioridad de arranque tras nuevo prompt
1. Revisar y decidir nueva arquitectura objetivo (componentes, contratos y despliegue).
2. Definir plan de migración por fases sin romper backend actual operativo.
3. Replantear frontend dentro de la nueva arquitectura y resolver bloqueo 502 durante la transición.

## Actualizacion (2026-03-03, Sesion 30)
- Limpieza aplicada para nueva arquitectura:
  - removidos workflows legacy de video del repo.
  - removido archivo temporal `create.lazy.tmp.js`.
  - removida carpeta residual `frontend/node_modules_stuck_20260302_202222`.
- Estado operativo:
  - backend sigue estable.
  - foco de desarrollo pasa a CRM + citas + ejercicios.
- Artefactos clave nuevos:
  - `ARCHITECTURE.md`
  - `.agents/AGENT_RULES.md`
  - `.agents/skills/*`
  - `database/schema_vnext.sql`

## Proximo paso recomendado inmediato
1. Definir contratos JSON finales W0/W1/W2/W3 en n8n.
2. Crear bucket privado `ejercicios` (si no existe) y validar object_keys.
3. Cablear trigger web CRM para recomendaciones de ejercicios.
4. Implementar logging completo por `request_id` en DB.

## Cierre diario definitivo (2026-03-03)
### Estado operativo real al cierre
- Backend: OK (`200`).
- Frontend: KO (`502`) en dominio productivo.
- Arquitectura objetivo ya fijada y documentada (CRM + Citas + Ejercicios).

### Lo que SI esta listo
- Repositorio limpio para nueva etapa.
- Reglas y skills de agente creadas en `.agents/`.
- Prompt maestro de ejercicios listo para nodo OpenAI n8n.
- Propuesta SQL aditiva disponible en `database/schema_vnext.sql`.

### Lo que queda para primera hora de manana
1. EasyPanel: extraer causa exacta de `fisio-frontend` (task fail) y dejarlo en 200.
2. Supabase Storage: validar bucket `ejercicios` en privado.
3. n8n: definir contratos y montar W0/W1/W2/W3.
4. CRM trigger: conectar boton de ejercicios a W3.
5. Logging: asegurar trazabilidad por `request_id` y `patient_id`.

### Regla de continuidad
- Cualquier avance de manana debe registrarse primero en `CHANGELOG.md` y luego en este archivo.

## Ajuste ultimo minuto (Sesion 32)
- Prompt del Agente IA de Ejercicios ya adaptado a canal Telegram (igual que agente de citas en n8n).
- Mantiene estrategia de imagenes desde Supabase Storage por `object_key` + signed URL JIT en n8n.
- Modo actual: 1 ejercicio maximo por respuesta.
