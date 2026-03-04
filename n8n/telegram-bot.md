# Bot de Telegram - Fisio IA Agent

## Que se ha implementado

- Endpoint backend para resolver comandos de Telegram: `POST /api/telegram/incoming`
- Endpoint backend para generar codigo de vinculacion paciente-chat: `POST /api/telegram/link-code/:patientId`
- Tabla `vinculos_telegram_pacientes` para vincular paciente <-> chat_id
- Workflow n8n importable: `n8n/Fisio_IA_Agent/telegram-chat.json`
- Workflow W1 de citas: `n8n/Fisio_IA_Agent/w1-appointment-agent.json`

## Flujo end-to-end (n8n + backend + Supabase)

1. El fisio genera codigo: `POST /api/telegram/link-code/:patientId`
2. El paciente abre el bot y envia `/start CODIGO`
3. n8n recibe mensaje en `Telegram Trigger`
4. n8n llama al backend en `/api/telegram/incoming`
5. Backend consulta/actualiza Supabase y devuelve `reply_text`
6. n8n responde al paciente por Telegram

## Comandos disponibles para paciente

- `/start CODIGO` - vincula chat con paciente
- `/plan` - devuelve plan activo + ejercicios
- `/cita <inicio_iso> <fin_iso> [nota]` - solicita cita (ej: `/cita 2026-03-10T18:00 2026-03-10T18:45`)
- `/dolor <0-10> [nota]` - registra dolor diario en `sesiones`
- `/ayuda` - listado de comandos

## Configuracion

### 1. Crear bot en Telegram

1. Abrir [@BotFather](https://t.me/BotFather)
2. Crear bot con `/newbot`
3. Copiar token

### 2. Configurar backend

- Completa `backend/.env` con credenciales de Supabase
- Levanta backend: `npm run dev`

### 3. Configurar n8n

1. Importar `n8n/Fisio_IA_Agent/telegram-chat.json`
2. (Opcional W1) Importar `n8n/Fisio_IA_Agent/w1-appointment-agent.json`
3. Crear credencial **Telegram API** con token de BotFather
4. Definir variable de entorno en n8n: `BACKEND_URL=http://localhost:3001`
5. Activar workflow(s)

## Notas

- Este flujo usa la base existente de Supabase (proyecto ya creado) y solo agrega la tabla `vinculos_telegram_pacientes`.
- Para entorno productivo, pon backend detras de HTTPS y restringe acceso al endpoint `/api/telegram/incoming`.
