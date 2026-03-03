# Configuracion Pendiente - Fisio_IA_Agent

Estado actualizado para retomar sin perdida.

## Estado actual (2026-03-02)
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
1. Ejecutar script `frontend-local-build.ps1`.
2. Desplegar frontend actualizado en produccion.
3. Retomar validaciones funcionales pendientes:
   - E2E Telegram (`/start`, `/plan`, `/dolor`)
   - pipeline de video y validacion de tablas/estados en Supabase.

## Decision UX/UI registrada (2026-03-03)
- Frontend rediseñado completamente en sesion 24.
- Dashboard profesional dark mode con sidebar, metricas, tabla de intakes, chat del agente IA.
- Proyecto Stitch de referencia: ID 8185935624241829024.
- Paleta: #0f1419 / #1a2332 / #0d9488 (teal).
- Tipografia: Inter + Material Symbols Rounded.

