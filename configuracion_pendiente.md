# Configuracion Pendiente - Fisio_IA_Agent

Estado actualizado para retomar sin perdida.

## Estado actual (2026-02-27)
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

## Workflows Fisio (estado)
- `Fisio_IA_Agent / Nucleo Agente` -> ACTIVO
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
1. Ajustar `Fisio_IA_Agent / Nucleo Agente` para devolver respuesta JSON util (actualmente puede devolver body vacio en `/agent/core`).
2. Ejecutar E2E Telegram completo con comandos reales:
- `/start CODIGO`
- `/plan`
- `/dolor <0-10> [nota]`
3. Rotar credenciales usadas/compartidas en sesiones tecnicas:
- API key n8n
- token EasyPanel
- secretos sensibles de entorno

## Riesgos abiertos
- `/api/agent/message` ya conecta con n8n, pero la respuesta funcional del agente puede ser vacia si el Nucleo no responde body.
- Si no se rotan credenciales, hay riesgo de seguridad.

## Como retomar rapido
1. Verificar backend `fisio-backend` en EasyPanel y health (`/api/health`).
2. Probar agente web y confirmar respuesta no vacia desde Nucleo Agente.
3. Ejecutar prueba real Telegram y revisar escritura en `mensajes_ingesta_paciente`.
4. Mantener prueba de regresion de video (`crear` + `review`).
