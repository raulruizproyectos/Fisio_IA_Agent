# Automatizacion con n8n - Fisio IA Agent

## Workflows activos en esta fase

### 1. Telegram Chat (implementado)

**Archivo:** `n8n/workflows/telegram-chat.json`

**Patron:** Webhook Processing + Database Operations

**Flujo:**

```
Telegram Trigger -> Prepare Input -> HTTP Request (backend) -> Telegram Reply
```

El backend resuelve comandos y consulta Supabase para devolver respuesta.

---

## Workflows previstos (siguientes iteraciones)

### 2. Recordatorio de sesion
**Trigger:** Cron diario (09:00)

### 3. Alerta por baja adherencia
**Trigger:** Webhook POST desde API al registrar workout

### 4. Reporte semanal de evolucion
**Trigger:** Cron semanal (lunes 08:00)

### 5. Notificacion de render completado
**Trigger:** Webhook POST cuando `trabajos_render` pasa a `completed`

---

## Integracion con backend

La API backend expone endpoints para Telegram:

- `POST /api/telegram/link-code/:patientId`
- `POST /api/telegram/incoming`

n8n consume `/api/telegram/incoming` para responder mensajes.

---

## Credenciales en n8n

1. **Telegram API:** token del bot
2. **(Opcional) Supabase API:** para flujos que consulten DB sin backend

---

## Estado

| Workflow | Estado |
|---|---|
| Telegram Chat | Implementado |
| Recordatorio de sesion | Por implementar |
| Alerta baja adherencia | Por implementar |
| Reporte semanal | Por implementar |
| Notificacion render | Por implementar |
