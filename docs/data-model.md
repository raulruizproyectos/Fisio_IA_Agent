# Modelo de Datos - Fisio_IA_Agent

## Diagrama ER

```mermaid
erDiagram
    PROFESSIONALS ||--o{ PATIENTS : manages
    PROFESSIONALS ||--o{ PLANS : creates
    PROFESSIONALS ||--o{ TELEGRAM_PATIENT_LINKS : owns
    PATIENTS ||--o{ PLANS : has
    PATIENTS ||--o| TELEGRAM_PATIENT_LINKS : linked_chat
    CONDITIONS ||--o{ EXERCISES : contains
    EXERCISES ||--o{ EXERCISE_TEMPLATES : has
    PLANS ||--o{ PLAN_ITEMS : contains
    PLAN_ITEMS }o--|| EXERCISES : references
    PLAN_ITEMS ||--o{ RENDER_JOBS : generates
    PATIENTS ||--o{ WORKOUTS : logs
    WORKOUTS ||--o{ WORKOUT_ITEMS : contains
    WORKOUT_ITEMS }o--|| PLAN_ITEMS : references
```

## Nueva tabla para Telegram

### `vinculos_telegram_pacientes`

Relaciona cada paciente con un chat de Telegram para habilitar chat y comandos desde n8n.

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | UUID (PK) | Identificador |
| `patient_id` | UUID (FK, unique) | Paciente vinculado |
| `professional_id` | UUID (FK) | Profesional propietario |
| `telegram_chat_id` | TEXT (unique) | Chat ID de Telegram |
| `telegram_username` | TEXT | Username de Telegram |
| `link_code` | TEXT (unique) | Codigo de vinculacion `/start` |
| `linked_at` | TIMESTAMPTZ | Fecha de vinculacion |
| `created_at` | TIMESTAMPTZ | Creacion |
| `updated_at` | TIMESTAMPTZ | Ultima actualizacion |

## Referencia

- Esquema SQL completo: `database/schema.sql`
- Flujo Telegram: `n8n/telegram-bot.md`
