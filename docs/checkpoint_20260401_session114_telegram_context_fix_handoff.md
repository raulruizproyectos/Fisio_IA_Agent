## Checkpoint: Sesion 114 - Telegram citas conserva contexto entre mensajes

Fecha: 2026-04-01
Rama: main

### Resumen
Se ha corregido el fallo real visto en Telegram: el bot entendia la fecha y hora de la cita, pero al recibir despues un mensaje corto con el motivo (por ejemplo `dolor hombro`) perdia el contexto y volvia a pedir dia u hora.

### Causa raiz
1. El webhook nativo de Telegram llegaba sin `agent_mode` ni `bot_username`.
2. `detectTelegramAgentMode` devolvia `legacy` en ese caso.
3. La rama real de citas solo confiaba en `pending_slot` dentro de `patient_appointments`, asi que mensajes cortos como `dolor hombro` podian salir del flujo de reserva.

### Cambios aplicados
- `backend/src/routes/telegram.js`
  - `detectTelegramAgentMode` ahora resuelve el modo tambien para webhooks nativos usando `chat_id`, `crm_perfiles`, `vinculos_telegram_pacientes` y `telegram_onboarding_pending`.
  - el flujo real de citas carga siempre la sesion del chat antes de clasificar y, si existe `pending_slot`, mantiene la conversacion en ruta `appointment` aunque el mensaje actual sea solo el motivo.

### Validaciones hechas
- `node --check backend/src/routes/telegram.js` -> OK
- `npm run lint` en `backend/` -> OK
- comprobacion visual del diff -> solo cambia el fix funcional de contexto

### Siguiente paso exacto
1. Redeploy del backend.
2. Prueba real en Telegram:
   - `hola`
   - `una cita para el proximo martes a las 16`
   - `dolor hombro`
3. Confirmar que el tercer mensaje ya no hace perder el slot y que el bot confirma o rechaza la cita de forma coherente.

### Criterio de exito
- El bot no vuelve a pedir fecha u hora despues de recibir el motivo.
- La reserva continua desde el `pending_slot` ya guardado.